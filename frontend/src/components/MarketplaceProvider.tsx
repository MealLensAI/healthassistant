import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AppProvider, useApp } from '@/lib/care/context'
import { ThemeProvider } from '@/lib/care/theme'
import {
  apiEnabled,
  fetchServerState,
  getSessionUserId,
  mergeServerState,
  setSessionUserId,
} from '@/lib/care/api'
import {
  bootstrapEmbeddedSession,
  careRoleFromPath,
  readHealthAppUser,
  type CareSyncRole,
} from '@/lib/care/embeddedAuth'
import { USERS } from '@/lib/care/data/mock'
import type { User } from '@/lib/care/types'
import '@/styles/care.css'

let marketplaceBooted = false
let marketplaceBootPromise: Promise<void> | null = null
let bootedRole: CareSyncRole | null = null

type MainAppIdentity = { uid: string; email: string; name: string; avatar?: string }
const MarketplaceIdentityContext = createContext<MainAppIdentity | null>(null)

function overlayMainIdentity(base: User, pathRole: CareSyncRole, mainAppUser?: MainAppIdentity | null): User {
  const ha = mainAppUser ?? readHealthAppUser()
  // Never demote an admin. Path role only applies for patient/dietitian shells.
  const role: User['role'] = base.role === 'admin' ? 'admin' : pathRole === 'admin' ? base.role : pathRole
  if (!ha) return { ...base, role }
  return {
    ...base,
    role,
    name: ha.name || base.name,
    email: ha.email || base.email,
    // Prefer a fresh marketplace/care avatar over a stale host identity photo.
    // Never lend a demo identity photo to a different signed-in account.
    avatar: (base.id === ha.uid && base.avatar) || ha.avatar || '',
  }
}

async function hydrateAs(
  dispatch: ReturnType<typeof useApp>['dispatch'],
  user: User,
  server: Record<string, unknown>,
) {
  setSessionUserId(user.id)
  const hydrated = mergeServerState(
    {
      ...(server as never),
      toasts: [],
      activeCall: null,
      currentUser: null,
    },
    { ...server, currentUser: user as never },
  )
  dispatch({
    type: 'HYDRATE',
    state: { ...hydrated, currentUser: user as never },
  })
}

/** Restore an existing admin care session; do not auto-login demo Amelia. */
async function bootAdminWorkspace(dispatch: ReturnType<typeof useApp>['dispatch']) {
  if (!apiEnabled()) {
    const sessionId = getSessionUserId()
    const seed = USERS.find((item) => item.id === sessionId && item.role === 'admin') as User | undefined
    if (seed) {
      setSessionUserId(seed.id)
      dispatch({ type: 'LOGIN', user: seed })
    }
    return true
  }

  const sessionId = getSessionUserId()
  if (!sessionId) return true

  try {
    const server = await fetchServerState()
    const fromState = server.currentUser as User | null | undefined
    const fromUsers = (server.users as User[] | undefined)?.find((item) => item.id === sessionId)
    const user = (fromState?.id === sessionId ? fromState : fromUsers) || null
    if (user?.role === 'admin') {
      await hydrateAs(dispatch, user, server as never)
    } else {
      setSessionUserId(null)
      dispatch({ type: 'LOGOUT' })
    }
  } catch {
    setSessionUserId(null)
    dispatch({ type: 'LOGOUT' })
  }
  return true
}

async function bootMarketplace(
  dispatch: ReturnType<typeof useApp>['dispatch'],
  role: CareSyncRole = 'patient',
  mainAppUser?: MainAppIdentity | null,
) {
  // The care session is derived from the signed-in MealLensAI account.  An
  // earlier browser session may belong to a different person, so clear it
  // before *any* request can use its X-User-Id header.
  const healthUser = role === 'admin' ? null : mainAppUser ?? readHealthAppUser()
  if (role !== 'admin') {
    const sessionId = getSessionUserId()
    if (!healthUser || sessionId !== healthUser.uid) {
      setSessionUserId(null)
      marketplaceBooted = false
      bootedRole = null
    }
  }
  if (marketplaceBooted && bootedRole === role) return

  try {
    if (apiEnabled()) {
      if (role === 'admin') {
        await bootAdminWorkspace(dispatch)
        marketplaceBooted = true
        bootedRole = role
        return
      }

      const result = await bootstrapEmbeddedSession(role, healthUser)
      // Never hydrate the UI from a response for another account.  This is
      // intentionally strict because profile, clinical, and appointment data
      // must never cross user boundaries.
      if (result?.server && result.user && healthUser && result.user.id === healthUser.uid) {
        const user = overlayMainIdentity(result.user as User, role, healthUser)
        const server = result.server
        await hydrateAs(dispatch, user, server as never)
        marketplaceBooted = true
        bootedRole = role
        return
      }

    }
  } catch {
    // Fall through to the safe, empty account shell below.
  }

  if (role === 'admin') {
    await bootAdminWorkspace(dispatch)
    marketplaceBooted = true
    bootedRole = role
    return
  }

  const seed = healthUser
    ? ({
        id: healthUser.uid,
        name: healthUser.name,
        email: healthUser.email,
        role,
        // A new account starts with no image unless it explicitly supplied one.
        avatar: healthUser.avatar || '',
      } as User)
    // Mock identities are available only in the explicit browser-only demo.
    // A signed-out real application must never become a demo patient.
    : !apiEnabled()
      ? USERS.find((u) => u.role === role) || USERS.find((u) => u.role === 'patient') || null
      : null
  if (seed) {
    const user = overlayMainIdentity(seed, role, healthUser)
    setSessionUserId(user.id)
    dispatch({ type: 'LOGIN', user })
  }
  marketplaceBooted = true
  bootedRole = role
}

export function MarketplaceProvider({
  children,
  mainAppUser,
}: {
  children: ReactNode
  mainAppUser?: MainAppIdentity | null
}) {
  return (
    <ThemeProvider>
      <MarketplaceIdentityContext.Provider value={mainAppUser ?? null}>
        <AppProvider>{children}</AppProvider>
      </MarketplaceIdentityContext.Provider>
    </ThemeProvider>
  )
}

export function MarketplaceBootGate({
  children,
  allowGuest = false,
  blocking = true,
}: {
  children: ReactNode
  allowGuest?: boolean
  /** When false, render children immediately while care session boots in the background. */
  blocking?: boolean
}) {
  const { currentUser, dispatch } = useApp()
  const [ready, setReady] = useState(!blocking)
  const role = careRoleFromPath()
  const mainAppUser = useContext(MarketplaceIdentityContext)
  const healthUserId = role === 'admin' ? null : mainAppUser?.uid ?? readHealthAppUser()?.uid

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const target: CareSyncRole =
        role === 'admin' ? 'admin' : role === 'dietitian' ? 'dietitian' : 'patient'
      if (bootedRole !== target) {
        marketplaceBooted = false
      }
      if (!marketplaceBootPromise) {
        marketplaceBootPromise = bootMarketplace(dispatch, target, mainAppUser).finally(() => {
          marketplaceBootPromise = null
        })
      }
      await marketplaceBootPromise
      if (bootedRole !== target && !cancelled) {
        marketplaceBooted = false
        marketplaceBootPromise = bootMarketplace(dispatch, target, mainAppUser).finally(() => {
          marketplaceBootPromise = null
        })
        await marketplaceBootPromise
      }
      if (!cancelled) setReady(true)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [dispatch, role, healthUserId, mainAppUser])

  if (blocking && !ready) {
    return (
      <div className="marketplace-root grid min-h-dvh place-items-center bg-cream p-8 text-left">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    )
  }

  // Admin shell renders its own sign-in page when there is no session.
  if (role === 'admin') {
    return <>{children}</>
  }

  if (blocking && !currentUser && !allowGuest) {
    return (
      <div className="marketplace-root grid min-h-dvh place-items-center bg-cream p-8 text-left">
        <div className="hy-card max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-extrabold text-ink">Sign in required</h1>
          <p className="text-sm text-muted">Open MealLensAI and sign in to continue.</p>
          <Link to="/login" className="inline-block text-sm font-semibold text-navy">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
