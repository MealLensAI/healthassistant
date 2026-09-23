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
import { HomePage as CareHomePage } from "./marketplace/pages/patient/HomePage";
import { SearchPage as CareSearchPage } from "./marketplace/pages/patient/SearchPage";
import { DietitianProfilePage } from "./marketplace/pages/patient/DietitianProfilePage";
import { CarePage } from "./marketplace/pages/patient/CarePage";
import { AppointmentsPage } from "./marketplace/pages/patient/AppointmentsPage";
import { MessagesPage } from "./marketplace/pages/patient/MessagesPage";
import { FilesPage } from "./marketplace/pages/patient/FilesPage";
import { SettingsPage as CareSettingsPage } from "./marketplace/pages/patient/SettingsPage";

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
    element: <PatientAppLayout />,
    children: [
      { path: "/health-meals", element: <AIResponsePage /> },
      { path: "/planner", element: <Index /> },
      { path: "/history", element: <HistoryPage /> },
      { path: "/history/:id", element: <HistoryDetailPage /> },
      { path: "/payment", element: <Payment /> },
      { path: "/profile", element: <Profile /> },
      { path: "/settings", element: <CareSettingsPage /> },
      { path: "/location-budget", element: <LocationBudgetPage /> },
      { path: "/food-for-you", element: <FoodForYouPage /> },
      // Care marketplace
      { path: "/dietitians", element: <CareHomePage /> },
      { path: "/search", element: <CareSearchPage /> },
      { path: "/dietitians/:id", element: <DietitianProfilePage /> },
      { path: "/care/:id", element: <CarePage /> },
      { path: "/appointments", element: <AppointmentsPage /> },
      { path: "/messages", element: <MessagesPage /> },
      { path: "/messages/:id", element: <MessagesPage /> },
      { path: "/files", element: <FilesPage /> },
      { path: "/care-profile", element: <Navigate to="/profile" replace /> },
      { path: "/care-settings", element: <Navigate to="/settings" replace /> },
    ],
  },
  {
    path: "/enterprise",
    element: (
      <ProtectedRoute>
        <OrganizationAccessGuard>
          <EnterpriseDashboard />
        </OrganizationAccessGuard>
      </ProtectedRoute>
    )
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
