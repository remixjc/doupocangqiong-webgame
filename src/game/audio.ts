type Sound = 'attack' | 'skill' | 'dodge' | 'hurt' | 'collect' | 'victory'
let context: AudioContext | undefined
let volume = .3
const last: Partial<Record<Sound, number>> = {}
export function setVolume(value: number) { volume = Math.max(0, Math.min(1, value)) }
export function unlockAudio() {
  if (typeof window === 'undefined') return
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } catch { /* Audio is optional; gameplay remains usable. */ }
}
export function playSound(kind: Sound) {
  if (!context || context.state !== 'running' || volume === 0) return
  const now = context.currentTime
  if (now - (last[kind] ?? -1) < .09) return
  last[kind] = now
  const tones: Record<Sound, [number, number, number, OscillatorType]> = {
    attack: [170, 65, .11, 'triangle'], skill: [420, 85, .3, 'sawtooth'],
    dodge: [180, 340, .12, 'sine'], hurt: [100, 35, .18, 'triangle'],
    collect: [520, 880, .22, 'sine'], victory: [440, 880, .7, 'sine'],
  }
  const [start, end, duration, type] = tones[kind]
  const oscillator = context.createOscillator(), gain = context.createGain()
  oscillator.type = type; oscillator.frequency.setValueAtTime(start, now)
  oscillator.frequency.exponentialRampToValueAtTime(end, now + duration)
  gain.gain.setValueAtTime(volume * (kind === 'skill' ? .06 : .1), now)
  gain.gain.exponentialRampToValueAtTime(.001, now + duration)
  oscillator.connect(gain); gain.connect(context.destination)
  oscillator.start(now); oscillator.stop(now + duration + .03)
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
}
