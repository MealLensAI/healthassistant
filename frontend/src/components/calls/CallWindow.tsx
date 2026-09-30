import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { VideoStage } from './VideoStage'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { cn } from '@/lib/care/utils'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { withCallPeerAvatar } from '@/lib/care/calls'

type DragOffset = { x: number; y: number }

/** In-app call chrome: full-screen or floating PiP on the same page. */
export function CallWindow() {
  const { activeCall, currentUser, users, dietitians, applications, endCall } = useApp()
  const { playbackBlocked, playRemoteAudio, callChrome, setCallChrome } = useCallMedia()
  const shellRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  useEffect(() => {
    if (callChrome !== 'minimized') setOffset({ x: 0, y: 0 })
  }, [callChrome])

  if (!activeCall || activeCall.incoming) return null

  const minimized = callChrome === 'minimized'

  function clampOffset(next: DragOffset): DragOffset {
    const el = shellRef.current
    if (!el || typeof window === 'undefined') return next
    const rect = el.getBoundingClientRect()
    // Position is bottom-right based; offsets move left (−x) / up (−y) when positive drag goes right/down.
    const maxX = Math.max(0, window.innerWidth - rect.width - 8)
    const maxY = Math.max(0, window.innerHeight - rect.height - 8)
    return {
      x: Math.min(maxX, Math.max(-8, next.x)),
      y: Math.min(maxY, Math.max(-8, next.y)),
    }
  }

  function onDragPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!minimized) return
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    }
  }

  function onDragPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    setOffset(clampOffset({ x: drag.originX + dx, y: drag.originY + dy }))
  }

  function onDragPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  // Override the shared marketplace root's min-height: 100% for the floating
  // view so its header and controls stay together within the viewport.
  return (
    <div
      ref={shellRef}
      className={cn(
        'marketplace-root fixed z-[90] overflow-hidden bg-[#0c121c] text-white shadow-elevated',
        minimized
          ? 'bottom-4 right-4 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/15 sm:bottom-6 sm:right-6'
          : 'inset-0',
      )}
      style={
        minimized
          ? {
              minHeight: 0,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              touchAction: 'none',
            }
          : undefined
      }
      role="dialog"
      aria-modal={!minimized}
      aria-label="Call window"
    >
      <div
        className={cn(
          'border-b border-white/10 px-3',
          minimized ? 'cursor-grab py-2 active:cursor-grabbing select-none' : 'px-4 py-3',
        )}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
      >
        <div className="min-w-0">
          <p className={cn('truncate font-semibold', minimized ? 'text-sm' : 'text-base')}>
            {activeCall.peerName || 'Care team'}
          </p>
          <p className="truncate text-[11px] text-white/65">
            {activeCall.status === 'ringing' ? 'Calling…' : 'In call'}
            {minimized ? ' · Drag to move' : ''}
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
