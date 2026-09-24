import { createInitialState, type Action } from '@/lib/care/store'
import { activeCallFromLive } from '@/lib/care/calls'
import type { AppState, LiveCall, PatientProfile, User } from '@/lib/care/types'

const SESSION_KEY = 'meallensai.session'

export function apiEnabled() {
  if (import.meta.env.MODE === 'test') return false
  // Default on in the host app so care uses Flask /api/care (set VITE_USE_API=false for browser-only mock).
  const flag = import.meta.env.VITE_USE_API
  if (flag === 'false' || flag === '0') return false
  return true
}

function baseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined) || ''
}

/** Care marketplace lives under Flask `/api/care/*`. */
function careApi(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (clean.startsWith('/api/care')) return clean
  if (clean.startsWith('/api/')) return `/api/care${clean.slice('/api'.length)}`
  return `/api/care${clean}`
}

function sessionUserId() {
  return window.localStorage.getItem(SESSION_KEY)
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
  const response = await fetch(`${baseUrl()}${careApi(path)}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export type ServerState = Omit<AppState, 'toasts' | 'activeCall' | 'currentUser'> & {
  currentUser?: User | null
  liveCalls?: LiveCall[]
}

export async function fetchServerState() {
  return request<ServerState>('/api/care/state')
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
  return request<ServerState>('/api/care/actions', {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  })
}

/** Dedicated book endpoint — same contract as meallensaidieticnafrontend `/api/appointments`. */
export async function bookAppointmentOnServer(payload: {
  dietitianId: string
  date: string
  time: string
  topic: string
  kind: 'video' | 'chat'
}) {
  return request<ServerState>('/api/care/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelAppointmentOnServer(appointmentId: string) {
  return request<ServerState>(`/api/care/appointments/${appointmentId}/cancel`, {
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
  ].includes(action.type)
}

export function actionPayload(action: Action): Record<string, unknown> {
  const { type: _type, ...payload } = action
  void _type
  return payload
}

export function mergeServerState(current: AppState, server: ServerState): AppState {
  // Prefer an authenticated local user over an anonymous null from /state.
  const currentUser = server.currentUser || current.currentUser || null
  const liveCalls = server.liveCalls ?? []
  return {
    ...createInitialState(),
    ...server,
    liveCalls,
    currentUser,
    toasts: current.toasts,
    activeCall: activeCallFromLive(currentUser?.id, liveCalls),
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
