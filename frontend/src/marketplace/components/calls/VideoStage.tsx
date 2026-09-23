import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { useCallMedia } from '../../lib/callMedia'
import type { VideoCallState } from '../../types'
import { cn } from '../../lib/utils'

function attachStream(node: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!node) return
  if (node.srcObject !== stream) node.srcObject = stream
  if (stream) void node.play().catch(() => undefined)
}

export function VideoStage({
  call,
  selfAvatar,
  selfName,
  compact = false,
  onEnd,
  onStart,
  onAnswer,
}: {
  call: VideoCallState | null
  selfAvatar?: string
  selfName?: string
  compact?: boolean
  onEnd: () => void
  onStart?: () => void
  onAnswer?: () => void
}) {
  const { localStream, remoteStream, mediaError, muted, cameraOff, setMuted, setCameraOff, ensureLocalMedia } = useCallMedia()
  const remoteRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)
  const live = call?.status === 'live'
  const ringing = call?.status === 'ringing' && !call.incoming
  const incoming = Boolean(call?.incoming)
  const inSession = Boolean(call) && !incoming
  const remoteOn = Boolean(remoteStream?.getVideoTracks().some((track) => track.readyState === 'live' || track.enabled))
  const localOn = Boolean(localStream) && !cameraOff

  useEffect(() => {
    attachStream(remoteRef.current, remoteStream)
  }, [remoteStream])

  useEffect(() => {
    attachStream(localRef.current, cameraOff ? null : localStream)
  }, [localStream, cameraOff])

  const statusLabel = incoming
    ? 'Incoming call'
    : remoteOn
      ? 'Live video consult'
      : live || ringing
        ? 'Connecting video…'
        : 'Video call'

  return (
    <section className={cn('flex flex-col overflow-hidden bg-ink', compact ? 'rounded-lg' : 'min-h-[520px] rounded-lg')} aria-label="Video call">
      <div className={cn('relative flex-1 bg-night', compact ? 'h-52' : 'min-h-[360px]')}>
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className={cn('h-full w-full object-cover', remoteOn ? 'block' : 'hidden')}
          aria-label={`${call?.peerName ?? 'Peer'} video`}
        />
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className={
            remoteOn
              ? 'absolute bottom-4 right-4 h-24 w-20 rounded-xl bg-black object-cover ring-2 ring-white/70'
              : cn('h-full w-full object-cover', localOn ? 'block' : 'hidden')
          }
          aria-label={`${selfName ?? 'You'} camera`}
        />
        {!remoteOn && !localOn ? (
          call?.peerAvatar ? (
            <img src={call.peerAvatar} alt="" className="h-full w-full object-cover opacity-90" />
          ) : (
            <div className="grid h-full min-h-[12rem] place-items-center px-4 text-center text-sm text-white/70">
              {mediaError ?? (incoming ? call?.peerName : 'Your camera will show here')}
            </div>
          )
        ) : null}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-4 text-white">
          <p className="text-sm font-bold">{statusLabel}</p>
          <p className="text-xs text-white/80">{call?.peerName}</p>
          {mediaError ? <p className="mt-1 text-xs text-red-200">{mediaError}</p> : null}
        </div>
        {selfAvatar && !localOn ? (
          <img
            src={selfAvatar}
            alt=""
            className="absolute bottom-4 right-4 h-20 w-16 rounded-xl object-cover ring-2 ring-white/70"
          />
        ) : null}
        {muted && inSession ? (
          <span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">Muted</span>
        ) : null}
      </div>
      <div className="flex items-center justify-center gap-3 bg-[#082A54] px-4 py-4">
        {inSession ? (
          <>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              className="grid h-12 w-12 place-items-center rounded-full bg-destructive text-white"
              onClick={onEnd}
              aria-label="End call"
            >
              <PhoneOff size={18} />
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"
              onClick={() => setCameraOff(!cameraOff)}
              aria-label={cameraOff ? 'Camera on' : 'Camera off'}
            >
              {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
          </>
        ) : incoming ? (
          <>
            <Button onClick={() => void ensureLocalMedia().finally(() => onAnswer?.())}>Answer</Button>
            <Button variant="danger" onClick={onEnd}>
              Decline
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              void ensureLocalMedia().finally(() => onStart?.())
            }}
            disabled={!onStart}
          >
            <Video size={16} /> Start video call
          </Button>
        )}
      </div>
    </section>
  )
}
