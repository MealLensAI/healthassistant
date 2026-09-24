import { apiEnabled, fetchServerState, loginOnServer, registerAccountOnServer, setSessionUserId } from '@/lib/care/api'

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

async function syncViaApi(haUser: { uid: string; email: string; name: string }, role: CareSyncRole) {
  const base = (import.meta.env.VITE_API_URL as string | undefined) || ''
  const response = await fetch(`${base}/api/care/auth/sync`, {
    method: 'POST',
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
      role,
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || 'Could not sync account')
  }
  return response.json() as Promise<{ user: { id: string; name: string; role?: string } }>
}

/** When mounted under MealLensAI main app (/care), reuse the existing Supabase signup session. */
export async function bootstrapEmbeddedSession(preferredRole?: CareSyncRole) {
  if (!apiEnabled() || !embeddedInHealthApp()) return null
  const haUser = readHealthAppUser()
  if (!haUser) return null
  const role = preferredRole ?? careRoleFromPath()

  try {
    const synced = await syncViaApi(haUser, role)
    setSessionUserId(synced.user.id)
    await loginOnServer(synced.user.id)
    const server = await fetchServerState()
    return { user: synced.user, server }
  } catch {
    try {
      // Admin accounts are allowlisted on the API — never self-register as admin.
      if (role === 'admin') return null
      const registered = await registerAccountOnServer({
        name: haUser.name,
        email: haUser.email,
        role,
      })
      setSessionUserId(registered.user.id)
      const server = await fetchServerState()
      return { user: registered.user, server }
    } catch {
      return null
    }
  }
}
