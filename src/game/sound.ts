import { AudioBus } from '../core/mixer'

export function createScore(bus: AudioBus) {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer = 0
  let step = 0

  function context(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.connect(ctx.destination)
      bus.bind(master)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  function tone(freq: number, dur: number, type: OscillatorType, amount: number): void {
    const audio = context()
    if (!audio || !master || bus.applied <= 0) return
    const osc = audio.createOscillator()
    const amp = audio.createGain()
    osc.type = type
    osc.frequency.value = freq
    amp.gain.setValueAtTime(amount, audio.currentTime)
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur)
    osc.connect(amp)
    amp.connect(master)
    osc.start()
    osc.stop(audio.currentTime + dur + 0.02)
  }

  function startMusic(): void {
    context()
    if (timer) return
    const scale = [196, 233, 262, 311, 349, 392, 466]
    timer = window.setInterval(() => {
      if (bus.applied <= 0) return
      const note = scale[step % scale.length]
      tone(note, 0.35, 'triangle', 0.03)
      if (step % 4 === 0) tone(98, 0.2, 'sine', 0.04)
      step += 1
    }, 520)
  }

  return {
    unlock: startMusic,
    move: () => tone(520, 0.08, 'square', 0.03),
    hit: () => tone(140, 0.12, 'sawtooth', 0.05),
    reward: () => {
      tone(523, 0.12, 'triangle', 0.05)
      tone(659, 0.18, 'triangle', 0.04)
    },
    ui: () => tone(880, 0.05, 'square', 0.02),
    bus,
  }
}

export type Score = ReturnType<typeof createScore>
