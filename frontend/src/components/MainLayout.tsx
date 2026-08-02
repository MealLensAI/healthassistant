"use client"

import { useAuth } from "@/lib/utils"
import Sidebar from "./Sidebar"
import HealthProfileGate from "./HealthProfileGate"

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 min-h-screen w-full md:ml-[250px]">
        {children}
      </main>
      <HealthProfileGate />
    </div>
  )
}

export default MainLayout
