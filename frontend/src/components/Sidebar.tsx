"use client"

import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, Menu, X } from "lucide-react"
import Logo from "@/components/Logo"
import { useAuth } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { signOut, isAuthenticated } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/")

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      })
      navigate("/login")
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!isAuthenticated) {
    return null
  }

  const navItems = [
    { label: "Scan/type ingredients", path: "/health-meals" },
    { label: "Meal plans", path: "/planner" },
    { label: "Meals with location and budget", path: "/location-budget" },
    { label: "Health info", path: "/settings" },
    { label: "History", path: "/history" },
    { label: "Payment", path: "/payment" },
    { label: "Profile", path: "/profile" },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      <div className="h-[88px] flex items-center px-6 border-b border-border">
        <Logo size="lg" />
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path)
                setIsMobileOpen(false)
              }}
              className={`
                w-full text-left px-4 py-3 rounded-xl text-[14px] sm:text-[15px] font-semibold transition-colors leading-snug
                ${active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }
              `}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-5 border-t border-border mt-auto">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-[15px] font-medium"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-card rounded-xl shadow-soft border border-border"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-foreground/30 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[250px] flex-col z-40 border-r border-border bg-card">
        <SidebarContent />
      </aside>

      <aside
        className={`
        md:hidden fixed left-0 top-0 h-full w-[250px] flex flex-col z-50 border-r border-border bg-card shadow-elevated
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <SidebarContent />
      </aside>
    </>
  )
}

export default Sidebar
