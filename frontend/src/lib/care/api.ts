import { createInitialState, type Action } from '@/lib/care/store'
import { activeCallFromLive } from '@/lib/care/calls'
import { isPublicMarketplaceDietitian } from '@/lib/care/domain'
import type { AppState, Dietitian, LiveCall, PatientProfile, User } from '@/lib/care/types'

const SESSION_KEY = 'meallensai.session'

export function apiEnabled() {
  if (import.meta.env.MODE === 'test') return false
  // Default on in the host app so care uses Flask /api/marketplace (set VITE_USE_API=false for browser-only mock).
  const flag = import.meta.env.VITE_USE_API
  if (flag === 'false' || flag === '0') return false
  return true
}

function baseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined) || ''
}

/** Marketplace APIs live under Flask `/api/marketplace/*` (alias `/api/care` kept for compat). */
function careApi(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (clean.startsWith('/api/marketplace')) return clean
  if (clean.startsWith('/api/care')) return `/api/marketplace${clean.slice('/api/care'.length)}`
  if (clean.startsWith('/api/')) return `/api/marketplace${clean.slice('/api'.length)}`
  return `/api/marketplace${clean}`
}

function sessionUserId() {
  return window.localStorage.getItem(SESSION_KEY)
}

function mainAccessToken() {
  try {
    // Admin verification console uses the care X-User-Id session only.
    // A leftover patient MealLens JWT must never override that identity.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return ''
    }
    return window.localStorage.getItem('access_token') || ''
  } catch {
    return ''
  }
}

export function getSessionUserId() {
  return sessionUserId()
}

export function setSessionUserId(userId: string | null) {
  if (userId) window.localStorage.setItem(SESSION_KEY, userId)
  else window.localStorage.removeItem(SESSION_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const userId = sessionUserId()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${careApi(path)}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(mainAccessToken() ? { Authorization: `Bearer ${mainAccessToken()}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The care service did not respond in time. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) {
    const detail = await response.text()
    try {
      const parsed = JSON.parse(detail) as { detail?: string }
      if (parsed.detail) throw new Error(parsed.detail)
    } catch (error) {
      if (error instanceof Error && error.message !== detail) throw error
    }
    throw new Error(detail || `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export type ServerState = Omit<AppState, 'toasts' | 'activeCall' | 'currentUser'> & {
  currentUser?: User | null
  liveCalls?: LiveCall[]
}

/** Action responses return only changed collections — never the whole marketplace. */
export type ServerPatch = {
  patch: Partial<ServerState>
  currentUser?: User | null
}

export type ServerPulse = Pick<
  ServerState,
  'conversations' | 'liveCalls' | 'notifications' | 'missedCalls' | 'appointments' | 'users'
>

export async function fetchServerState() {
  return request<ServerState>('/api/marketplace/state')
}

export async function fetchCarePulse() {
  return request<ServerPulse>('/api/marketplace/pulse')
}

/** Live marketplace directory from Supabase — replaces any local/ghost listings. */
export async function fetchCatalogDietitians() {
  return request<{ dietitians: AppState['dietitians'] }>('/api/marketplace/catalog/dietitians')
}

export async function fetchCatalogApplications() {
  return request<{ applications: AppState['applications'] }>('/api/marketplace/catalog/applications')
}

export async function fetchConversationMessages(conversationId: string, opts?: { after?: string; limit?: number }) {
  const params = new URLSearchParams()
  if (opts?.after) params.set('after', opts.after)
  if (opts?.limit) params.set('limit', String(opts.limit))
  const qs = params.toString()
  return request<{ messages: AppState['messages'] }>(
    `/api/care/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
  )
}

export type RegisterAccountDetails = {
  name: string
  email: string
  phone?: string
  country?: string
  role: 'patient' | 'dietitian'
  profile?: PatientProfile
}

export async function registerAccountOnServer(details: RegisterAccountDetails) {
  const data = await request<{ user: User; token: string }>('/api/care/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  })
  setSessionUserId(data.user.id)
  return data
}

export async function registerDoctorOnServer(details: { name: string; email: string; phone?: string; country?: string }) {
  return registerAccountOnServer({ ...details, role: 'dietitian' })
}

export async function loginOnServer(userId: string) {
  const data = await request<{ user: User; token: string }>('/api/care/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
  setSessionUserId(data.user.id)
  return data
}

export async function adminLoginOnServer(email: string, password: string) {
  const base = baseUrl()
  const response = await fetch(`${base}${careApi('/api/care/auth/admin-login')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    const text = await response.text()
    let detail = text || `Request failed: ${response.status}`
    try {
      const parsed = JSON.parse(text) as { detail?: string }
      if (parsed.detail) detail = parsed.detail
    } catch {
      // keep raw text
    }
    throw new Error(detail)
  }
  const data = (await response.json()) as { user: User; token: string }
  setSessionUserId(data.user.id)
  return data
}

export async function postAction(type: string, payload: Record<string, unknown> = {}) {
  return request<ServerPatch>('/api/care/actions', {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  })
}

export async function deleteApplication(applicationId: string) {
  return request<ServerPatch>(`/api/care/applications/${applicationId}`, {
    method: 'DELETE',
  })
}

export async function uploadCareAsset(file: File, kind: 'avatar' | 'document' | 'attachment' = 'document') {
  const { ensureCareAccount, careRoleFromPath } = await import('./embeddedAuth')
  if (careRoleFromPath() !== 'admin') await ensureCareAccount()
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  const userId = sessionUserId()
  const response = await fetch(`${baseUrl()}${careApi('/uploads')}`, {
    method: 'POST',
    headers: {
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(mainAccessToken() ? { Authorization: `Bearer ${mainAccessToken()}` } : {}),
    },
    body: form,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || 'Could not upload file.')
  }
  return response.json() as Promise<{ bucket: string; objectKey: string; name: string; sizeBytes: number; type: string }>
}

export async function resolveCareAsset(bucket: string, objectKey: string) {
  const params = new URLSearchParams({ bucket, key: objectKey })
  return request<{ url: string }>(`/assets?${params.toString()}`)
}

/** Dedicated book endpoint — same contract as meallensaidieticnafrontend `/api/appointments`. */
export async function bookAppointmentOnServer(payload: {
  dietitianId: string
  date: string
  time: string
  topic: string
  kind: 'video' | 'chat'
}) {
  return request<ServerPatch>('/api/care/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelAppointmentOnServer(appointmentId: string) {
  return request<ServerPatch>(`/api/care/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export type CallSignal = {
  id: string
  conversationId?: string
  callerId: string
  calleeId: string
  status: 'ringing' | 'live'
  offer?: { type: string; sdp?: string } | null
  answer?: { type: string; sdp?: string } | null
  ice?: { id: string; fromId: string; candidate: Record<string, unknown> }[]
}

export async function fetchCallSignal(callId: string) {
  return request<CallSignal>(`/api/care/calls/${callId}`)
}

export async function postCallSignal(
  callId: string,
  payload: {
    offer?: { type: string; sdp?: string }
    answer?: { type: string; sdp?: string }
    ice?: { id: string; fromId: string; candidate: Record<string, unknown> } | { id: string; fromId: string; candidate: Record<string, unknown> }[]
  },
) {
  return request<CallSignal>(`/api/care/calls/${callId}/signal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function isRemoteAction(action: Action) {
  return ![
    'HYDRATE',
    'LOGIN',
    'LOGOUT',
    'ADD_TOAST',
    'REMOVE_TOAST',
    'REGISTER_DOCTOR',
    'REGISTER_USER',
    'UPDATE_MESSAGE_STATUS',
    'UPSERT_MESSAGE',
  ].includes(action.type)
}

export function actionPayload(action: Action): Record<string, unknown> {
  const { type: _type, ...payload } = action
  void _type
  return payload
}

function upsertById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  if (!incoming.length) return existing
  const map = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  const order = [...existing.map((item) => item.id), ...incoming.map((item) => item.id)]
  const seen = new Set<string>()
  const result: T[] = []
  for (const id of order) {
    if (seen.has(id)) continue
    seen.add(id)
    const item = map.get(id)
    if (item) result.push(item)
  }
  return result
}

/** Drop seed/demo dietitians that were never admin-approved in Supabase. */
function catalogDietitians(list: Dietitian[] | undefined, viewer: User | null): Dietitian[] {
  const rows = list ?? []
  if (viewer?.role === 'admin') {
    return rows.filter((item) => !item.id.startsWith('dt-') && !item.id.startsWith('draft-'))
  }
  return rows.filter(
    (item) => isPublicMarketplaceDietitian(item) || (viewer?.id != null && item.userId === viewer.id),
  )
}

/** Full bootstrap replace (viewer-scoped server state). */
export function mergeServerState(current: AppState, server: ServerState): AppState {
  const currentUser = server.currentUser || current.currentUser || null
  const liveCalls = server.liveCalls ?? []
  return {
    ...createInitialState(),
    ...server,
    // Authoritative from DB — never keep local ghosts of deleted listings.
    dietitians: catalogDietitians(server.dietitians ?? [], currentUser),
    applications: server.applications ?? [],
    liveCalls,
    currentUser,
    toasts: current.toasts,
    activeCall: activeCallFromLive(currentUser?.id, liveCalls),
  }
}

/** Apply a delta from POST /actions — merge collections by id. */
export function mergeServerPatch(current: AppState, response: ServerPatch): AppState {
  const patch = response.patch || {}
  const currentUser = response.currentUser || current.currentUser || null
  // Catalog collections from the server are full viewer-scoped snapshots for that
  // key. Upserting would keep deleted dietitians/applications forever in the UI.
  const nextDietitians =
    patch.dietitians !== undefined
      ? catalogDietitians(patch.dietitians, currentUser)
      : catalogDietitians(current.dietitians, currentUser)
  const nextApplications = patch.applications !== undefined ? patch.applications : current.applications
  const next: AppState = {
    ...current,
    currentUser,
    users: patch.users ? upsertById(current.users, patch.users) : current.users,
    dietitians: nextDietitians,
    applications: nextApplications,
    conversations: patch.conversations ? upsertById(current.conversations, patch.conversations) : current.conversations,
    messages: patch.messages ? upsertById(current.messages, patch.messages) : current.messages,
    appointments: patch.appointments ? upsertById(current.appointments, patch.appointments).filter((item) => item.status !== 'deleted') : current.appointments,
    files: patch.files ? upsertById(current.files, patch.files) : current.files,
    consultationRequests: patch.consultationRequests
      ? upsertById(current.consultationRequests, patch.consultationRequests)
      : current.consultationRequests,
    patientProfiles: patch.patientProfiles
      ? (() => {
          const map = new Map(current.patientProfiles.map((item) => [item.userId, item]))
          for (const item of patch.patientProfiles!) map.set(item.userId, item)
          return [...map.values()]
        })()
      : current.patientProfiles,
    patientSettings: patch.patientSettings
      ? (() => {
          const map = new Map(current.patientSettings.map((item) => [item.userId, item]))
          for (const item of patch.patientSettings!) map.set(item.userId, item)
          return [...map.values()]
        })()
      : current.patientSettings,
    deviceSessions: patch.deviceSessions ? upsertById(current.deviceSessions, patch.deviceSessions) : current.deviceSessions,
    paymentMethods: patch.paymentMethods ? upsertById(current.paymentMethods, patch.paymentMethods) : current.paymentMethods,
    paymentQuotes: patch.paymentQuotes ? upsertById(current.paymentQuotes, patch.paymentQuotes) : current.paymentQuotes,
    payments: patch.payments ? upsertById(current.payments, patch.payments) : current.payments,
    missedCalls: patch.missedCalls ? upsertById(current.missedCalls, patch.missedCalls) : current.missedCalls,
    notifications: patch.notifications ? upsertById(current.notifications, patch.notifications) : current.notifications,
    liveCalls: patch.liveCalls !== undefined ? patch.liveCalls : current.liveCalls,
  }
  // Removals: liveCalls is authoritative when present (ended calls disappear).
  next.activeCall = activeCallFromLive(currentUser?.id, next.liveCalls)
  return next
}

/** Merge lightweight pulse into local state without touching catalog/messages bodies. */
export function mergeCarePulse(current: AppState, pulse: ServerPulse): AppState {
  // An empty authoritative call list means the peer ended the call. Pending
  // local starts are protected separately by AppProvider until acknowledged.
  const liveCalls = pulse.liveCalls ?? current.liveCalls
  // Pulse appointments are authoritative for the viewer (complete/delete/book sync).
  const appointments = pulse.appointments
    ? pulse.appointments.filter((item) => item.status !== 'deleted')
    : current.appointments.filter((item) => item.status !== 'deleted')
  // Drop legacy conv-* ghosts; prefer server UUID threads from pulse.
  const conversations = pulse.conversations
    ? upsertById(
        current.conversations.filter((item) => !String(item.id).startsWith('conv-')),
        pulse.conversations,
      ).filter((item) => !(item.hiddenFor || []).includes(current.currentUser?.id || ''))
    : current.conversations.filter((item) => !String(item.id).startsWith('conv-'))
  return {
    ...current,
    users: pulse.users ? upsertById(current.users, pulse.users) : current.users,
    conversations,
    notifications: pulse.notifications
      ? upsertById(current.notifications, pulse.notifications)
      : current.notifications,
    missedCalls: pulse.missedCalls ? upsertById(current.missedCalls, pulse.missedCalls) : current.missedCalls,
    appointments,
    liveCalls,
    activeCall: activeCallFromLive(current.currentUser?.id, liveCalls, current.activeCall),
  }
}

export function sameAppData(left: AppState, right: AppState) {
  const pick = ({ toasts: _toasts, activeCall: _call, ...rest }: AppState) => {
    void _toasts
    void _call
    return rest
  }
  return JSON.stringify(pick(left)) === JSON.stringify(pick(right))
}
