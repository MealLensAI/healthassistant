import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from '@/lib/care/context'
import { MarketplaceBootGate } from '@/components/MarketplaceProvider'
import { ThemeProvider } from '@/lib/care/theme'
import { IncomingCall } from '@/components/calls/IncomingCall'
import { VideoStage } from '@/components/calls/VideoStage'
import { TopBar } from '@/components/care-layout/TopBar'
import { CallMediaProvider } from '@/lib/care/callMedia'
import { cn } from '@/lib/care/utils'
import { useAuth } from '@/lib/utils'
import EntrepriseSidebar from '@/components/enterprise/sidebar/EntrepriseSidebar'
import '@/styles/care.css'

/**
 * Organization practice shell.
 * Sidebar stays fixed (no slide animation); only the main pane scrolls.
 */
export default function EnterpriseApp() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MarketplaceBootGate allowGuest={false} blocking>
          <EnterpriseShell />
        </MarketplaceBootGate>
      </AppProvider>
    </ThemeProvider>
  )
}

function EnterpriseShell() {
  const { signOut } = useAuth()
  const { toasts, dispatch, activeCall, answerCall, endCall, currentUser } = useApp()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const incoming = Boolean(activeCall?.incoming)
  const onCallSurface = location.pathname.includes('/messages')
  const dockCall = Boolean(activeCall) && !incoming && !onCallSurface

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const previousHtml = document.documentElement.style.overflow
    const previousBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previousHtml
      document.body.style.overflow = previousBody
    }
  }, [])

  const closeNav = () => setNavOpen(false)
  const signOutHandler = async () => {
    try {
      await signOut()
    } catch {
      /* ignore */
    }
  }

  return (
    <CallMediaProvider>
      <div className="marketplace-root flex h-dvh max-h-dvh overflow-hidden overscroll-none bg-cream text-left">
        {/* Desktop: permanently fixed column — never translates */}
        <div className="hidden h-full shrink-0 lg:block">
          <EntrepriseSidebar onSignOut={signOutHandler} />
        </div>

        {/* Mobile: instant show/hide overlay — no slide transition */}
        {navOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
              aria-label="Close menu"
              onClick={closeNav}
            />
            <div className="fixed inset-y-0 left-0 z-50 h-dvh lg:hidden">
              <EntrepriseSidebar onNavigate={closeNav} onSignOut={signOutHandler} />
            </div>
          </>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0">
            <TopBar onOpenNav={() => setNavOpen(true)} />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6">
            <Outlet />
          </main>
        </div>

        <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-80">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-elevated',
                toast.type === 'success' && 'border-leaf-soft bg-white text-leaf-deep',
                toast.type === 'error' && 'border-destructive/20 bg-white text-destructive',
                toast.type === 'info' && 'border-navy-soft bg-white text-navy',
              )}
            >
              <span>{toast.message}</span>
              <button type="button" onClick={() => dispatch({ type: 'REMOVE_TOAST', id: toast.id })} aria-label="Dismiss">
                ×
              </button>
            </div>
          ))}
        </div>

        {incoming && activeCall ? (
          <IncomingCall
            peerName={activeCall.peerName}
            peerAvatar={activeCall.peerAvatar}
            onAnswer={answerCall}
            onDecline={endCall}
          />
        ) : null}
        {dockCall && activeCall ? (
          <div className="fixed bottom-4 right-4 z-40 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-lg border border-line bg-ink shadow-elevated sm:bottom-6 sm:right-6">
            <VideoStage
              call={activeCall}
              selfAvatar={currentUser?.avatar}
              selfName={currentUser?.name}
              compact
              onEnd={endCall}
            />
          </div>
        ) : null}
      </div>
    </CallMediaProvider>
  )
}
