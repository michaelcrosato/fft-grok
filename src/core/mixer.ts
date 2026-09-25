/** The gain the WebAudio master node is set to. Mute wins over the slider. */
export function outputGain(volume: number, muted: boolean): number {
  if (muted) return 0
  if (Number.isNaN(volume)) return 0
  return Math.max(0, Math.min(1, volume))
}

export interface GainTarget {
  gain: { value: number }
}

export class AudioBus {
  volume = 0.8
  muted = false
  applied = 0.8
  private node: GainTarget | null = null

  bind(node: GainTarget): void {
    this.node = node
    this.push()
  }

  setVolume(volume: number): void {
    this.volume = volume
    this.push()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.push()
  }

  push(): void {
    this.applied = outputGain(this.volume, this.muted)
    if (this.node) this.node.gain.value = this.applied
  }
}
