import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/care-layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { RequireDietitianMarketplace } from '@/components/RequireDietitianMarketplace'
import { AppProvider } from '@/lib/care/context'
import { MarketplaceBootGate } from '@/components/MarketplaceProvider'
import { ThemeProvider } from '@/lib/care/theme'
import { AdminApplicationPage } from '@/pages/admin/AdminApplicationPage'
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage'
import { AdminDietitianDetailPage } from '@/pages/admin/AdminDietitianDetailPage'
import { AdminDietitiansPage } from '@/pages/admin/AdminDietitiansPage'
import { AdminQueuePage } from '@/pages/admin/AdminQueuePage'
import { ApplyPage } from '@/pages/dietitian/ApplyPage'
import { AvailabilityPage } from '@/pages/dietitian/AvailabilityPage'
import { DietitianDashboard } from '@/pages/dietitian/DietitianDashboard'
import { DietitianAccountPage } from '@/pages/dietitian/DietitianAccountPage'
import { PatientChartPage } from '@/pages/dietitian/PatientChartPage'
import { PatientsPage } from '@/pages/dietitian/PatientsPage'
import { DoctorOnboardingPage } from '@/pages/onboarding/DoctorOnboardingPage'
import { AppointmentsPage } from '@/pages/patient/AppointmentsPage'
import { DietitianProfilePage } from '@/pages/patient/DietitianProfilePage'
import { FilesPage } from '@/pages/patient/FilesPage'
import { MessagesPage } from '@/pages/patient/MessagesPage'
import { SettingsPage } from '@/pages/patient/SettingsPage'
import '@/styles/care.css'

function CareFallbackRedirect() {
  const location = useLocation()
  const to = location.pathname.startsWith('/admin') ? '/admin' : '/dietitian'
  return <Navigate to={to} replace />
}

/**
 * Dietitian + admin practice shell (from meallensaidieticnafrontend).
 * Mounted under App at `/dietitian/*`, so descendant routes match the
 * remaining path (`apply`, `availability`, …) — not `/dietitian/apply`.
 */
export default function DietitianAdminApp() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MarketplaceBootGate allowGuest={false} blocking>
          <div className="marketplace-root min-h-dvh bg-cream text-left">
            <Routes>
              <Route path="/onboarding/doctor" element={<DoctorOnboardingPage />} />
              <Route path="/signup/doctor" element={<Navigate to="/onboarding/doctor" replace />} />

              {/* Relative to /dietitian/* splat: "", "apply", "availability", ... */}
              <Route
                element={
                  <RequireAuth roles={['dietitian']}>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<DietitianDashboard />} />
                <Route
                  path="patients"
                  element={
                    <RequireDietitianMarketplace>
                      <PatientsPage />
                    </RequireDietitianMarketplace>
                  }
                />
                <Route
                  path="patients/:id"
                  element={
                    <RequireDietitianMarketplace>
                      <PatientChartPage />
                    </RequireDietitianMarketplace>
                  }
                />
                <Route path="apply" element={<ApplyPage />} />
                <Route path="availability" element={<AvailabilityPage />} />
                <Route
                  path="appointments"
                  element={
                    <RequireDietitianMarketplace>
                      <AppointmentsPage role="dietitian" />
                    </RequireDietitianMarketplace>
                  }
                />
                <Route
                  path="messages"
                  element={
                    <RequireDietitianMarketplace>
                      <MessagesPage role="dietitian" />
                    </RequireDietitianMarketplace>
                  }
                />
                <Route
                  path="messages/:id"
                  element={
                    <RequireDietitianMarketplace>
                      <MessagesPage role="dietitian" />
                    </RequireDietitianMarketplace>
                  }
                />
                <Route
                  path="files"
                  element={
                    <RequireDietitianMarketplace>
                      <FilesPage role="dietitian" />
                    </RequireDietitianMarketplace>
                  }
                />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<DietitianAccountPage />} />
                <Route path="dietitians/:id" element={<DietitianProfilePage />} />
              </Route>

              <Route
                element={
                  <RequireAuth roles={['admin']}>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/admin" element={<AdminQueuePage />} />
                <Route path="/admin/applications/:id" element={<AdminApplicationPage />} />
                <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                <Route path="/admin/dietitians" element={<AdminDietitiansPage />} />
                <Route path="/admin/dietitians/:id" element={<AdminDietitianDetailPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/public/:id" element={<DietitianProfilePage />} />
                <Route path="/admin/patients/:id" element={<PatientChartPage />} />
              </Route>

              <Route path="*" element={<CareFallbackRedirect />} />
            </Routes>
          </div>
        </MarketplaceBootGate>
      </AppProvider>
    </ThemeProvider>
  )
}
