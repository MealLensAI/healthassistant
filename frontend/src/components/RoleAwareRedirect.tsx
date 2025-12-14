"use client"

import { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/utils"
import { useEnterpriseRole } from "@/hooks/useEnterpriseRole"
import Logo from "@/components/Logo"

const RoleAwareRedirect = () => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { role, isLoading: roleLoading } = useEnterpriseRole()

  // Add timeout to prevent infinite loading
  const [hasTimedOut, setHasTimedOut] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading || roleLoading || !isAuthenticated) {
        setHasTimedOut(true)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timer)
  }, [authLoading, roleLoading, isAuthenticated])

  if (hasTimedOut) {
    // If timed out, just redirect to planner
    return <Navigate to="/planner" replace />
  }

  if (authLoading || roleLoading || !isAuthenticated || role === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600 text-lg font-medium">Preparing your dashboard…</p>
            <p className="text-gray-500 text-sm">Please wait while we verify your workspace</p>
          </div>
        </div>
      </div>
    )
  }

  const destination = role === "organization" ? "/enterprise" : "/planner"
  return <Navigate to={destination} replace />
}

export default RoleAwareRedirect

