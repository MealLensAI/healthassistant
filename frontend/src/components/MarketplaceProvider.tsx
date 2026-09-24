import { useEffect, useState, type ReactNode } from 'react'
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

function overlayMainIdentity(base: User, pathRole: CareSyncRole): User {
  const ha = readHealthAppUser()
  // Never demote an admin. Path role only applies for patient/dietitian shells.
  const role: User['role'] = base.role === 'admin' ? 'admin' : pathRole === 'admin' ? base.role : pathRole
  if (!ha) return { ...base, role }
  return {
    ...base,
    role,
    name: ha.name || base.name,
    email: ha.email || base.email,
    avatar: ha.avatar || base.avatar,
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
    }
  } catch {
    setSessionUserId(null)
  }
  return true
}

async function bootMarketplace(
  dispatch: ReturnType<typeof useApp>['dispatch'],
  role: CareSyncRole = 'patient',
) {
  if (marketplaceBooted && bootedRole === role) return

  try {
    if (apiEnabled()) {
      if (role === 'admin') {
        await bootAdminWorkspace(dispatch)
        marketplaceBooted = true
        bootedRole = role
        return
      }

      const result = await bootstrapEmbeddedSession(role)
      if (result?.server && result.user) {
        const user = overlayMainIdentity(result.user as User, role)
        const server = (await fetchServerState().catch(() => result.server)) as typeof result.server
        await hydrateAs(dispatch, user, server as never)
        marketplaceBooted = true
        bootedRole = role
        return
      }

      const server = await fetchServerState()
      if (server.currentUser) {
        const user = overlayMainIdentity(server.currentUser as User, role)
        await hydrateAs(dispatch, user, server as never)
        marketplaceBooted = true
        bootedRole = role
        return
      }
    }
  } catch {
    // local seed below
  }

  if (role === 'admin') {
    await bootAdminWorkspace(dispatch)
    marketplaceBooted = true
    bootedRole = role
    return
  }

  const seed =
    USERS.find((u) => u.role === role) ||
    USERS.find((u) => u.role === 'patient') ||
    null
  if (seed) {
    const user = overlayMainIdentity(seed, role)
    setSessionUserId(user.id)
    dispatch({ type: 'LOGIN', user })
    if (apiEnabled()) {
      try {
        const server = await fetchServerState()
        await hydrateAs(dispatch, user, server as never)
      } catch {
        // keep local seed login
      }
    }
  }
  marketplaceBooted = true
  bootedRole = role
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppProvider>{children}</AppProvider>
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

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const target: CareSyncRole =
        role === 'admin' ? 'admin' : role === 'dietitian' ? 'dietitian' : 'patient'
      if (bootedRole !== target) {
        marketplaceBooted = false
      }
      if (!marketplaceBootPromise) {
        marketplaceBootPromise = bootMarketplace(dispatch, target).finally(() => {
          marketplaceBootPromise = null
        })
      }
      await marketplaceBootPromise
      if (bootedRole !== target && !cancelled) {
        marketplaceBooted = false
        marketplaceBootPromise = bootMarketplace(dispatch, target).finally(() => {
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
  }, [dispatch, role])

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
