import { useEffect, useState, type ReactNode } from 'react'
import { AppProvider, useApp } from './context'
import { ThemeProvider } from './theme'
import { apiEnabled, fetchServerState, mergeServerState, setSessionUserId } from './lib/api'
import {
  bootstrapEmbeddedSession,
  careRoleFromPath,
  readHealthAppUser,
  type CareSyncRole,
} from './lib/embeddedAuth'
import { USERS } from './data/mock'
import type { User } from './types'
import './marketplace.css'

let marketplaceBooted = false
let marketplaceBootPromise: Promise<void> | null = null
let bootedRole: CareSyncRole | null = null

function overlayMainIdentity(base: User, role: CareSyncRole): User {
  const ha = readHealthAppUser()
  if (!ha) return { ...base, role }
  return {
    ...base,
    role,
    name: ha.name || base.name,
    email: ha.email || base.email,
    avatar: ha.avatar || base.avatar,
  }
}

async function bootMarketplace(
  dispatch: ReturnType<typeof useApp>['dispatch'],
  role: CareSyncRole = 'patient',
) {
  if (marketplaceBooted && bootedRole === role) return

  try {
    if (apiEnabled()) {
      const result = await bootstrapEmbeddedSession(role)
      if (result?.server && result.user) {
        const user = overlayMainIdentity(result.user as User, role)
        setSessionUserId(user.id)
        // Re-fetch with X-User-Id so appointments/messages are scoped to this patient.
        const server = (await fetchServerState().catch(() => result.server)) as typeof result.server
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
        marketplaceBooted = true
        bootedRole = role
        return
      }

      const server = await fetchServerState()
      if (server.currentUser) {
        const user = overlayMainIdentity(server.currentUser as User, role)
        setSessionUserId(user.id)
        dispatch({
          type: 'HYDRATE',
          state: {
            ...mergeServerState(
              { ...server, toasts: [], activeCall: null, currentUser: null },
              server,
            ),
            currentUser: user,
          },
        })
        marketplaceBooted = true
        bootedRole = role
        return
      }
    }
  } catch {
    // local seed below
  }

  // Keep seed ids so appointments/messages/files match frontend-3 demo data,
  // but show the signed-in MealLensAI name/email/avatar (one profile).
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
        dispatch({
          type: 'HYDRATE',
          state: {
            ...mergeServerState(
              { ...server, toasts: [], activeCall: null, currentUser: null },
              { ...server, currentUser: user },
            ),
            currentUser: user,
          },
        })
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
      if (!marketplaceBootPromise) {
        marketplaceBootPromise = bootMarketplace(
          dispatch,
          role === 'dietitian' ? 'dietitian' : 'patient',
        ).finally(() => {
          marketplaceBootPromise = null
        })
      }
      await marketplaceBootPromise
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
  if (blocking && !currentUser && !allowGuest) return null
  return <>{children}</>
}
