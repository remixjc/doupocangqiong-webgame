export type Sound = 'attack' | 'skill' | 'dodge' | 'hurt' | 'collect' | 'victory'
const tones: Record<Sound, [number, number, number, OscillatorType]> = {
  attack: [170, 65, .11, 'triangle'], skill: [420, 85, .3, 'sawtooth'],
  dodge: [180, 340, .12, 'sine'], hurt: [100, 35, .18, 'triangle'],
  collect: [520, 880, .22, 'sine'], victory: [440, 880, .7, 'sine'],
}
const normalizedVolume = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0

/** One master gain for live volume changes; bounded, independently released voices. */
export class SynthAudio {
  private master: GainNode
  private volume = 0
  private last: Partial<Record<Sound, number>> = {}
  private voices = new Set<{ cancel: () => void }>()
  constructor(private context: AudioContext, volume: number) {
    this.master = context.createGain()
    this.master.connect(context.destination)
    this.setVolume(volume)
  }
  setVolume(value: number) {
    this.volume = normalizedVolume(value)
    this.master.gain.cancelScheduledValues(this.context.currentTime)
    this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .015)
    if (this.volume === 0) this.stopAll()
  }
  stopAll() {
    for (const voice of [...this.voices]) voice.cancel()
    this.last = {}
  }
  play(kind: Sound) {
    if (this.context.state !== 'running' || this.volume === 0) return
    const now = this.context.currentTime
    if (now - (this.last[kind] ?? -1) < .09) return
    while (this.voices.size >= 8) this.voices.values().next().value!.cancel()
    const [start, end, duration, type] = tones[kind]
    let oscillator: OscillatorNode | undefined, gain: GainNode | undefined, ended = false
    const finish = () => {
      if (ended) return
      ended = true; this.voices.delete(voice)
      if (oscillator) { oscillator.onended = null; oscillator.disconnect() }
      gain?.disconnect()
    }
    const voice = { cancel: () => {
      try { oscillator?.stop(this.context.currentTime) } catch { /* Already ended or not started. */ }
      finish()
    } }
    try {
      oscillator = this.context.createOscillator(); gain = this.context.createGain()
      oscillator.type = type; oscillator.frequency.setValueAtTime(start, now)
      oscillator.frequency.exponentialRampToValueAtTime(end, now + duration)
      gain.gain.setValueAtTime(kind === 'skill' ? .06 : .1, now)
      gain.gain.exponentialRampToValueAtTime(.001, now + duration)
      oscillator.connect(gain); gain.connect(this.master)
      oscillator.onended = finish
      this.voices.add(voice)
      oscillator.start(now); oscillator.stop(now + duration + .03)
      this.last[kind] = now
    } catch { voice.cancel() /* Audio failure does not interrupt gameplay. */ }
  }
}
let context: AudioContext | undefined, synth: SynthAudio | undefined
let volume = .3
export function setVolume(value: number) { volume = normalizedVolume(value); synth?.setVolume(volume) }
export function stopAudio() { synth?.stopAll() }
export function unlockAudio() {
  if (typeof window === 'undefined' || volume === 0) return
  try {
    context ??= new AudioContext()
    synth ??= new SynthAudio(context, volume)
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } catch { /* Audio is optional; gameplay remains usable. */ }
}
export function playSound(kind: Sound) { synth?.play(kind) }
