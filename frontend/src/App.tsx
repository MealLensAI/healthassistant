import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom"
import { useEffect } from "react"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import AIResponsePage from "./pages/AIResponsePage"
import Index from "./pages/Index"
import ProtectedRoute from "./components/ProtectedRoute"
import { Toaster } from "@/components/ui/toaster"
import "./App.css"
import HistoryPage from "./pages/History"
import HistoryDetailPage from "./pages/HistoryDetailPage"
import { AuthProvider } from "@/lib/AuthProvider"
import Payment from "./pages/Payment";
import Profile from "./pages/Profile";
import LocationBudgetPage from "./pages/LocationBudgetPage";
import FoodForYouPage from "./pages/FoodForYouPage";
import WelcomePage from "./pages/WelcomePage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import { Analytics } from "@/lib/analytics";
import { ROUTE_SEO, updateMeta } from "@/lib/seo";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";
import AcceptInvitation from "./pages/AcceptInvitation";
import OrganizationAccessGuard from "./components/OrganizationAccessGuard";
import RoleAwareRedirect from "./components/RoleAwareRedirect";
import LogoutAndLogin from "./pages/LogoutAndLogin";
import PatientAppLayout from "./components/PatientAppLayout";
import DietitianAdminApp from "@/components/DietitianAdminApp";
import AdminApp from "@/components/AdminApp";
import EnterpriseApp from "./components/enterprise/EnterpriseApp";
import { MarketplaceLayout } from "@/components/MarketplaceAccessGate";
import { HomePage as CareHomePage } from "@/pages/patient/HomePage";
import { SearchPage as CareSearchPage } from "@/pages/patient/SearchPage";
import { DietitianProfilePage } from "@/pages/patient/DietitianProfilePage";
import { CarePage } from "@/pages/patient/CarePage";
import { AppointmentsPage } from "@/pages/patient/AppointmentsPage";
import { MessagesPage } from "@/pages/patient/MessagesPage";
import { FilesPage } from "@/pages/patient/FilesPage";
import { SettingsPage as CareSettingsPage } from "@/pages/patient/SettingsPage";
import { PatientsPage } from "@/pages/dietitian/PatientsPage";
import { PatientChartPage } from "@/pages/dietitian/PatientChartPage";
import { ApplyPage } from "@/pages/dietitian/ApplyPage";
import { AvailabilityPage } from "@/pages/dietitian/AvailabilityPage";
import { DietitianAccountPage } from "@/pages/dietitian/DietitianAccountPage";
import { SettingsPage as MarketplaceSettingsPage } from "@/pages/patient/SettingsPage";
import { AdminQueuePage } from "@/pages/admin/AdminQueuePage";
import { AdminApplicationPage } from "@/pages/admin/AdminApplicationPage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminDietitiansPage } from "@/pages/admin/AdminDietitiansPage";
import { AdminDietitianDetailPage } from "@/pages/admin/AdminDietitianDetailPage";
import { SettingsPage as AdminSettingsPage } from "@/pages/patient/SettingsPage";
import CleanerPage from "./pages/CleanerPage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/logout-and-login",
    element: <LogoutAndLogin />
  },
  {
    path: "/onboarding",
    element: <Onboarding />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/",
    element: (
      <ProtectedRoute fallback={<WelcomePage />}>
        <RoleAwareRedirect />
      </ProtectedRoute>
    )
  },
  {
    path: "/landing",
    element: <WelcomePage />
  },
  {
    path: "/clearaer",
    element: <CleanerPage />
  },
  {
    path: "/iclearer",
    element: <Navigate to="/clearaer" replace />
  },
  {
    element: <PatientAppLayout />,
    children: [
      { path: "/health-meals", element: <AIResponsePage /> },
      { path: "/planner", element: <Index /> },
      { path: "/history", element: <HistoryPage /> },
      { path: "/history/:id", element: <HistoryDetailPage /> },
      { path: "/payment", element: <Payment /> },
      { path: "/profile", element: <Profile /> },
      { path: "/health-information", element: <Navigate to="/profile" replace /> },
      { path: "/health-info", element: <Navigate to="/profile" replace /> },
      { path: "/health-information-settings", element: <Navigate to="/profile" replace /> },
      { path: "/settings", element: <CareSettingsPage /> },
      { path: "/location-budget", element: <LocationBudgetPage /> },
      { path: "/food-for-you", element: <FoodForYouPage /> },
      // Care marketplace — Silver/Gold only. Dietitian-invite / enterprise stays separate.
      {
        element: <MarketplaceLayout />,
        children: [
          { path: "/dietitians", element: <CareHomePage /> },
          { path: "/search", element: <CareSearchPage /> },
          { path: "/dietitians/:id", element: <DietitianProfilePage /> },
          { path: "/care/:id", element: <CarePage /> },
          { path: "/appointments", element: <AppointmentsPage /> },
          { path: "/messages", element: <MessagesPage /> },
          { path: "/messages/:id", element: <MessagesPage /> },
          { path: "/files", element: <FilesPage /> },
        ],
      },
      { path: "/care-profile", element: <Navigate to="/profile" replace /> },
      { path: "/care-settings", element: <Navigate to="/settings" replace /> },
    ],
  },
  // Dietitian practice — requires MealLensAI account
  {
    path: "/dietitian/*",
    element: (
      <ProtectedRoute>
        <DietitianAdminApp />
      </ProtectedRoute>
    ),
  },
  // Admin verification queue — no MealLens ProtectedRoute (that sent users to /landing).
  {
    path: "/admin",
    element: <AdminApp />,
    children: [
      { index: true, element: <AdminQueuePage /> },
      { path: "applications/:id", element: <AdminApplicationPage /> },
      { path: "bookings", element: <AdminBookingsPage /> },
      { path: "dietitians", element: <AdminDietitiansPage /> },
      { path: "dietitians/:id", element: <AdminDietitianDetailPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
      { path: "public/:id", element: <DietitianProfilePage /> },
      { path: "patients/:id", element: <PatientChartPage /> },
    ],
  },
  {
    path: "/onboarding/doctor",
    element: (
      <ProtectedRoute>
        <DietitianAdminApp />
      </ProtectedRoute>
    ),
  },
  {
    path: "/signup/doctor",
    element: <Navigate to="/onboarding/doctor" replace />,
  },
  {
    path: "/enterprise",
    element: (
      <ProtectedRoute>
        <OrganizationAccessGuard>
          <EnterpriseApp />
        </OrganizationAccessGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <EnterpriseDashboard /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/:id", element: <PatientChartPage /> },
      { path: "messages", element: <MessagesPage role="dietitian" /> },
      { path: "messages/:id", element: <MessagesPage role="dietitian" /> },
      { path: "appointments", element: <AppointmentsPage role="dietitian" /> },
      { path: "apply", element: <ApplyPage /> },
      { path: "availability", element: <AvailabilityPage /> },
      { path: "files", element: <FilesPage role="dietitian" /> },
      { path: "profile", element: <DietitianAccountPage /> },
      { path: "settings", element: <MarketplaceSettingsPage /> },
      { path: "members", element: <EnterpriseDashboard /> },
      { path: "activity", element: <EnterpriseDashboard /> },
      { path: "meal-plans", element: <EnterpriseDashboard /> },
      { path: "food-for-you", element: <EnterpriseDashboard /> },
      { path: "food-history", element: <EnterpriseDashboard /> },
      { path: "history", element: <EnterpriseDashboard /> },
      { path: "health-info", element: <EnterpriseDashboard /> },
    ],
  },
  {
    path: "/accept-invitation",
    element: <AcceptInvitation />
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
])

function App() {
  useEffect(() => {
    Analytics.initialize()
    try {
      const path = typeof window !== 'undefined' ? (window.location?.pathname || '/') : '/'
      Analytics.pageview(path)
      const match = ROUTE_SEO[path] || {}
      updateMeta(match)
    } catch (_) { }
  }, [])

  useEffect(() => {
    const unsubs = router.subscribe(({ location }) => {
      try {
        const path = location.pathname
        Analytics.pageview(path)
        const match = ROUTE_SEO[path] || {}
        updateMeta(match)
      } catch (_) { }
    })
    return () => {
      try { unsubs && (unsubs as any)() } catch (_) { }
    }
  }, [])

  return (
    <AuthProvider>
      <div className="App">
        <RouterProvider router={router} />
        <Toaster />
      </div>
    </AuthProvider>
  )
}

export default App
