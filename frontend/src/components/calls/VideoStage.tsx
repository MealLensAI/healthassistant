import { MoreVertical, Mic, MicOff, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/care-ui/Button'
import { useCallMedia } from '@/lib/care/callMediaContext'
import type { VideoCallState } from '@/lib/care/types'
import { cn } from '@/lib/care/utils'
import { hasLiveVideo } from '@/lib/care/callControls'

function attachStream(node: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!node) return
  if (node.srcObject !== stream) node.srcObject = stream
  if (stream) void node.play().catch(() => undefined)
}

function useVideoAvailable(stream: MediaStream | null) {
  const [available, setAvailable] = useState(() => hasLiveVideo(stream))
  useEffect(() => {
    const update = () => setAvailable(hasLiveVideo(stream))
    const tracks = stream?.getVideoTracks() ?? []
    update()
    tracks.forEach((track) => {
      track.addEventListener('mute', update)
      track.addEventListener('unmute', update)
      track.addEventListener('ended', update)
    })
    stream?.addEventListener('addtrack', update)
    stream?.addEventListener('removetrack', update)
    return () => {
      tracks.forEach((track) => {
        track.removeEventListener('mute', update)
        track.removeEventListener('unmute', update)
        track.removeEventListener('ended', update)
      })
      stream?.removeEventListener('addtrack', update)
      stream?.removeEventListener('removetrack', update)
    }
  }, [stream])
  return available
}

function ParticipantFallback({ avatar, name, small = false, compact = false, reservePreview = false }: { avatar?: string; name: string; small?: boolean; compact?: boolean; reservePreview?: boolean }) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  return (
    <div className={cn(
      'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#182538] px-3 text-center text-white',
      !small && 'pb-4 pt-14',
      compact && reservePreview && 'pr-16',
    )} aria-label={`${name}, camera off`}>
      {avatar && avatar !== failedAvatar ? (
        <img
          src={avatar}
          alt={`${name}'s profile photo`}
          className={cn('shrink-0 rounded-full object-cover', small ? compact ? 'h-6 w-6' : 'h-12 w-12' : compact ? 'h-10 w-10' : 'h-24 w-24 sm:h-32 sm:w-32')}
          onError={() => setFailedAvatar(avatar)}
        />
      ) : null}
      <p className={cn('max-w-full break-words font-semibold', small ? 'line-clamp-2 text-[10px]' : compact ? 'line-clamp-2 text-xs' : 'text-lg sm:text-xl')}>{name}</p>
    </div>
  )
}

function DeviceMenu({
  open,
  onClose,
  compact,
}: {
  open: boolean
  onClose: () => void
  compact: boolean
}) {
  const { localStream, devices, selectDevice } = useCallMedia()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])

  if (!open) return null

  // Overlay inside the PiP so it never goes off-screen on small/mobile viewports.
  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute z-40 border border-white/20 bg-[#1a2332] p-3 text-white shadow-elevated',
        compact
          ? 'inset-x-0 bottom-0 top-auto rounded-t-xl'
          : 'bottom-[calc(100%+0.75rem)] right-3 w-72 rounded-xl',
      )}
      role="dialog"
      aria-label="Microphone and camera"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Devices</p>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close device menu"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid gap-2 text-xs">
        {(['audioinput', 'videoinput'] as const).map((kind) => (
          <label key={kind} className="block">
            <span className="font-medium text-white/85">{kind === 'audioinput' ? 'Microphone' : 'Camera'}</span>
            <select
              aria-label={kind === 'audioinput' ? 'Microphone' : 'Camera'}
              className="mt-1 w-full rounded-lg border border-white/25 bg-[#0c121c] px-2 py-2 text-white"
              value={(kind === 'audioinput' ? localStream?.getAudioTracks()[0] : localStream?.getVideoTracks()[0])?.getSettings().deviceId ?? ''}
              onChange={(event) => void selectDevice(kind, event.target.value)}
            >
              <option value="" disabled>Select a device</option>
              {devices.filter((device) => device.kind === kind).map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `${kind === 'audioinput' ? 'Microphone' : 'Camera'} ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  )
}

export function VideoStage({
  call,
  selfAvatar,
  selfName,
  compact = false,
  chromeControl,
  onEnd,
  onStart,
  onAnswer,
}: {
  call: VideoCallState | null
  selfAvatar?: string
  selfName?: string
  compact?: boolean
  /** Overlay control (e.g. expand/minimize) — bottom-left of the video frame. */
  chromeControl?: ReactNode
  onEnd: () => void | Promise<unknown>
  onStart?: () => void | Promise<unknown>
  onAnswer?: () => void | Promise<unknown>
}) {
  const { localStream, remoteStream, mediaError, muted, cameraOff, remoteCameraOff, setMuted, setCameraOff, runWithLocalMedia, preparingCall } = useCallMedia()
  const remoteRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)
  const [devicesOpen, setDevicesOpen] = useState(false)
  const live = call?.status === 'live'
  const ringing = call?.status === 'ringing' && !call.incoming
  const incoming = Boolean(call?.incoming)
  const inSession = Boolean(call) && !incoming
  const remoteVideoAvailable = useVideoAvailable(remoteStream)
  const localVideoAvailable = useVideoAvailable(localStream)
  const remoteOn = Boolean(call) && remoteVideoAvailable && !remoteCameraOff
  const localOn = localVideoAvailable && !cameraOff
  const peerName = call?.peerName?.trim() || 'Participant'
  const localName = selfName?.trim() || 'You'

  useEffect(() => {
    attachStream(remoteRef.current, remoteStream)
  }, [remoteStream])

  useEffect(() => {
    attachStream(localRef.current, cameraOff ? null : localStream)
  }, [localStream, cameraOff])

  useEffect(() => {
    if (!inSession) setDevicesOpen(false)
  }, [inSession])

  const statusLabel = incoming
    ? 'Incoming call'
    : remoteStream
      ? remoteOn ? 'Live video consult' : 'Live audio consult'
      : live || ringing
        ? 'Connecting video…'
        : 'Video call'

  const btn = compact ? 'h-8 w-8' : 'h-11 w-11'
  const icon = compact ? 14 : 18

  return (
    <section className={cn('relative flex flex-col overflow-visible bg-[#0c121c]', compact ? 'rounded-none' : 'min-h-[520px] rounded-lg')} aria-label="Video call">
      <div className={cn('relative overflow-hidden bg-[#0c121c]', compact ? 'h-40 min-h-40 flex-none' : 'min-h-[360px] flex-1')}>
        <video
          ref={remoteRef}
          muted
          autoPlay
          playsInline
          className={cn('absolute inset-0 h-full w-full object-cover', remoteOn ? 'block' : 'hidden')}
          aria-label={`${peerName} video`}
        />
        {call && !remoteOn ? (
          <ParticipantFallback avatar={call.peerAvatar} name={peerName} compact={compact} reservePreview={inSession} />
        ) : null}
        <div className={cn(
          inSession
            ? cn('absolute z-10 overflow-hidden rounded-lg ring-1 ring-white/70', compact ? 'bottom-2 right-2 h-12 w-12' : 'bottom-4 right-4 h-24 w-28 sm:h-28 sm:w-36')
            : 'absolute inset-0',
          incoming && 'hidden',
        )}>
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            className={cn('h-full w-full bg-[#182538] object-cover', localOn ? 'block' : 'hidden')}
            aria-label={`${localName} camera`}
          />
          {!localOn && <ParticipantFallback avatar={selfAvatar} name={localName} small={inSession} compact={compact} />}
        </div>
        {!compact ? (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-4 text-white">
            <p className="text-sm font-bold">{statusLabel}</p>
            <p className="text-xs text-white/80">{call?.peerName}</p>
            {mediaError ? <p className="mt-1 text-xs text-red-200">{mediaError}</p> : null}
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[70%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {peerName}
          </div>
        )}
        {chromeControl ? (
          <div className="absolute bottom-3 left-3 z-20">{chromeControl}</div>
        ) : null}
        {muted && inSession && !compact ? (
          <span
            className={cn(
              'absolute bottom-4 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white',
              chromeControl ? 'left-14' : 'left-4',
            )}
          >
            Muted
          </span>
        ) : null}
      </div>

      <div className={cn('relative flex flex-wrap items-center justify-center bg-[#202124]', compact ? 'gap-1.5 px-1.5 py-2' : 'gap-3 px-4 py-4')}>
        {inSession ? (
          <>
            <button
              type="button"
              className={cn('grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20', btn)}
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <MicOff size={icon} /> : <Mic size={icon} />}
            </button>
            <button
              type="button"
              className={cn('grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20', btn)}
              onClick={() => setCameraOff(!cameraOff)}
              aria-label={cameraOff ? 'Camera on' : 'Camera off'}
            >
              {cameraOff ? <VideoOff size={icon} /> : <Video size={icon} />}
            </button>
            <button
              type="button"
              className={cn(
                'grid place-items-center rounded-full text-white hover:bg-white/20',
                btn,
                devicesOpen ? 'bg-white/25 ring-1 ring-white/40' : 'bg-white/10',
              )}
              onClick={() => setDevicesOpen((open) => !open)}
              aria-label="More options — choose microphone and camera"
              aria-expanded={devicesOpen}
              title="Mic & camera"
            >
              <MoreVertical size={icon} />
            </button>
            <button
              type="button"
              className={cn('grid place-items-center rounded-full bg-[#ea4335] text-white hover:bg-[#d93025]', compact ? 'h-8 w-8' : 'h-12 w-12')}
              onClick={onEnd}
              aria-label="End call"
            >
              <PhoneOff size={icon} />
            </button>
            <DeviceMenu open={devicesOpen} onClose={() => setDevicesOpen(false)} compact={compact} />
          </>
        ) : incoming ? (
          <>
            <Button
              loading={preparingCall}
              disabled={!onAnswer}
              onClick={() => runWithLocalMedia(() => onAnswer?.())}
            >
              Answer
            </Button>
            <Button variant="danger" onClick={onEnd}>
              Decline
            </Button>
          </>
        ) : (
          <Button
            loading={preparingCall}
            onClick={() => runWithLocalMedia(() => onStart?.())}
            disabled={!onStart}
          >
            <Video size={16} /> Start video call
          </Button>
        )}
      </div>
    </section>
  )
}
