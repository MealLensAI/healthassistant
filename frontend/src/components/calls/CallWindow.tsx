import { Maximize2, Minimize2 } from 'lucide-react'
import { VideoStage } from './VideoStage'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { cn } from '@/lib/care/utils'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { withCallPeerAvatar } from '@/lib/care/calls'

/** In-app call chrome: full-screen or floating PiP on the same page. */
export function CallWindow() {
  const { activeCall, currentUser, users, dietitians, applications, endCall } = useApp()
  const { playbackBlocked, playRemoteAudio, callChrome, setCallChrome } = useCallMedia()

  if (!activeCall || activeCall.incoming) return null

  const minimized = callChrome === 'minimized'

  // Override the shared marketplace root's min-height: 100% for the floating
  // view so its header and controls stay together within the viewport.
  return (
    <div
      className={cn(
        'marketplace-root fixed z-[90] overflow-hidden bg-[#0c121c] text-white shadow-elevated',
        minimized
          ? 'bottom-4 right-4 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/15 sm:bottom-6 sm:right-6'
          : 'inset-0',
      )}
      style={minimized ? { minHeight: 0 } : undefined}
      role="dialog"
      aria-modal={!minimized}
      aria-label="Call window"
    >
      <div className={cn('border-b border-white/10 px-3', minimized ? 'py-2' : 'px-4 py-3')}>
        <div className="min-w-0">
          <p className={cn('truncate font-semibold', minimized ? 'text-sm' : 'text-base')}>
            {activeCall.peerName || 'Care team'}
          </p>
          <p className="truncate text-[11px] text-white/65">
            {activeCall.status === 'ringing' ? 'Calling…' : 'In call'}
          </p>
        </div>
      </div>
      <div className={cn(minimized ? 'p-0' : 'mx-auto max-w-5xl space-y-3 p-4')}>
        <VideoStage
          call={withCallPeerAvatar(activeCall, users, dietitians, applications)}
          selfName={currentUser?.name}
          selfAvatar={accountAvatar(currentUser, dietitians, applications)}
          compact={minimized}
          onEnd={endCall}
          chromeControl={
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 hover:bg-black/75"
              onClick={() => setCallChrome(minimized ? 'expanded' : 'minimized')}
              aria-label={minimized ? 'Expand call' : 'Minimize call'}
              title={minimized ? 'Expand call' : 'Minimize call'}
            >
              {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          }
        />
        {playbackBlocked ? (
          <button
            type="button"
            className="m-3 w-[calc(100%-1.5rem)] rounded-xl bg-[#0E3E77] px-3 py-2 text-sm font-semibold text-white"
            onClick={playRemoteAudio}
          >
            Enable call audio
          </button>
        ) : null}
      </div>
    </div>
  )
}
