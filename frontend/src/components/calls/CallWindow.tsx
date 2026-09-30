import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { VideoStage } from './VideoStage'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { cn } from '@/lib/care/utils'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { withCallPeerAvatar } from '@/lib/care/calls'

type PipPos = { left: number; top: number }

const EDGE = 8

function clampPos(next: PipPos, width: number, height: number): PipPos {
  if (typeof window === 'undefined') return next
  const maxLeft = Math.max(EDGE, window.innerWidth - width - EDGE)
  const maxTop = Math.max(EDGE, window.innerHeight - height - EDGE)
  return {
    left: Math.min(maxLeft, Math.max(EDGE, next.left)),
    top: Math.min(maxTop, Math.max(EDGE, next.top)),
  }
}

/** In-app call chrome: full-screen or floating Meet-style PiP on the same page. */
export function CallWindow() {
  const { activeCall, currentUser, users, dietitians, applications, endCall } = useApp()
  const { playbackBlocked, playRemoteAudio, callChrome, setCallChrome } = useCallMedia()
  const shellRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<PipPos | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
  } | null>(null)

  const minimized = callChrome === 'minimized'

  const reclampPip = useCallback(() => {
    if (!shellRef.current) return
    setPos((current) => {
      if (!current || !shellRef.current) return current
      return clampPos(current, shellRef.current.offsetWidth, shellRef.current.offsetHeight)
    })
  }, [])

  // Place PiP in the bottom-right when minimizing; clear when expanding.
  useLayoutEffect(() => {
    if (!minimized) {
      setPos(null)
      return
    }
    const place = () => {
      const el = shellRef.current
      if (!el || typeof window === 'undefined') return
      const width = el.offsetWidth || 184
      const height = el.offsetHeight || 220
      setPos({
        left: Math.max(EDGE, window.innerWidth - width - EDGE),
        top: Math.max(EDGE, window.innerHeight - height - EDGE),
      })
    }
    place()
    const id = window.requestAnimationFrame(place)
    return () => window.cancelAnimationFrame(id)
  }, [minimized])

  // Keep the floating tab on-screen when the viewport resizes.
  useEffect(() => {
    if (!minimized) return
    const onResize = () => reclampPip()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [minimized, reclampPip])

  function onDragPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!minimized || !pos) return
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, label')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: pos.left,
      originTop: pos.top,
    }
  }

  function onDragPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const el = shellRef.current
    const width = el?.offsetWidth || 184
    const height = el?.offsetHeight || 220
    setPos(
      clampPos(
        {
          left: drag.originLeft + (event.clientX - drag.startX),
          top: drag.originTop + (event.clientY - drag.startY),
        },
        width,
        height,
      ),
    )
  }

  function onDragPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  if (!activeCall || activeCall.incoming) return null

  return (
    <div
      ref={shellRef}
      className={cn(
        'marketplace-root fixed z-[90] bg-[#0c121c] text-white shadow-elevated',
        minimized
          ? 'w-[min(13.5rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-white/20'
          : 'inset-0 overflow-y-auto overflow-x-hidden',
      )}
      style={
        minimized && pos
          ? {
              left: pos.left,
              top: pos.top,
              right: 'auto',
              bottom: 'auto',
              minHeight: 0,
              touchAction: 'none',
            }
          : minimized
            ? { bottom: EDGE, right: EDGE, minHeight: 0, touchAction: 'none' }
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
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/10 text-white hover:bg-white/20"
            onClick={() => setCallChrome('expanded')}
            aria-label="Expand call"
            title="Expand call"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      ) : (
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0c121c]/95 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">{activeCall.peerName || 'Care team'}</p>
            <p className="truncate text-[11px] text-white/65">
              {activeCall.status === 'ringing' ? 'Calling…' : 'In call'}
            </p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
            onClick={() => setCallChrome('minimized')}
            aria-label="Minimize call"
            title="Minimize call"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      )}
      <div className={cn(minimized ? 'p-0' : 'mx-auto w-full max-w-5xl space-y-3 p-3 sm:p-4')}>
        <VideoStage
          call={withCallPeerAvatar(activeCall, users, dietitians, applications)}
          selfName={currentUser?.name}
          selfAvatar={accountAvatar(currentUser, dietitians, applications)}
          compact={minimized}
          onEnd={endCall}
          onDevicesLayout={minimized ? reclampPip : undefined}
        />
        {playbackBlocked ? (
          <button
            type="button"
            className={cn(
              'font-semibold text-white',
              minimized
                ? 'w-full bg-[#0E3E77] px-2 py-1 text-[10px]'
                : 'w-full rounded-xl bg-[#0E3E77] px-3 py-2 text-sm sm:w-auto',
            )}
            onClick={playRemoteAudio}
          >
            {minimized ? 'Enable audio' : 'Enable call audio'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
