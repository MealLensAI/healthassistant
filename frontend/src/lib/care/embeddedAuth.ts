import { apiEnabled, fetchServerState, setSessionUserId } from '@/lib/care/api'

const HA_USER_KEY = 'user_data'
const HA_TOKEN_KEY = 'access_token'

export type CareSyncRole = 'patient' | 'dietitian' | 'admin'

export function embeddedInHealthApp() {
  return true
}

export function mainAppSignupUrl() {
  const base = (import.meta.env.VITE_MAIN_APP_URL as string | undefined)?.replace(/\/$/, '')
  return base ? `${base}/signup` : '/signup'
}

export function mainAppLoginUrl() {
  const base = (import.meta.env.VITE_MAIN_APP_URL as string | undefined)?.replace(/\/$/, '')
  return base ? `${base}/login` : '/login'
}

export function careAdminEmails(): string[] {
  const raw = (import.meta.env.VITE_CARE_ADMIN_EMAILS as string | undefined) || 'admin@healthyyou.com,admin@meallensai.com'
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@'))
}

export function isCareAdminEmail(email?: string | null) {
  if (!email) return false
  return careAdminEmails().includes(email.trim().toLowerCase())
}

export function readHealthAppUser(): { uid: string; email: string; name: string; avatar?: string } | null {
  try {
    const raw = window.localStorage.getItem(HA_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      uid?: string
      email?: string
      displayName?: string
      photoURL?: string
      avatar?: string
    }
    if (!parsed.uid || !parsed.email) return null
    return {
      uid: parsed.uid,
      email: parsed.email,
      name: (parsed.displayName || parsed.email.split('@')[0] || 'Member').trim(),
      avatar: parsed.photoURL || parsed.avatar || '',
    }
  } catch {
    return null
  }
}

/** Infer marketplace role from the URL (dietitian / enterprise / admin shell vs patient). */
export function careRoleFromPath(pathname = window.location.pathname): CareSyncRole {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'admin'
  }
  if (
    pathname === '/dietitian' ||
    pathname.startsWith('/dietitian/') ||
    pathname === '/enterprise' ||
    pathname.startsWith('/enterprise/') ||
    pathname.startsWith('/onboarding/doctor')
  ) {
    return 'dietitian'
  }
  return 'patient'
}

async function syncViaApi(haUser: { uid: string; email: string; name: string; avatar?: string }, role: CareSyncRole) {
  const base = (import.meta.env.VITE_API_URL as string | undefined) || ''
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 60_000)
  let response: Response
  try {
    response = await fetch(`${base}/api/marketplace/auth/sync`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(window.localStorage.getItem(HA_TOKEN_KEY)
          ? { Authorization: `Bearer ${window.localStorage.getItem(HA_TOKEN_KEY)}` }
          : {}),
      },
      body: JSON.stringify({
        externalUserId: haUser.uid,
        email: haUser.email,
        name: haUser.name,
        avatar: haUser.avatar,
        role,
      }),
    })
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The care service did not respond.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || 'Your profile could not be synced. Please retry shortly.')
  }
  const result = await response.json() as { user: { id: string; name: string; role?: string } }
  if (result.user.id !== haUser.uid) throw new Error('Account sync returned a different user. Please retry.')
  return result
}

const pendingSyncs = new Map<string, ReturnType<typeof syncViaApi>>()

export async function ensureCareAccount(user = readHealthAppUser(), role = careRoleFromPath()) {
  if (!user) throw new Error('Your main account session is unavailable. Please sign in again.')
  const key = `${user.uid}:${role}`
  let pending = pendingSyncs.get(key)
  if (!pending) {
    pending = syncViaApi(user, role).finally(() => pendingSyncs.delete(key))
    pendingSyncs.set(key, pending)
  }
  const synced = await pending
  if (readHealthAppUser()?.uid !== user.uid) throw new Error('The signed-in account changed. Please retry.')
  setSessionUserId(user.uid)
  return synced
}

/** When mounted under MealLensAI main app (/care), reuse the existing Supabase signup session. */
export async function bootstrapEmbeddedSession(
  preferredRole?: CareSyncRole,
  mainAppUser?: { uid: string; email: string; name: string; avatar?: string } | null,
) {
  if (!apiEnabled() || !embeddedInHealthApp()) return null
  // The host AuthProvider is authoritative.  Local storage is retained only
  // for standalone care routes which do not have that provider mounted.
  const haUser = mainAppUser ?? readHealthAppUser()
  if (!haUser) return null
  const role = preferredRole ?? careRoleFromPath()

  try {
    const synced = await ensureCareAccount(haUser, role)
    const server = await fetchServerState()
    return { user: synced.user, server }
  } catch {
    // Failed sync must never create a separate marketplace account.
    return null
  }
}
