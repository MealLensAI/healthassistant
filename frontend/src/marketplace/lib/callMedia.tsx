import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../context'
import { apiEnabled, fetchCallSignal, postCallSignal, type CallSignal } from './api'
import { uid } from './utils'

type CallMediaValue = {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  mediaError: string | null
  muted: boolean
  cameraOff: boolean
  setMuted: (value: boolean) => void
  setCameraOff: (value: boolean) => void
  ensureLocalMedia: () => Promise<MediaStream | null>
}

const CallMediaContext = createContext<CallMediaValue>({
  localStream: null,
  remoteStream: null,
  mediaError: null,
  muted: false,
  cameraOff: false,
  setMuted: () => undefined,
  setCameraOff: () => undefined,
  ensureLocalMedia: async () => null,
})

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
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
    return navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  }
}

export function CallMediaProvider({ children }: { children: ReactNode }) {
  const { activeCall, currentUser, liveCalls } = useApp()
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const localRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const appliedIce = useRef(new Set<string>())
  const makingOffer = useRef(false)
  const makingAnswer = useRef(false)

  const callId = activeCall?.callId
  const userId = currentUser?.id
  const isCaller = Boolean(userId && liveCalls.some((item) => item.id === callId && item.callerId === userId))
  const inCall = Boolean(activeCall && !activeCall.incoming)

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
  }, [localStream, muted])

  useEffect(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !cameraOff
    })
  }, [localStream, cameraOff])

  useEffect(() => {
    if (!inCall || !callId || !userId || typeof RTCPeerConnection === 'undefined') {
      return
    }

    let cancelled = false
    const pendingIce: NonNullable<CallSignal['ice']> = []
    const channel = !apiEnabled() && 'BroadcastChannel' in window ? new BroadcastChannel('meallensai.call') : null

    async function publish(payload: Parameters<typeof postCallSignal>[1]) {
      if (apiEnabled()) {
        await postCallSignal(callId!, payload)
        return
      }
      channel?.postMessage({ callId, fromId: userId, ...payload })
    }

    async function applyRemoteIce(pc: RTCPeerConnection, items: CallSignal['ice'] = []) {
      for (const item of items) {
        if (!item?.id || item.fromId === userId || appliedIce.current.has(item.id)) continue
        if (!pc.remoteDescription) {
          pendingIce.push(item)
          continue
        }
        appliedIce.current.add(item.id)
        try {
          await pc.addIceCandidate(new RTCIceCandidate(item.candidate as RTCIceCandidateInit))
        } catch {
          appliedIce.current.delete(item.id)
        }
      }
    }

    async function flushIce(pc: RTCPeerConnection) {
      const queued = pendingIce.splice(0, pendingIce.length)
      await applyRemoteIce(pc, queued)
    }

    async function ingest(signal: Partial<CallSignal>) {
      const pc = peerRef.current
      if (!pc || cancelled) return
      if (signal.offer && !isCaller && pc.signalingState === 'stable' && !pc.currentRemoteDescription && !makingAnswer.current) {
        makingAnswer.current = true
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer as RTCSessionDescriptionInit))
          await flushIce(pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await publish({ answer: { type: answer.type, sdp: answer.sdp ?? '' } })
        } finally {
          makingAnswer.current = false
        }
      }
      if (signal.answer && isCaller && pc.signalingState === 'have-local-offer' && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer as RTCSessionDescriptionInit))
        await flushIce(pc)
      }
      await applyRemoteIce(pc, signal.ice)
    }

    void (async () => {
      try {
        const stream = localRef.current ?? (await getCallMedia())
        if (cancelled) {
          if (!localRef.current) stream.getTracks().forEach((track) => track.stop())
          return
        }
        localRef.current = stream
        setLocalStream(stream)
        setMediaError(null)

        const pc = new RTCPeerConnection(ICE_SERVERS)
        peerRef.current = pc
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
        const inbound = new MediaStream()
        pc.ontrack = (event) => {
          const track = event.track
          if (!inbound.getTracks().some((item) => item.id === track.id)) inbound.addTrack(track)
          setRemoteStream(new MediaStream(inbound.getTracks()))
        }
        pc.onicecandidate = (event) => {
          if (!event.candidate) return
          void publish({
            ice: {
              id: uid('ice'),
              fromId: userId,
              candidate: event.candidate.toJSON() as Record<string, unknown>,
            },
          })
        }

        if (isCaller && !makingOffer.current) {
          makingOffer.current = true
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          await pc.setLocalDescription(offer)
          await publish({ offer: { type: offer.type, sdp: offer.sdp ?? '' } })
        } else if (apiEnabled()) {
          void fetchCallSignal(callId).then((signal) => ingest(signal)).catch(() => undefined)
        }
      } catch {
        if (!cancelled) setMediaError('Allow camera and microphone so both of you can see and hear each other.')
      }
    })()

    const poll = window.setInterval(() => {
      if (!apiEnabled()) return
      void fetchCallSignal(callId)
        .then((signal) => ingest(signal))
        .catch(() => undefined)
    }, 400)

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
      window.clearInterval(poll)
      channel?.removeEventListener('message', onMessage)
      channel?.close()
      makingOffer.current = false
      makingAnswer.current = false
      appliedIce.current.clear()
      peerRef.current?.close()
      peerRef.current = null
      setRemoteStream(null)
    }
  }, [callId, inCall, isCaller, userId])

  useEffect(() => {
    if (inCall) return
    setMuted(false)
    setCameraOff(false)
    setMediaError(null)
    localRef.current?.getTracks().forEach((track) => track.stop())
    localRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
  }, [inCall])

  const ensureLocalMedia = async () => {
    if (localRef.current) return localRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('This browser cannot open a camera.')
      return null
    }
    try {
      const stream = await getCallMedia()
      localRef.current = stream
      setLocalStream(stream)
      setMediaError(null)
      return stream
    } catch {
      setMediaError('Allow camera and microphone so both of you can see and hear each other.')
      return null
    }
  }

  const value = {
    localStream,
    remoteStream,
    mediaError,
    muted,
    cameraOff,
    setMuted,
    setCameraOff,
    ensureLocalMedia,
  }

  return <CallMediaContext.Provider value={value}>{children}</CallMediaContext.Provider>
}

export function useCallMedia() {
  return useContext(CallMediaContext)
}
