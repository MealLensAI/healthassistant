'use client'

import {
  Activity,
  Building2,
  Calendar,
  CalendarDays,
  Clock3,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Utensils,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useApp } from '@/lib/care/context'
import { unreadCountFor } from '@/lib/care/alerts'
import { cn } from '@/lib/care/utils'
import { Avatar } from '@/components/care-ui/Primitives'
import Logo from '@/components/Logo'
import '@/styles/care.css'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  badgeKey?: 'messages'
}

const navItems: NavItem[] = [
  { to: '/enterprise', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/enterprise/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/enterprise/messages', label: 'Messages', icon: MessageSquare, badgeKey: 'messages' },
  { to: '/enterprise/availability', label: 'Availability', icon: Clock3 },
  { to: '/enterprise/activity', label: 'Activity', icon: Activity },
  { to: '/enterprise/meal-plans', label: 'Meal Plans', icon: Calendar },
  { to: '/enterprise/food-for-you', label: 'Food for you', icon: Heart },
  { to: '/enterprise/food-history', label: 'Food History', icon: Utensils },
  { to: '/enterprise/health-info', label: 'Health Information', icon: Building2 },
  { to: '/enterprise/apply', label: 'Your Registration', icon: FileText },
  { to: '/enterprise/settings', label: 'Settings', icon: Settings },
]

interface EnterpriseSidebarProps {
  onSignOut?: () => void
  onNavigate?: () => void
}

export default function EnterpriseSidebar({
  onSignOut,
  onNavigate,
}: EnterpriseSidebarProps = {}) {
  const { currentUser, conversations, messages, logout } = useApp()
  const unread = currentUser ? unreadCountFor(currentUser.id, conversations, messages) : 0

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
      isActive ? 'bg-navy-soft text-navy' : 'text-muted hover:bg-panel hover:text-ink',
    )

  return (
    <aside
      className="flex h-full w-[240px] shrink-0 flex-col overflow-hidden border-r border-line bg-white text-left [overscroll-behavior:none]"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-4">
        <Logo to="/enterprise" size="md" />
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel lg:hidden"
          aria-label="Close menu"
          onClick={onNavigate}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const badge = item.badgeKey === 'messages' ? unread : 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              onClick={onNavigate}
              className={linkClass}
            >
              <Icon size={20} strokeWidth={1.75} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badge > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1.5 text-[10px] font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        {currentUser ? (
          <NavLink
            to="/enterprise/profile"
            onClick={onNavigate}
            className="mb-2 flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-panel"
          >
            <Avatar src={currentUser.avatar} name={currentUser.name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{currentUser.name}</p>
              <p className="truncate text-xs capitalize text-muted">{currentUser.role}</p>
            </div>
          </NavLink>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            if (onSignOut) void onSignOut()
            else logout()
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-red-50 hover:text-destructive"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
