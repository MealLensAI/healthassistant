/** Reuse audio unlocked by an earlier user gesture when an incoming call arrives. */
export class CallRingtone {
  private context: AudioContext | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private tones = new Set<OscillatorNode>()
  private ringing = false
  constructor(private createContext = () => new AudioContext()) {}

  async unlock() {
    this.context ??= this.createContext()
    await this.context.resume()
    if (this.ringing && this.context.state === 'running') this.pulse()
    return this.context.state === 'running'
  }

  start() {
    this.stop()
    this.ringing = true
    this.pulse()
    this.timer = setInterval(() => this.pulse(), 2400)
    return this.context?.state === 'running'
  }

  stop() {
    this.ringing = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    for (const tone of this.tones) { try { tone.stop() } catch { /* already ended */ } }
    this.tones.clear()
  }

  dispose() {
    this.stop()
    void this.context?.close().catch(() => undefined)
    this.context = null
  }

  private pulse() {
    const context = this.context
    if (!this.ringing || context?.state !== 'running' || this.tones.size) return
    for (const delay of [0, 0.45]) {
      for (const frequency of [440, 480]) {
        const tone = context.createOscillator()
        const gain = context.createGain()
        const at = context.currentTime + delay
        tone.frequency.value = frequency
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(0.16, at + 0.02)
        gain.gain.setValueAtTime(0.16, at + 0.30)
        gain.gain.linearRampToValueAtTime(0, at + 0.35)
        tone.connect(gain).connect(context.destination)
        this.tones.add(tone)
        tone.onended = () => { tone.disconnect(); gain.disconnect(); this.tones.delete(tone) }
        tone.start(at)
        tone.stop(at + 0.36)
      }
    }
  }
}
