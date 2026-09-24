import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/care-layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { RequireDietitianMarketplace } from '@/components/RequireDietitianMarketplace'
import { AppProvider } from '@/lib/care/context'
import { MarketplaceBootGate } from '@/components/MarketplaceProvider'
import { ThemeProvider } from '@/lib/care/theme'
import { AdminApplicationPage } from '@/pages/admin/AdminApplicationPage'
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

/**
 * Dietitian + admin practice shell (marketplace UI).
 * Mounted under MealLensAI ProtectedRoute for /dietitian/*, /admin/*, /onboarding/doctor.
 * Patients only see specialists after admin approval (RequireDietitianMarketplace + listing status).
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

              <Route
                path="/dietitian"
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
                <Route path="/admin/dietitians" element={<AdminDietitiansPage />} />
                <Route path="/admin/dietitians/:id" element={<AdminDietitianDetailPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/public/:id" element={<DietitianProfilePage />} />
                <Route path="/admin/patients/:id" element={<PatientChartPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dietitian" replace />} />
            </Routes>
          </div>
        </MarketplaceBootGate>
      </AppProvider>
    </ThemeProvider>
  )
}
