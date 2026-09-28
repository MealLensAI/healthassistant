import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AppProvider, useApp } from '@/lib/care/context'
import { ThemeProvider } from '@/lib/care/theme'
import { MarketplaceBootGate } from '@/components/MarketplaceProvider'
import { AppShell } from '@/components/care-layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { setSessionUserId } from '@/lib/care/api'
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

  useEffect(() => {
    // A leftover patient/dietitian care session must not block the admin form.
    // Only clear after boot has produced a concrete non-admin identity — never
    // bounce a successful admin login because of a transient null flicker.
    if (currentUser && currentUser.role !== 'admin') {
      setSessionUserId(null)
      logout()
    }
  }, [currentUser, logout])

  if (!currentUser || currentUser.role !== 'admin') {
    return <AdminLoginPage />
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
