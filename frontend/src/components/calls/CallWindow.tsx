import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { VideoStage } from './VideoStage'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { cn } from '@/lib/care/utils'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { withCallPeerAvatar } from '@/lib/care/calls'

type PipPos = { left: number; top: number }

const PIP_WIDTH = 220
const PIP_MARGIN = 8

function defaultPipPos(): PipPos {
  if (typeof window === 'undefined') return { left: 24, top: 24 }
  const width = Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
  return {
    left: Math.max(PIP_MARGIN, window.innerWidth - width - PIP_MARGIN),
    top: Math.max(PIP_MARGIN, window.innerHeight - 320 - PIP_MARGIN),
  }
}

function clampPipPos(pos: PipPos, el: HTMLElement | null): PipPos {
  if (typeof window === 'undefined') return pos
  const width = el?.offsetWidth || Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
  const height = el?.offsetHeight || 280
  const maxLeft = Math.max(PIP_MARGIN, window.innerWidth - width - PIP_MARGIN)
  const maxTop = Math.max(PIP_MARGIN, window.innerHeight - height - PIP_MARGIN)
  return {
    left: Math.min(maxLeft, Math.max(PIP_MARGIN, pos.left)),
    top: Math.min(maxTop, Math.max(PIP_MARGIN, pos.top)),
  }
}

/** In-app call chrome: full-screen or floating Meet-style PiP (free drag + device menu). */
export function CallWindow() {
  const { activeCall, currentUser, users, dietitians, applications, endCall } = useApp()
  const { playbackBlocked, playRemoteAudio, callChrome, setCallChrome } = useCallMedia()
  const shellRef = useRef<HTMLDivElement>(null)
  const [pipPos, setPipPos] = useState<PipPos>(() => defaultPipPos())
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
  } | null>(null)

  const reclamp = useCallback(() => {
    setPipPos((prev) => clampPipPos(prev, shellRef.current))
  }, [])

  useEffect(() => {
    if (callChrome === 'minimized') {
      setPipPos(defaultPipPos())
      // Reclamp after layout so height is known.
      requestAnimationFrame(() => reclamp())
    }
  }, [callChrome, reclamp])

  useEffect(() => {
    if (callChrome !== 'minimized') return
    const onResize = () => reclamp()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [callChrome, reclamp])

  if (!activeCall || activeCall.incoming) return null

  const minimized = callChrome === 'minimized'

  function onDragPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!minimized) return
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, label')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: pipPos.left,
      originTop: pipPos.top,
    }
  }

  function onDragPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const next = {
      left: drag.originLeft + (event.clientX - drag.startX),
      top: drag.originTop + (event.clientY - drag.startY),
    }
    setPipPos(clampPipPos(next, shellRef.current))
  }

  function onDragPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        // Do not use marketplace-root here — it forces cream/ink and washes out call controls.
        'fixed z-[90] overflow-visible bg-[#0c121c] text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
        minimized
          ? 'w-[min(13.75rem,calc(100vw-1rem))] rounded-2xl border border-white/20'
          : 'inset-0 overflow-hidden rounded-none',
      )}
      style={
        minimized
          ? {
              minHeight: 0,
              left: pipPos.left,
              top: pipPos.top,
              right: 'auto',
              bottom: 'auto',
              touchAction: 'none',
              backgroundColor: '#0c121c',
              color: '#ffffff',
            }
          : { backgroundColor: '#0c121c', color: '#ffffff' }
      }
      role="dialog"
      aria-modal={!minimized}
      aria-label="Call window"
      onPointerDown={minimized ? onDragPointerDown : undefined}
      onPointerMove={minimized ? onDragPointerMove : undefined}
      onPointerUp={minimized ? onDragPointerUp : undefined}
      onPointerCancel={minimized ? onDragPointerUp : undefined}
    >
      {minimized ? (
        <div className="flex cursor-grab items-center gap-1 border-b border-white/10 bg-[#0c121c] px-2 py-1.5 active:cursor-grabbing select-none">
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">
            {activeCall.status === 'ringing' ? 'Calling…' : activeCall.peerName || 'In call'}
          </p>
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-[#0c121c] hover:bg-white/90"
            onClick={() => setCallChrome('expanded')}
            aria-label="Expand call"
            title="Expand call"
          >
            <Maximize2 size={13} strokeWidth={2.5} />
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
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#0c121c] shadow-md ring-1 ring-black/15 hover:bg-white/90"
                onClick={() => setCallChrome('minimized')}
                aria-label="Minimize call"
                title="Minimize call"
              >
                <Minimize2 size={16} strokeWidth={2.5} />
              </button>
            )
          }
        />
        {playbackBlocked ? (
          <button
            type="button"
            className={cn(
              'font-semibold text-white',
              minimized
                ? 'w-full bg-[#0E3E77] px-2 py-1.5 text-[10px]'
                : 'm-3 w-[calc(100%-1.5rem)] rounded-xl bg-[#0E3E77] px-3 py-2 text-sm',
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
