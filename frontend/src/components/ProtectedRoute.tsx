"use client"

import type React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/utils"
import { useEnterpriseRole } from "@/hooks/useEnterpriseRole"
import Logo from "@/components/Logo"

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { isAuthenticated, loading } = useAuth()
  const { role, isLoading: roleLoading } = useEnterpriseRole()
  const location = useLocation()

  const waitingOnRole = isAuthenticated && (roleLoading || role === null)

  if (loading || waitingOnRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600 text-lg font-medium">Loading MealLensAI...</p>
            <p className="text-gray-500 text-sm">Please wait while we prepare your experience</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // If fallback is provided, show it instead of redirecting
    if (fallback) {
      return <>{fallback}</>
    }
    // Redirect to landing page route explicitly
    return <Navigate to="/landing" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
