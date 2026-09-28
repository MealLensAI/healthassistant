import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '@/lib/care/context'
import { apiEnabled, fetchCallSignal, postCallSignal, type CallSignal } from '@/lib/care/api'
import { CallRingtone } from '@/lib/care/ringtone'
import { CallWindow } from '@/components/calls/CallWindow'
import { uid } from '@/lib/care/utils'
import { CALL_CONTROL_CHANNEL, CallControls, hasLiveVideo, subscribeLocalCallEnded } from '@/lib/care/callControls'
import { CallMediaContext, type CallMediaValue, type CallChrome } from '@/lib/care/callMediaContext'

/** STUN + optional private TURN + public relay so peers behind NAT still connect. */
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(import.meta.env.VITE_TURN_URL
      ? [
          {
            urls: String(import.meta.env.VITE_TURN_URL).split(','),
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
        ]
      : [
          // Demo relay — replace with your own TURN in production via VITE_TURN_*.
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp',
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ]),
  ],
  iceCandidatePoolSize: 4,
}

async function getCallMedia() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot open a camera.')
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    })
  } catch {
    // A missing or unavailable camera must not prevent an audio consultation.
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  }
}

export function CallMediaProvider({ children }: { children: ReactNode }) {
  const { activeCall, currentUser, liveCalls, dismissCall } = useApp()
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [remoteCameraOff, setRemoteCameraOff] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [callChrome, setCallChrome] = useState<CallChrome>('expanded')
  const [preparingCall, setPreparingCall] = useState(false)
  const preparingCallRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaPromise = useRef<Promise<MediaStream> | null>(null)
  const localRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const controlsRef = useRef<CallControls | null>(null)
  const appliedIce = useRef(new Set<string>())
  const makingOffer = useRef(false)
  const makingAnswer = useRef(false)
  /** Stable for the life of a callId — avoids tearing down PC when pulse flickers liveCalls. */
  const roleRef = useRef<'caller' | 'callee' | null>(null)

  const callId = activeCall?.callId
  const userId = currentUser?.id
  const inCall = Boolean(activeCall && !activeCall.incoming)

  const playRemoteAudio = () => {
    const audio = audioRef.current
    if (audio?.srcObject) void audio.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true))
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.srcObject = remoteStream
    playRemoteAudio()
  }, [remoteStream])

  useEffect(() => {
    const refresh = () => {
      void navigator.mediaDevices?.enumerateDevices().then(setDevices).catch(() => undefined)
    }
    refresh()
    navigator.mediaDevices?.addEventListener('devicechange', refresh)
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refresh)
  }, [localStream])

  const ringtoneRef = useRef<CallRingtone | null>(null)
  const [ringtoneBlocked, setRingtoneBlocked] = useState(false)
  const enableCallSounds = () => {
    ringtoneRef.current ??= new CallRingtone()
    void ringtoneRef.current.unlock().then((ready) => setRingtoneBlocked(!ready)).catch(() => setRingtoneBlocked(true))
  }

  useEffect(() => {
    document.addEventListener('pointerdown', enableCallSounds)
    document.addEventListener('keydown', enableCallSounds)
    return () => {
      document.removeEventListener('pointerdown', enableCallSounds)
      document.removeEventListener('keydown', enableCallSounds)
      ringtoneRef.current?.dispose()
      ringtoneRef.current = null
    }
  }, [])

  useEffect(() => {
    ringtoneRef.current ??= new CallRingtone()
    const ringtone = ringtoneRef.current
    if (activeCall?.incoming) setRingtoneBlocked(!ringtone.start())
    else {
      ringtone.stop()
      setRingtoneBlocked(false)
    }
    return () => ringtone.stop()
  }, [activeCall?.incoming, callId])

  // Reset chrome when a new call starts.
  useEffect(() => {
    if (callId) setCallChrome('expanded')
  }, [callId])

  const acquireMedia = () => {
    if (!mediaPromise.current) {
      mediaPromise.current = getCallMedia().finally(() => {
        mediaPromise.current = null
      })
    }
    return mediaPromise.current
  }

  const selectDevice = async (kind: 'audioinput' | 'videoinput', deviceId: string) => {
    let replacement: MediaStream | null = null
    try {
      replacement = await navigator.mediaDevices.getUserMedia(
        kind === 'audioinput'
          ? { audio: { deviceId: { exact: deviceId } }, video: false }
          : { audio: false, video: { deviceId: { exact: deviceId } } },
      )
      const track = replacement.getTracks()[0]
      track.enabled = kind === 'audioinput' ? !muted : !cameraOff
      const old = localRef.current?.getTracks().find((item) => item.kind === track.kind)
      const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === track.kind)
      if (sender) await sender.replaceTrack(track)
      else if (peerRef.current) {
        replacement.getTracks().forEach((item) => item.stop())
        throw new Error('Restart the call to enable a camera that was unavailable when it started.')
      }
      const next = new MediaStream([
        ...(localRef.current?.getTracks().filter((item) => item.kind !== track.kind) ?? []),
        track,
      ])
      localRef.current = next
      setLocalStream(next)
      old?.stop()
      setMediaError(null)
    } catch (error) {
      replacement?.getTracks().forEach((track) => track.stop())
      setMediaError(error instanceof Error ? error.message : 'Could not switch device.')
    }
  }

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
  }, [localStream, muted])

  useEffect(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !cameraOff
    })
    const updateCamera = () => controlsRef.current?.setCamera(!cameraOff && hasLiveVideo(localStream))
    const tracks = localStream?.getVideoTracks() ?? []
    updateCamera()
    tracks.forEach((track) => {
      track.addEventListener('ended', updateCamera)
      track.addEventListener('mute', updateCamera)
      track.addEventListener('unmute', updateCamera)
    })
    return () => tracks.forEach((track) => {
      track.removeEventListener('ended', updateCamera)
      track.removeEventListener('mute', updateCamera)
      track.removeEventListener('unmute', updateCamera)
    })
  }, [localStream, cameraOff])

  useEffect(() => {
    if (!inCall || !callId || !userId || typeof RTCPeerConnection === 'undefined') {
      roleRef.current = null
      return
    }

    // Resolve role once per callId so pulse/liveCalls flicker cannot recreate the PC.
    if (!roleRef.current) {
      const fromLive = liveCalls.find((item) => item.id === callId)
      if (fromLive) {
        roleRef.current = fromLive.callerId === userId ? 'caller' : 'callee'
      } else if (activeCall && !activeCall.incoming) {
        // Optimistic START_CALL: local user is the caller until liveCalls catches up.
        roleRef.current = 'caller'
      } else {
        roleRef.current = 'callee'
      }
    }
    const isCaller = roleRef.current === 'caller'

    let cancelled = false
    const iceApplied = appliedIce.current
    let polling = false
    let peer: RTCPeerConnection | null = null
    let mediaConnected = false
    let connectedOnce = false
    let ended = false
    let lastPollAt = 0
    let failureTimer: number | undefined
    const finishRemoteCall = () => {
      if (cancelled || ended) return
      ended = true
      setMediaError(null)
      dismissCall(callId)
    }
    const controls = new CallControls(callId, (enabled) => {
      if (!cancelled && !ended) setRemoteCameraOff(!enabled)
    }, finishRemoteCall)
    controlsRef.current = controls
    setRemoteCameraOff(false)
    const unsubscribeHangup = subscribeLocalCallEnded((endedId) => {
      if (endedId !== callId) return
      ended = true
      controls.hangup()
      setMediaError(null)
    })
    const pendingIce: NonNullable<CallSignal['ice']> = []
    const outboundIce: NonNullable<CallSignal['ice']> = []
    let iceFlushTimer: number | undefined
    const channel = !apiEnabled() && 'BroadcastChannel' in window ? new BroadcastChannel('meallensai.call') : null

    async function publish(payload: Parameters<typeof postCallSignal>[1], { critical = false } = {}) {
      if (!apiEnabled()) {
        channel?.postMessage({ callId, fromId: userId, ...payload })
        return
      }
      try {
        await postCallSignal(callId!, payload)
      } catch (error) {
        // Call already torn down — ignore leftover ICE.
        const message = error instanceof Error ? error.message : ''
        if (message.includes('Call not found') || message.includes('404')) return
        if (!critical && mediaConnected) return
        throw error
      }
    }

    async function flushOutboundIce() {
      if (!outboundIce.length || cancelled) return
      const batch = outboundIce.splice(0, outboundIce.length)
      try {
        await publish({ ice: batch })
      } catch {
        // Re-queue once; never panic the UI if media is already flowing.
        outboundIce.unshift(...batch)
        if (!cancelled && !mediaConnected) {
          setMediaError('Reconnecting call signaling…')
        }
      }
    }

    function queueOutboundIce(item: NonNullable<CallSignal['ice']>[number]) {
      if (mediaConnected) return // Peer path is up; stop flooding the server.
      outboundIce.push(item)
      if (iceFlushTimer != null) return
      iceFlushTimer = window.setTimeout(() => {
        iceFlushTimer = undefined
        void flushOutboundIce()
      }, 280)
    }

    async function applyRemoteIce(pc: RTCPeerConnection, items: CallSignal['ice'] = []) {
      for (const item of items) {
        if (!item?.id || item.fromId === userId || iceApplied.has(item.id)) continue
        if (!pc.remoteDescription) {
          pendingIce.push(item)
          continue
        }
        iceApplied.add(item.id)
        try {
          const init = item.candidate as RTCIceCandidateInit
          if (init && (init.candidate || init.sdpMid != null || init.sdpMLineIndex != null)) {
            await pc.addIceCandidate(new RTCIceCandidate(init))
          }
        } catch {
          iceApplied.delete(item.id)
        }
      }
    }

    async function flushIce(pc: RTCPeerConnection) {
      const queued = pendingIce.splice(0, pendingIce.length)
      await applyRemoteIce(pc, queued)
    }

    async function ingest(signal: Partial<CallSignal>) {
      const pc = peerRef.current
      if (!pc || cancelled || ended) return

      if (
        signal.offer &&
        !isCaller &&
        !makingAnswer.current &&
        (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') &&
        !pc.currentRemoteDescription
      ) {
        makingAnswer.current = true
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer as RTCSessionDescriptionInit))
          await flushIce(pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await publish({ answer: { type: answer.type, sdp: answer.sdp ?? '' } }, { critical: true })
          setMediaError(null)
        } catch (error) {
          if (!cancelled) {
            setMediaError(error instanceof Error ? error.message : 'Could not accept the call media offer.')
          }
        } finally {
          makingAnswer.current = false
        }
      }

      if (
        signal.answer &&
        isCaller &&
        pc.signalingState === 'have-local-offer' &&
        !pc.currentRemoteDescription
      ) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer as RTCSessionDescriptionInit))
          await flushIce(pc)
          setMediaError(null)
        } catch (error) {
          if (!cancelled) {
            setMediaError(error instanceof Error ? error.message : 'Could not complete the call handshake.')
          }
        }
      }

      await applyRemoteIce(pc, signal.ice)
    }

    void (async () => {
      try {
        const stream = localRef.current ?? (await acquireMedia())
        if (cancelled) {
          if (!localRef.current) stream.getTracks().forEach((track) => track.stop())
          return
        }
        localRef.current = stream
        setLocalStream(stream)
        controls.setCamera(hasLiveVideo(stream))
        setMediaError(null)

        const pc = new RTCPeerConnection(ICE_SERVERS)
        peer = pc
        peerRef.current = pc

        // The caller creates this before its SDP offer so SCTP is negotiated.
        // Camera toggles then arrive immediately without a database round trip.
        if (isCaller) controls.attach(pc.createDataChannel(CALL_CONTROL_CHANNEL))
        else pc.ondatachannel = (event) => {
          if (!cancelled && !ended && event.channel.label === CALL_CONTROL_CHANNEL) controls.attach(event.channel)
        }

        pc.onconnectionstatechange = () => {
          if (cancelled || ended) return
          if (failureTimer != null) window.clearTimeout(failureTimer)
          if (pc.connectionState === 'failed') {
            mediaConnected = false
            // A peer closing normally can precede the server's end notification.
            // Give that notification/pulse time to dismiss the call first.
            failureTimer = window.setTimeout(() => {
              if (!cancelled && !ended && pc.connectionState === 'failed') {
                setMediaError('Connection failed. Check camera permissions or try another network.')
              }
            }, 3000)
            // ICE restart can recover some NAT failures without a full re-call.
            if (isCaller && pc.restartIce) {
              try {
                pc.restartIce()
              } catch {
                /* ignore */
              }
            }
          } else if (pc.connectionState === 'connected') {
            mediaConnected = true
            connectedOnce = true
            outboundIce.length = 0
            setMediaError(null)
          }
        }

        // Prefer addTrack so both sides negotiate sendrecv A/V.
        const kinds = new Set(stream.getTracks().map((track) => track.kind))
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
        if (!kinds.has('audio')) pc.addTransceiver('audio', { direction: 'recvonly' })
        if (!kinds.has('video')) pc.addTransceiver('video', { direction: 'recvonly' })

        const inbound = new MediaStream()
        pc.ontrack = (event) => {
          const track = event.track
          const refreshRemote = () => {
            if (!cancelled && !ended) setRemoteStream(new MediaStream(inbound.getTracks()))
          }
          track.onunmute = refreshRemote
          track.onmute = refreshRemote
          track.onended = refreshRemote
          if (!inbound.getTracks().some((item) => item.id === track.id)) inbound.addTrack(track)
          refreshRemote()
          playRemoteAudio()
        }

        pc.onicecandidate = (event) => {
          if (!event.candidate || cancelled) return
          queueOutboundIce({
            id: uid('ice'),
            fromId: userId,
            candidate: event.candidate.toJSON() as Record<string, unknown>,
          })
        }

        if (isCaller && !makingOffer.current) {
          makingOffer.current = true
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await pc.setLocalDescription(offer)
            await publish({ offer: { type: offer.type, sdp: offer.sdp ?? '' } }, { critical: true })
          } catch (error) {
            if (!cancelled) {
              setMediaError(error instanceof Error ? error.message : 'Could not start the call media offer.')
            }
          }
        } else if (apiEnabled()) {
          void fetchCallSignal(callId)
            .then((signal) => ingest(signal))
            .catch(() => undefined)
        }
      } catch {
        if (!cancelled) setMediaError('Allow camera and microphone so both of you can see and hear each other.')
      }
    })()

    const poll = window.setInterval(() => {
      if (!apiEnabled() || polling || ended) return
      // Keep a lightweight lifecycle fallback after media connects. Previously
      // polling stopped completely, so a missed end event stranded the call.
      if (mediaConnected && Date.now() - lastPollAt < 3000) return
      lastPollAt = Date.now()
      polling = true
      void fetchCallSignal(callId)
        .then((signal) => ingest(signal))
        .catch((error: unknown) => {
          if (connectedOnce && error instanceof Error && error.message === 'Call not found') finishRemoteCall()
        })
        .finally(() => {
          polling = false
        })
    }, 500)

    const onMessage = (event: MessageEvent) => {
      if (event.data?.callId !== callId || event.data?.fromId === userId) return
      void ingest({
        offer: event.data.offer,
        answer: event.data.answer,
        ice: event.data.ice ? (Array.isArray(event.data.ice) ? event.data.ice : [event.data.ice]) : [],
      })
    }
    channel?.addEventListener('message', onMessage)

    return () => {
      cancelled = true
      unsubscribeHangup()
      controls.dispose()
      if (controlsRef.current === controls) controlsRef.current = null
      window.clearInterval(poll)
      if (failureTimer != null) window.clearTimeout(failureTimer)
      if (iceFlushTimer != null) window.clearTimeout(iceFlushTimer)
      outboundIce.length = 0
      channel?.removeEventListener('message', onMessage)
      channel?.close()
      makingOffer.current = false
      makingAnswer.current = false
      roleRef.current = null
      iceApplied.clear()
      peer?.close()
      if (peerRef.current === peer) peerRef.current = null
      setRemoteStream(null)
      setRemoteCameraOff(false)
    }
    // Intentionally omit liveCalls/isCaller — role is locked in roleRef for this callId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, inCall, userId, dismissCall])

  useEffect(() => {
    if (inCall) return
    roleRef.current = null
    setMuted(false)
    setCameraOff(false)
    setRemoteCameraOff(false)
    setMediaError(null)
    localRef.current?.getTracks().forEach((track) => track.stop())
    localRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
  }, [inCall])

  const ensureLocalMedia = async () => {
    enableCallSounds()
    if (localRef.current) return localRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('This browser cannot open a camera.')
      return null
    }
    try {
      const stream = await acquireMedia()
      localRef.current = stream
      setLocalStream(stream)
      setMediaError(null)
      return stream
    } catch {
      setMediaError('Allow camera and microphone so both of you can see and hear each other.')
      return null
    }
  }

  const runWithLocalMedia = async (action: () => void | Promise<unknown>) => {
    // The header, sidebar and incoming banner are alternate controls for one
    // call. Lock across all of them while media/the call action is pending.
    if (preparingCallRef.current) return
    preparingCallRef.current = true
    setPreparingCall(true)
    try {
      const stream = await ensureLocalMedia()
      if (stream) await action()
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Could not connect the call. Please try again.')
    } finally {
      preparingCallRef.current = false
      setPreparingCall(false)
    }
  }

  useEffect(
    () => () => {
      localRef.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  const value: CallMediaValue = {
    localStream,
    remoteStream,
    mediaError,
    muted,
    cameraOff,
    remoteCameraOff,
    setMuted,
    setCameraOff,
    ensureLocalMedia,
    runWithLocalMedia,
    preparingCall,
    devices,
    selectDevice,
    playbackBlocked,
    playRemoteAudio,
    ringtoneBlocked,
    enableCallSounds,
    callChrome,
    setCallChrome,
  }

  return (
    <CallMediaContext.Provider value={value}>
      <audio ref={audioRef} autoPlay playsInline />
      {playbackBlocked && remoteStream ? (
        <button
          type="button"
          className="fixed bottom-4 left-4 z-[80] rounded-xl bg-blue-800 px-4 py-3 text-white"
          onClick={playRemoteAudio}
        >
          Enable call audio
        </button>
      ) : null}
      {children}
      <CallWindow />
    </CallMediaContext.Provider>
  )
}
