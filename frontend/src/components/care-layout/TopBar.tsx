import { Bell, Menu } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '@/lib/care/context'
import { notificationsFor, unreadNotificationCount } from '@/lib/care/alerts'
import { formatDate } from '@/lib/care/utils'
import { ownProfilePath } from '@/lib/care/profilePaths'
import { practicePath } from '@/lib/care/practiceBase'
import { Logo } from '@/components/CareLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Avatar } from '@/components/care-ui/Primitives'

/** Prefer given/first name; skip titles like Dr./Mr. */
export function displayFirstName(fullName?: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  const titles = new Set(['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'miss', 'prof', 'prof.'])
  const given = parts.find((part) => !titles.has(part.toLowerCase()))
  return given || parts[0] || 'Account'
}

export function TopBar({ onOpenNav }: { onOpenNav?: () => void }) {
  const { currentUser, notifications, markNotificationRead, markNotificationsRead } = useApp()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mine = useMemo(
    () => (currentUser ? notificationsFor(currentUser.id, notifications) : []),
    [currentUser, notifications],
  )
  const unread = currentUser ? unreadNotificationCount(currentUser.id, notifications) : 0
  const homeTo =
    currentUser?.role === 'admin'
      ? '/admin'
      : currentUser?.role === 'dietitian'
        ? practicePath('', location.pathname)
        : '/dietitians'
  const profileTo = currentUser
    ? currentUser.role === 'dietitian'
      ? practicePath('profile', location.pathname)
      : ownProfilePath(currentUser.role, location.pathname)
    : '/'
  const firstName = displayFirstName(currentUser?.name)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <header className="flex items-center gap-2 border-b border-line bg-white/90 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
      <button
        type="button"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:bg-panel lg:hidden"
        aria-label="Open menu"
        onClick={onOpenNav}
      >
        <Menu size={18} />
      </button>
      <div className="min-w-0 flex-1 lg:hidden">
        <Logo compact to={homeTo} className="h-8" />
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:bg-panel"
            aria-label="Notifications"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((current) => !current)}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-navy px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div
              className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-elevated"
              role="dialog"
              aria-label="Notifications"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-bold text-ink">Notifications</p>
                {unread > 0 && (
                  <button type="button" className="text-xs font-semibold text-navy" onClick={markNotificationsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              {mine.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>
              ) : (
                <ul className="max-h-[min(24rem,70vh)] overflow-auto">
                  {mine.map((item) => (
                    <li key={item.id} className={item.read ? 'bg-white' : 'bg-navy-soft/60'}>
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="block px-4 py-3 hover:bg-panel"
                          onClick={() => {
                            markNotificationRead(item.id)
                            setOpen(false)
                          }}
                        >
                          <NotificationCopy title={item.title} body={item.body} createdAt={item.createdAt} unread={!item.read} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full px-4 py-3 text-left hover:bg-panel"
                          onClick={() => markNotificationRead(item.id)}
                        >
                          <NotificationCopy title={item.title} body={item.body} createdAt={item.createdAt} unread={!item.read} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {currentUser && (
          <Link to={profileTo} className="flex items-center gap-2 hover:opacity-90" aria-label="Open profile">
            <span className="hidden text-sm font-semibold text-ink sm:block">{firstName}</span>
            <Avatar src={currentUser.avatar} name={currentUser.name} size={36} />
          </Link>
        )}
      </div>
    </header>
  )
}

function NotificationCopy({
  title,
  body,
  createdAt,
  unread,
}: {
  title: string
  body: string
  createdAt: string
  unread: boolean
}) {
  return (
    <>
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-0.5 text-sm text-muted">{body}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-navy">
        {formatDate(createdAt)}
        {unread ? ' · New' : ''}
      </p>
    </>
  )
}
