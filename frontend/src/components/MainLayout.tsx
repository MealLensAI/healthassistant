"use client"

import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/utils"
import { useSicknessSettings } from "@/hooks/useSicknessSettings"
import Sidebar from "./Sidebar"
import HealthProfileGate from "./HealthProfileGate"
import Logo from "./Logo"

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth()
  const { hasResolved, isHealthProfileComplete } = useSicknessSettings()

  if (!isAuthenticated) {
    return null
  }

  // Hold the dashboard until the first health-profile check finishes.
  // Uses hasResolved (not loading) so later saves/refreshes don't remount the app shell.
  if (!hasResolved) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600 text-lg font-medium">Loading MealLensAI...</p>
            <p className="text-gray-500 text-sm">Checking your health profile</p>
          </div>
        </div>
      </div>
    )
  }

  const profileComplete = isHealthProfileComplete()

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 min-h-screen w-full md:ml-[250px]">
        {children}
      </main>
      <HealthProfileGate
        userId={user?.uid}
        ready={hasResolved}
        profileComplete={profileComplete}
      />
    </div>
  )
}

export default MainLayout
