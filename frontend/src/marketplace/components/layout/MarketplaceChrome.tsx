import { X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IncomingCall } from '../calls/IncomingCall'
import { VideoStage } from '../calls/VideoStage'
import { useApp } from '../../context'
import { CallMediaProvider } from '../../lib/callMedia'
import { cn } from '../../lib/utils'

/**
 * Care overlays (toasts, calls) inside the main MealLensAI chrome.
 * `bare` skips nested marketplace-root when the parent shell already provides it.
 */
export function MarketplaceChrome({
  children,
  bare = false,
}: {
  children: ReactNode
  bare?: boolean
}) {
  const { toasts, dispatch, activeCall, answerCall, endCall, currentUser } = useApp()
  const location = useLocation()
  const incoming = Boolean(activeCall?.incoming)
  const onCallSurface =
    location.pathname.startsWith('/care/') || location.pathname.includes('/messages')
  const dockCall = Boolean(activeCall) && !incoming && !onCallSurface

  return (
    <CallMediaProvider>
      <div
        className={cn(
          'marketplace-shell flex min-h-0 flex-1 flex-col text-left',
          !bare && 'marketplace-root bg-cream',
        )}
      >
        <div className={cn('min-w-0 w-full flex-1 overflow-x-hidden', location.pathname.includes('/messages') ? 'p-3 sm:p-4' : 'p-4 sm:p-6')}>{children}</div>
        <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-80">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm shadow-elevated',
                toast.type === 'success' && 'border-leaf-soft bg-white text-leaf-deep',
                toast.type === 'error' && 'border-destructive/20 bg-white text-destructive',
                toast.type === 'info' && 'border-navy-soft bg-white text-navy',
              )}
            >
              <span>{toast.message}</span>
              <button onClick={() => dispatch({ type: 'REMOVE_TOAST', id: toast.id })} aria-label="Dismiss">
                <X size={14} />
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
          <div className="fixed bottom-4 right-4 z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-ink shadow-elevated sm:bottom-6 sm:right-6">
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
