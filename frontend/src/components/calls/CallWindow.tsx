import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { VideoStage } from './VideoStage'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { cn } from '@/lib/care/utils'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { withCallPeerAvatar } from '@/lib/care/calls'

type DragOffset = { x: number; y: number }

/** In-app call chrome: full-screen or floating Meet-style PiP on the same page. */
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

  return (
    <div
      ref={shellRef}
      className={cn(
        'marketplace-root fixed z-[90] overflow-hidden bg-[#0c121c] text-white shadow-elevated',
        minimized
          ? 'bottom-3 right-3 w-[min(11.5rem,calc(100vw-1.5rem))] rounded-xl border border-white/20 sm:bottom-4 sm:right-4'
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
      {minimized ? (
        <div
          className="flex cursor-grab items-center gap-1 border-b border-white/10 px-2 py-1 active:cursor-grabbing select-none"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
        >
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold">
            {activeCall.status === 'ringing' ? 'Calling…' : activeCall.peerName || 'In call'}
          </p>
          <button
            type="button"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-white hover:bg-white/20"
            onClick={() => setCallChrome('expanded')}
            aria-label="Expand call"
            title="Expand call"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      ) : (
        <div className="border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{activeCall.peerName || 'Care team'}</p>
            <p className="truncate text-[11px] text-white/65">
              {activeCall.status === 'ringing' ? 'Calling…' : 'In call'}
            </p>
          </div>
        </div>
      )}
      <div className={cn(minimized ? 'p-0' : 'mx-auto max-w-5xl space-y-3 p-4')}>
        <VideoStage
          call={withCallPeerAvatar(activeCall, users, dietitians, applications)}
          selfName={currentUser?.name}
          selfAvatar={accountAvatar(currentUser, dietitians, applications)}
          compact={minimized}
          onEnd={endCall}
          chromeControl={
            minimized ? null : (
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 hover:bg-black/75"
                onClick={() => setCallChrome('minimized')}
                aria-label="Minimize call"
                title="Minimize call"
              >
                <Minimize2 size={16} />
              </button>
            )
          }
        />
        {playbackBlocked && !minimized ? (
          <button
            type="button"
            className="m-3 w-[calc(100%-1.5rem)] rounded-xl bg-[#0E3E77] px-3 py-2 text-sm font-semibold text-white"
            onClick={playRemoteAudio}
          >
            Enable call audio
          </button>
        ) : null}
        {playbackBlocked && minimized ? (
          <button
            type="button"
            className="w-full bg-[#0E3E77] px-2 py-1 text-[10px] font-semibold text-white"
            onClick={playRemoteAudio}
          >
            Enable audio
          </button>
        ) : null}
      </div>
    </div>
  )
}
