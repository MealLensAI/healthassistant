"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Bell, Menu } from "lucide-react"
import { useAuth, cn, safeGetItem, safeSetItem } from "@/lib/utils"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Avatar } from "@/components/care-ui/Primitives"
import { useApp } from "@/lib/care/context"
import { notificationsFor, unreadNotificationCount } from "@/lib/care/alerts"
import { formatDate } from "@/lib/care/utils"
import { usePageHeaderState } from "@/components/PageHeaderContext"

const PROFILE_PHOTO_KEY = "meallensai.profile_photo"

export function readStoredProfilePhoto(): string {
  try {
    return safeGetItem(PROFILE_PHOTO_KEY) || ""
  } catch {
    return ""
  }
}

export function writeStoredProfilePhoto(dataUrl: string) {
  if (dataUrl) safeSetItem(PROFILE_PHOTO_KEY, dataUrl)
  try {
    const raw = safeGetItem("user_data")
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      parsed.photoURL = dataUrl
      parsed.avatar = dataUrl
      safeSetItem("user_data", JSON.stringify(parsed))
    }
  } catch {
    // ignore
  }
}

export function AppTopBar({ onOpenNav }: { onOpenNav?: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const header = usePageHeaderState() || {}
  const { currentUser, notifications, markNotificationRead, markNotificationsRead } = useApp()
  const [open, setOpen] = useState(false)
  const [photoBump, setPhotoBump] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Re-read when route changes or storage updates
  useEffect(() => {
    const onStorage = () => setPhotoBump((n) => n + 1)
    window.addEventListener("storage", onStorage)
    window.addEventListener("meallensai-profile-photo", onStorage)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("meallensai-profile-photo", onStorage)
    }
  }, [])

  const displayName =
    currentUser?.name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Member"
  const firstName = displayName.split(" ")[0]
  const avatar =
    currentUser?.avatar ||
    user?.photoURL ||
    (photoBump >= 0 ? readStoredProfilePhoto() : "") ||
    ""

  // Page titles live in-page for care routes — avoid duplicate top-bar titles.
  const pageTitle =
    header?.title ||
    (location.pathname.startsWith("/profile") ? "Profile" : undefined)

  const mine = useMemo(
    () => (currentUser ? notificationsFor(currentUser.id, notifications) : []),
    [currentUser, notifications],
  )
  const unreadNotifs = currentUser ? unreadNotificationCount(currentUser.id, notifications) : 0

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-white/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-6">
      <button
        type="button"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:bg-panel md:hidden"
        aria-label="Open menu"
        onClick={onOpenNav}
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex items-center gap-2 sm:gap-3">
        {pageTitle ? (
          <h1 className="truncate font-display text-base font-bold tracking-tight text-ink sm:text-lg md:text-xl">
            {pageTitle}
          </h1>
        ) : null}
        {header?.actions ? (
          <div className="hidden min-w-0 items-center gap-2 sm:flex">{header.actions}</div>
        ) : null}
      </div>

      {header?.actions ? (
        <div className="flex min-w-0 items-center gap-2 sm:hidden">{header.actions}</div>
      ) : null}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line text-muted-foreground hover:bg-panel"
            aria-label="Notifications"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((current) => !current)}
          >
            <Bell size={18} />
            {unreadNotifs > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-navy px-1 text-[10px] font-bold text-white">
                {unreadNotifs}
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
                {unreadNotifs > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-navy"
                    onClick={markNotificationsRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {mine.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                <ul className="max-h-[min(24rem,70vh)] overflow-auto">
                  {mine.map((item) => (
                    <li key={item.id} className={item.read ? "bg-white" : "bg-navy-soft/60"}>
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="block px-4 py-3 hover:bg-panel"
                          onClick={() => {
                            markNotificationRead(item.id)
                            setOpen(false)
                          }}
                        >
                          <NotificationCopy
                            title={item.title}
                            body={item.body}
                            createdAt={item.createdAt}
                            unread={!item.read}
                          />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full px-4 py-3 text-left hover:bg-panel"
                          onClick={() => markNotificationRead(item.id)}
                        >
                          <NotificationCopy
                            title={item.title}
                            body={item.body}
                            createdAt={item.createdAt}
                            unread={!item.read}
                          />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Link
          to="/profile"
          className={cn("flex items-center gap-2 hover:opacity-90")}
          aria-label="Open profile"
        >
          <span className="hidden text-sm font-semibold text-ink sm:block">{firstName}</span>
          <Avatar src={avatar} name={displayName} size={36} />
        </Link>
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
      <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-navy">
        {formatDate(createdAt)}
        {unread ? " · New" : ""}
      </p>
    </>
  )
}
