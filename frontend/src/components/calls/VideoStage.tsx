import { ChevronDown, ChevronUp, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
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
  const { localStream, remoteStream, mediaError, muted, cameraOff, remoteCameraOff, setMuted, setCameraOff, runWithLocalMedia, preparingCall, devices, selectDevice } = useCallMedia()
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

  // Reset device panel when leaving compact / ending session.
  useEffect(() => {
    if (compact || !inSession) setDevicesOpen(false)
  }, [compact, inSession])

  const statusLabel = incoming
    ? 'Incoming call'
    : remoteStream
      ? remoteOn ? 'Live video consult' : 'Live audio consult'
      : live || ringing
        ? 'Connecting video…'
        : 'Video call'

  return (
    <section className={cn('flex flex-col overflow-hidden bg-[#0c121c]', compact ? 'rounded-none' : 'min-h-[520px] rounded-lg')} aria-label="Video call">
      <div className={cn('relative bg-[#0c121c]', compact ? 'h-36 min-h-36 flex-none' : 'min-h-[360px] flex-1')}>
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
        ) : null}
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

      {/* Device pickers stay collapsed by default; hidden entirely in Meet-style PiP. */}
      {inSession && !compact ? (
        <div className="bg-[#082A54] px-3 pt-2 text-xs text-white">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left font-medium text-white/90 hover:bg-white/10"
            onClick={() => setDevicesOpen((open) => !open)}
            aria-expanded={devicesOpen}
          >
            <span>Mic & camera devices</span>
            {devicesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {devicesOpen ? (
            <div className="grid gap-2 pb-2 pt-1">
              {(['audioinput', 'videoinput'] as const).map((kind) => (
                <label key={kind}>
                  {kind === 'audioinput' ? 'Microphone' : 'Camera'}
                  <select
                    aria-label={kind === 'audioinput' ? 'Microphone' : 'Camera'}
                    className="mt-1 w-full rounded border border-white/30 bg-[#082A54] p-2 text-white"
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
          ) : null}
        </div>
      ) : null}

      <div className={cn('flex items-center justify-center bg-[#082A54]', compact ? 'gap-1.5 px-1.5 py-1.5' : 'gap-3 px-4 py-4')}>
        {inSession ? (
          <>
            <button
              className={cn('grid place-items-center rounded-full bg-white/10 text-white', compact ? 'h-7 w-7' : 'h-11 w-11')}
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <MicOff size={compact ? 12 : 18} /> : <Mic size={compact ? 12 : 18} />}
            </button>
            <button
              className={cn('grid place-items-center rounded-full bg-destructive text-white', compact ? 'h-8 w-8' : 'h-12 w-12')}
              onClick={onEnd}
              aria-label="End call"
            >
              <PhoneOff size={compact ? 12 : 18} />
            </button>
            <button
              className={cn('grid place-items-center rounded-full bg-white/10 text-white', compact ? 'h-7 w-7' : 'h-11 w-11')}
              onClick={() => setCameraOff(!cameraOff)}
              aria-label={cameraOff ? 'Camera on' : 'Camera off'}
            >
              {cameraOff ? <VideoOff size={compact ? 12 : 18} /> : <Video size={compact ? 12 : 18} />}
            </button>
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
