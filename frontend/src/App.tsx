import { lazy, Suspense, useEffect } from "react"
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom"
import { AuthProvider } from "@/lib/AuthProvider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@/lib/analytics"
import { ROUTE_SEO, updateMeta } from "@/lib/seo"
import "./App.css"

// Eagerly loaded components (needed for initial render)
import ProtectedRoute from "./components/ProtectedRoute"
import MainLayout from "./components/MainLayout"
import TrialBlocker from "./components/TrialBlocker"
import OrganizationAccessGuard from "./components/OrganizationAccessGuard"
import RoleAwareRedirect from "./components/RoleAwareRedirect"

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
)

// Lazy loaded pages for better code splitting
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const AIResponsePage = lazy(() => import("./pages/AIResponsePage"))
const Index = lazy(() => import("./pages/Index"))
const HistoryPage = lazy(() => import("./pages/History"))
const HistoryDetailPage = lazy(() => import("./pages/HistoryDetailPage"))
const Payment = lazy(() => import("./pages/Payment"))
const Settings = lazy(() => import("./pages/Settings"))
const Profile = lazy(() => import("./pages/Profile"))
const WelcomePage = lazy(() => import("./pages/WelcomePage"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const Onboarding = lazy(() => import("./pages/Onboarding"))
const EnterpriseDashboard = lazy(() => import("./pages/EnterpriseDashboard"))
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"))
const LogoutAndLogin = lazy(() => import("./pages/LogoutAndLogin"))

// Wrapper for lazy components with suspense
const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

// Create router with lazy loaded routes
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LazyPage><Login /></LazyPage>
  },
  {
    path: "/logout-and-login",
    element: <LazyPage><LogoutAndLogin /></LazyPage>
  },
  {
    path: "/onboarding",
    element: <LazyPage><Onboarding /></LazyPage>
  },
  {
    path: "/forgot-password",
    element: <LazyPage><ForgotPassword /></LazyPage>
  },
  {
    path: "/reset-password",
    element: <LazyPage><ResetPassword /></LazyPage>
  },
  {
    path: "/signup",
    element: <LazyPage><Signup /></LazyPage>
  },
  {
    path: "/",
    element: (
      <ProtectedRoute fallback={<LazyPage><WelcomePage /></LazyPage>}>
        <RoleAwareRedirect />
      </ProtectedRoute>
    )
  },
  {
    path: "/landing",
    element: <LazyPage><WelcomePage /></LazyPage>
  },
  {
    path: "/health-meals",
    element: (
      <ProtectedRoute>
        <TrialBlocker>
          <MainLayout>
            <LazyPage><AIResponsePage /></LazyPage>
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
            <LazyPage><Index /></LazyPage>
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
            <LazyPage><HistoryPage /></LazyPage>
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
            <LazyPage><HistoryDetailPage /></LazyPage>
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
            <LazyPage><Payment /></LazyPage>
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
            <LazyPage><Profile /></LazyPage>
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
            <LazyPage><Settings /></LazyPage>
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
          <LazyPage><EnterpriseDashboard /></LazyPage>
        </OrganizationAccessGuard>
      </ProtectedRoute>
    )
  },
  {
    path: "/accept-invitation",
    element: <LazyPage><AcceptInvitation /></LazyPage>
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
