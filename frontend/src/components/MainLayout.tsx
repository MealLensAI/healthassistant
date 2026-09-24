"use client"

import { useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/utils"
import { useSicknessSettings } from "@/hooks/useSicknessSettings"
import Sidebar from "./Sidebar"
import HealthProfileGate from "./HealthProfileGate"
import Logo from "./Logo"
import { AppTopBar } from "./AppTopBar"
import { MarketplaceBootGate, MarketplaceProvider } from "@/components/MarketplaceProvider"
import { MarketplaceChrome } from "@/components/care-layout/MarketplaceChrome"
import { PageHeaderProvider } from "@/components/PageHeaderContext"

const MainLayout = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user } = useAuth()
  const { hasResolved, isHealthProfileComplete } = useSicknessSettings()
  const [navOpen, setNavOpen] = useState(false)

  if (!isAuthenticated) {
    return null
  }

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
    <MarketplaceProvider>
      <MarketplaceBootGate allowGuest={false} blocking>
        <PageHeaderProvider>
          <div className="marketplace-root flex min-h-screen bg-cream text-left">
            <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
            <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-[220px]">
              <AppTopBar onOpenNav={() => setNavOpen(true)} />
              <MarketplaceChrome bare>
                {children}
              </MarketplaceChrome>
            </div>
            <HealthProfileGate
              userId={user?.uid}
              ready={hasResolved}
              profileComplete={profileComplete}
            />
          </div>
        </PageHeaderProvider>
      </MarketplaceBootGate>
    </MarketplaceProvider>
  )
}

export default MainLayout
