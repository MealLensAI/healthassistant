import { accountAvatar } from '@/lib/care/accountAvatar'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  Clock3,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useApp } from '@/lib/care/context'
import { unreadCountFor, pendingAppointmentCount } from '@/lib/care/alerts'
import { ownProfilePath } from '@/lib/care/profilePaths'
import { cn } from '@/lib/care/utils'
import { Avatar } from '@/components/care-ui/Primitives'
import { Logo } from '@/components/CareLogo'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

const patientNav: NavItem[] = [
  { to: '/dietitians', label: 'Home', icon: Home },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/files', label: 'My Health Files', icon: FolderOpen },
  { to: '/care-settings', label: 'Settings', icon: Settings },
  { to: '/food-for-you', label: 'Meal tools', icon: UtensilsCrossed },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Verification Queue', icon: ShieldCheck },
  { to: '/admin/dietitians', label: 'Approved Dietitians', icon: UserRound },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { currentUser, logout, conversations, messages, appointments, dietitians, applications } = useApp()
  if (!currentUser) return null

  const unread = unreadCountFor(currentUser.id, conversations, messages)

  const dietitianNav: NavItem[] = [
    { to: '/dietitian', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/dietitian/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/dietitian/messages', label: 'Messages', icon: MessageSquare, badge: unread },
    { to: '/dietitian/availability', label: 'Availability', icon: Clock3 },
    { to: '/dietitian/apply', label: 'Your Registration', icon: FileText },
    { to: '/enterprise', label: 'Organization', icon: UtensilsCrossed },
    { to: '/dietitian/settings', label: 'Settings', icon: Settings },
  ]

  const items = (currentUser.role === 'admin' ? adminNav : currentUser.role === 'dietitian' ? dietitianNav : patientNav).map((item) => ({ ...item, badge: item.to.endsWith('/appointments') ? pendingAppointmentCount(currentUser.id, appointments, dietitians) : item.to.endsWith('/messages') ? unread : item.badge }))

  const profileTo = ownProfilePath(currentUser.role)
  const homeTo = currentUser.role === 'admin' ? '/admin' : currentUser.role === 'dietitian' ? '/dietitian' : '/dietitians'

  // Pixel-lock to meallensaidieticnafrontend Sidebar: 14px/20px lh, 40px row, 16px radius.
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-10 shrink-0 items-center gap-3 rounded-[16px] px-3 text-[14px] font-medium leading-5 transition',
      isActive ? 'bg-navy-soft text-navy' : 'text-muted hover:bg-panel hover:text-ink',
    )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[min(16.5rem,calc(100vw-3rem))] flex-col border-r border-line bg-white shadow-elevated max-lg:transition-transform max-lg:duration-200 lg:static lg:z-0 lg:w-[240px] lg:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      <div className="flex items-center justify-between px-5 py-5">
        <Logo to={homeTo} />
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? (item.to === '/dietitians' || item.to === '/dietitian' || item.to === '/admin')}
            onClick={onClose}
            className={navLinkClass}
          >
            <item.icon size={20} strokeWidth={1.75} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1.5 text-[10px] font-bold leading-none text-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <NavLink to={profileTo} onClick={onClose} className="mb-3 flex items-center gap-3 rounded-[16px] p-2 hover:bg-panel">
          <Avatar src={accountAvatar(currentUser, dietitians, applications)} name={currentUser.name} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-5 text-ink">{currentUser.name}</p>
            <p className="truncate text-[12px] capitalize leading-4 text-muted">{currentUser.role}</p>
          </div>
        </NavLink>
        <button
          onClick={() => {
            onClose?.()
            logout()
          }}
          className="flex h-9 w-full items-center gap-2 rounded-[12px] px-3 text-[14px] font-medium leading-5 text-muted hover:bg-red-50 hover:text-destructive"
        >
          <LogOut size={16} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
