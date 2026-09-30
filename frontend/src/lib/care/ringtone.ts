/** Mixkit Marimba Ringtone — served from /public/sounds. */
export const INCOMING_CALL_RINGTONE_SRC = '/sounds/mixkit-marimba-ringtone-1359.mp3'

type RingtoneAudio = {
  loop: boolean
  currentTime: number
  paused: boolean
  play: () => Promise<void>
  pause: () => void
}

/** Reuse audio unlocked by an earlier user gesture when an incoming call arrives. */
export class CallRingtone {
  private audio: RingtoneAudio | null = null
  private unlocked = false
  private ringing = false

  constructor(
    private readonly src = INCOMING_CALL_RINGTONE_SRC,
    private readonly createAudio: (src: string) => RingtoneAudio = (url) => {
      const el = new Audio(url)
      el.preload = 'auto'
      return el
    },
  ) {}

  private ensureAudio() {
    this.audio ??= this.createAudio(this.src)
    this.audio.loop = true
    return this.audio
  }

  async unlock() {
    const audio = this.ensureAudio()
    try {
      // Prime autoplay permission with a short play/pause under a user gesture.
      await audio.play()
      if (!this.ringing) {
        audio.pause()
        audio.currentTime = 0
      }
      this.unlocked = true
    } catch {
      this.unlocked = false
    }
    return this.unlocked
  }

  start() {
    this.ringing = true
    const audio = this.ensureAudio()
    audio.loop = true
    audio.currentTime = 0
    void audio.play().then(() => {
      this.unlocked = true
    }).catch(() => {
      this.unlocked = false
    })
    return this.unlocked
  }

  stop() {
    this.ringing = false
    if (!this.audio) return
    this.audio.pause()
    this.audio.currentTime = 0
  }

  dispose() {
    this.stop()
    this.audio = null
    this.unlocked = false
  }
}
