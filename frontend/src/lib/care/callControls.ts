/** Per-call, reliable peer messages. Track.enabled is not sent by WebRTC. */
export const CALL_CONTROL_CHANNEL = 'meallens-call-controls'

type CallControlMessage =
  | { type: 'camera'; callId: string; enabled: boolean }
  | { type: 'hangup'; callId: string }

export function hasLiveVideo(stream: MediaStream | null) {
  return Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted))
}

export class CallControls {
  private channel: RTCDataChannel | null = null
  private cameraEnabled = false
  private ended = false

  constructor(
    private readonly callId: string,
    private readonly onCamera: (enabled: boolean) => void,
    private readonly onHangup: () => void,
  ) {}

  attach(channel: RTCDataChannel) {
    this.detach()
    this.channel = channel
    channel.addEventListener('open', this.sendCamera)
    channel.addEventListener('message', this.receive)
    // Also covers a channel that opened before its handler was attached.
    if (channel.readyState === 'open') this.sendCamera()
  }

  setCamera(enabled: boolean) {
    this.cameraEnabled = enabled
    this.sendCamera()
  }

  hangup() {
    if (this.ended) return
    this.send({ type: 'hangup', callId: this.callId })
    this.ended = true
  }

  dispose() {
    this.detach()
    this.ended = true
  }

  private detach() {
    this.channel?.removeEventListener('open', this.sendCamera)
    this.channel?.removeEventListener('message', this.receive)
    this.channel = null
  }

  private send(message: CallControlMessage) {
    if (this.ended || this.channel?.readyState !== 'open') return
    try {
      this.channel.send(JSON.stringify(message))
    } catch {
      // Server call lifecycle/pulse remains the fallback if the peer disconnects.
    }
  }

  private sendCamera = () => {
    this.send({ type: 'camera', callId: this.callId, enabled: this.cameraEnabled })
  }

  private receive = (event: MessageEvent) => {
    if (this.ended || typeof event.data !== 'string') return
    let message: CallControlMessage
    try {
      message = JSON.parse(event.data)
    } catch {
      return
    }
    if (!message || message.callId !== this.callId) return
    if (message.type === 'camera' && typeof message.enabled === 'boolean') {
      this.onCamera(message.enabled)
    } else if (message.type === 'hangup') {
      this.ended = true
      this.onHangup()
    }
  }
}

// Notify media before React tears down the peer, regardless of which call UI
// invokes endCall. This never publishes another END_CALL for a remote hangup.
const localHangupListeners = new Set<(callId: string) => void>()

export function notifyLocalCallEnded(callId: string) {
  for (const listener of localHangupListeners) listener(callId)
}

export function subscribeLocalCallEnded(listener: (callId: string) => void) {
  localHangupListeners.add(listener)
  return () => { localHangupListeners.delete(listener) }
}
