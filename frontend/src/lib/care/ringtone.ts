/**
 * Incoming-call ringtone — Discord-style melodic loop (synthesized).
 * We do not ship Discord’s copyrighted audio asset; this recreates the familiar
 * ascending call chime with Web Audio so it works offline after unlock.
 */
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
    // Full Discord-style phrase ≈ 2.0s; slight gap before the next loop.
    this.timer = setInterval(() => this.pulse(), 2200)
    return this.context?.state === 'running'
  }

  stop() {
    this.ringing = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    for (const tone of this.tones) {
      try {
        tone.stop()
      } catch {
        /* already ended */
      }
    }
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

    // Discord-like incoming call motif: E5 → G♯5 → B5 → G♯5 (×2), bright + soft body.
    const melodyHz = [659.25, 830.61, 987.77, 830.61, 659.25, 830.61, 987.77, 830.61]
    const noteLen = 0.2
    const peak = 0.14
    const t0 = context.currentTime + 0.02

    melodyHz.forEach((frequency, index) => {
      const at = t0 + index * noteLen
      this.playNote(context, frequency, at, noteLen, peak)
      // Quieter octave-below body, same timing as Discord’s fuller chime.
      this.playNote(context, frequency / 2, at, noteLen, peak * 0.35)
    })
  }

  private playNote(context: AudioContext, frequency: number, at: number, duration: number, peak: number) {
    const tone = context.createOscillator()
    const gain = context.createGain()
    tone.type = 'triangle'
    tone.frequency.value = frequency
    const attack = 0.018
    const release = 0.06
    const hold = Math.max(0.04, duration - attack - release)
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(peak, at + attack)
    gain.gain.setValueAtTime(peak, at + attack + hold)
    gain.gain.linearRampToValueAtTime(0, at + duration)
    tone.connect(gain).connect(context.destination)
    this.tones.add(tone)
    tone.onended = () => {
      tone.disconnect()
      gain.disconnect()
      this.tones.delete(tone)
    }
    tone.start(at)
    tone.stop(at + duration + 0.01)
  }
}
