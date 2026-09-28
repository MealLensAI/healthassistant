"use client"

import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FolderOpen,
  History,
  LogOut,
  MapPin,
  MessageSquare,
  Salad,
  ScanLine,
  Settings,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react"
import { Logo } from "@/components/CareLogo"
import { useApp } from "@/lib/care/context"
import { pendingAppointmentCount, unreadCountFor } from "@/lib/care/alerts"
import { Avatar } from "@/components/care-ui/Primitives"
import { useAuth, cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { readStoredProfilePhoto } from "@/components/AppTopBar"

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  match?: (path: string) => boolean
}

const mealNav: NavItem[] = [
  {
    to: "/dietitians",
    label: "Find a dietitian",
    icon: Stethoscope,
    match: (path) => path === "/dietitians" || path.startsWith("/dietitians/") || path.startsWith("/care/"),
  },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/food-for-you", label: "Food for you", icon: Salad, end: true },
  { to: "/health-meals", label: "Scan ingredients", icon: ScanLine },
  { to: "/planner", label: "Meal plans", icon: ClipboardList },
  { to: "/location-budget", label: "Location & budget", icon: MapPin },
  { to: "/files", label: "My Health Files", icon: FolderOpen },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/history", label: "History", icon: History },
  { to: "/payment", label: "Payment", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
]

type SidebarProps = {
  open?: boolean
  onClose?: () => void
}

const Sidebar = ({ open = false, onClose }: SidebarProps) => {
  const { currentUser, appointments, dietitians, conversations, messages } = useApp()
  const pending = currentUser ? pendingAppointmentCount(currentUser.id, appointments, dietitians) : 0
  const unread = currentUser ? unreadCountFor(currentUser.id, conversations, messages) : 0
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { signOut, isAuthenticated, user } = useAuth()
  const [photoBump, setPhotoBump] = useState(0)

  useEffect(() => {
    const onPhoto = () => setPhotoBump((n) => n + 1)
    window.addEventListener("meallensai-profile-photo", onPhoto)
    return () => window.removeEventListener("meallensai-profile-photo", onPhoto)
  }, [])

  if (!isAuthenticated) {
    return null
  }

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

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Member"
  const avatar = currentUser?.avatar || user?.photoURL || (photoBump >= 0 ? readStoredProfilePhoto(user?.uid) : "") || ""

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(16.5rem,calc(100vw-3rem))] flex-col border-r border-line bg-white shadow-elevated transition-transform duration-200 md:w-[240px] md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div onClick={onClose}>
            <Logo to="/food-for-you" />
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel md:hidden"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {mealNav.map((item) => {
            const badge = item.to === "/appointments" ? pending : item.to === "/messages" ? unread : 0
            const active = item.match
              ? item.match(location.pathname)
              : item.end
                ? location.pathname === item.to
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-3 rounded-[16px] px-3 text-[14px] font-medium leading-5 transition",
                  active ? "bg-navy-soft text-navy" : "text-muted hover:bg-panel hover:text-ink",
                )}
              >
                <item.icon size={20} strokeWidth={1.75} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {badge > 0 && <span className="rounded-full bg-navy px-1.5 text-xs font-bold text-white">{badge}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-line p-4">
          <NavLink
            to="/profile"
            onClick={onClose}
            className="mb-3 flex items-center gap-3 rounded-[16px] p-2 hover:bg-panel"
          >
            <Avatar src={avatar} name={displayName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold leading-5 text-ink">{displayName.split(" ")[0]}</p>
              <p className="truncate text-[12px] leading-4 text-muted">View profile</p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={() => {
              onClose?.()
              void handleSignOut()
            }}
            className="flex h-9 w-full items-center gap-2 rounded-[12px] px-3 text-[14px] font-medium leading-5 text-muted hover:bg-red-50 hover:text-destructive"
          >
            <LogOut size={16} className="shrink-0" />
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
