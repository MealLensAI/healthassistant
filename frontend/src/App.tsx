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
import MainLayout from "./components/MainLayout"
import { Toaster } from "@/components/ui/toaster"
import "./App.css"
import HistoryPage from "./pages/History"
import HistoryDetailPage from "./pages/HistoryDetailPage"
import { AuthProvider } from "@/lib/AuthProvider"
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import TrialBlocker from "./components/TrialBlocker";
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

// Create router with future flags to eliminate deprecation warnings
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
    path: "/health-meals",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <AIResponsePage />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
  },
  {
    path: "/planner",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <Index />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
  },
  {
    path: "/history",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <HistoryPage />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
  },
  {
    path: "/history/:id",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <HistoryDetailPage />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
  },
  {
    path: "/payment",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <Payment />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <Profile />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <Settings />
          </MainLayout>
        </TrialBlocker>
      </ProtectedRoute>
    )
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
  // Initialize analytics once
  useEffect(() => {
    Analytics.initialize()
    try {
      const path = typeof window !== 'undefined' ? (window.location?.pathname || '/') : '/'
      Analytics.pageview(path)
      const match = ROUTE_SEO[path] || {}
      updateMeta(match)
    } catch (_) { }
  }, [])

  // Listen to route changes for pageviews + SEO
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
