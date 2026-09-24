import { Outlet } from 'react-router-dom'
import { AppProvider, useApp } from '@/lib/care/context'
import { ThemeProvider } from '@/lib/care/theme'
import { MarketplaceBootGate } from '@/components/MarketplaceProvider'
import { AppShell } from '@/components/care-layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import '@/styles/care.css'

/**
 * Standalone admin verification shell.
 * Mounted at /admin without MealLens ProtectedRoute — gated by env email/password sign-in.
 */
export default function AdminApp() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MarketplaceBootGate allowGuest blocking>
          <AdminGate />
        </MarketplaceBootGate>
      </AppProvider>
    </ThemeProvider>
  )
}

function AdminGate() {
  const { currentUser, logout } = useApp()

  if (!currentUser) {
    return <AdminLoginPage />
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="marketplace-root grid min-h-dvh place-items-center bg-cream p-8 text-left">
        <div className="hy-card max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-extrabold text-ink">Admin access required</h1>
          <p className="text-sm text-muted">
            This account is not an admin. Sign out and use an allowlisted admin email and password.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-block text-sm font-semibold text-navy"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="marketplace-root min-h-dvh bg-cream text-left">
      <RequireAuth roles={['admin']}>
        <AppShell />
      </RequireAuth>
    </div>
  )
}

/** Renders inside AppShell outlet — unused helper kept for clarity. */
export function AdminOutlet() {
  return <Outlet />
}
