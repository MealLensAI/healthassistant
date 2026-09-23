import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { RequireDietitianMarketplace } from './components/RequireDietitianMarketplace'
import { AppProvider } from './context'
import { MarketplaceBootGate } from './MarketplaceProvider'
import { ThemeProvider } from './theme'
import { AdminApplicationPage } from './pages/admin/AdminApplicationPage'
import { AdminDietitianDetailPage } from './pages/admin/AdminDietitianDetailPage'
import { AdminDietitiansPage } from './pages/admin/AdminDietitiansPage'
import { AdminQueuePage } from './pages/admin/AdminQueuePage'
import { ApplyPage } from './pages/dietitian/ApplyPage'
import { AvailabilityPage } from './pages/dietitian/AvailabilityPage'
import { DietitianDashboard } from './pages/dietitian/DietitianDashboard'
import { DietitianAccountPage } from './pages/dietitian/DietitianAccountPage'
import { PatientChartPage } from './pages/dietitian/PatientChartPage'
import { PatientsPage } from './pages/dietitian/PatientsPage'
import { LoginPage } from './pages/LoginPage'
import { DoctorOnboardingPage } from './pages/onboarding/DoctorOnboardingPage'
import { PatientOnboardingPage } from './pages/onboarding/PatientOnboardingPage'
import { AppointmentsPage } from './pages/patient/AppointmentsPage'
import { DietitianProfilePage } from './pages/patient/DietitianProfilePage'
import { FilesPage } from './pages/patient/FilesPage'
import { MessagesPage } from './pages/patient/MessagesPage'
import { SettingsPage } from './pages/patient/SettingsPage'
import './marketplace.css'

function DietitianRoutes() {
  return (
    <Routes>
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
      <Route path="*" element={<Navigate to="/dietitian" replace />} />
    </Routes>
  )
}

function AdminRoutes() {
  return (
    <Routes>
      <Route
        element={
          <RequireAuth roles={['admin']}>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<AdminQueuePage />} />
        <Route path="applications/:id" element={<AdminApplicationPage />} />
        <Route path="dietitians" element={<AdminDietitiansPage />} />
        <Route path="dietitians/:id" element={<AdminDietitianDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="public/:id" element={<DietitianProfilePage />} />
        <Route path="patients/:id" element={<PatientChartPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

/**
 * Dietitian / admin shell + care auth.
 * Patient care uses MainLayout (CarePatientPage) — one MealLensAI sidebar.
 */
export default function DietitianAdminApp() {
  const { pathname } = useLocation()
  const isDietitian = pathname === '/dietitian' || pathname.startsWith('/dietitian/')
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  let body: ReactNode
  if (isDietitian) {
    body = <DietitianRoutes />
  } else if (isAdmin) {
    body = <AdminRoutes />
  } else if (pathname === '/login') {
    body = <LoginPage />
  } else if (pathname.includes('/onboarding/patient') || pathname.includes('/signup/patient')) {
    body = pathname.includes('/signup') ? <Navigate to="/onboarding/patient" replace /> : <PatientOnboardingPage />
  } else if (pathname.includes('/onboarding/doctor') || pathname.includes('/signup/doctor')) {
    body = pathname.includes('/signup') ? <Navigate to="/onboarding/doctor" replace /> : <DoctorOnboardingPage />
  } else {
    body = <Navigate to="/dietitians" replace />
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <MarketplaceBootGate allowGuest>
          <div className="marketplace-root">{body}</div>
        </MarketplaceBootGate>
      </AppProvider>
    </ThemeProvider>
  )
}
