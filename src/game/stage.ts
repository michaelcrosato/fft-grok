import type { Battle } from '../core/battle'

export type Paint = 'title' | 'battle' | 'map'

export const stage = {
  paint: 'title' as Paint,
  battle: null as Battle | null,
  cursor: { x: 2, y: 2 },
  range: [] as { x: number; y: number }[],
  threat: [] as { x: number; y: number }[],
  effects: 'high' as 'high' | 'low',
  banner: 'The Zodiac Standard',
}

export let onTile: (x: number, y: number) => void = () => {}

export function setTileHandler(fn: (x: number, y: number) => void): void {
  onTile = fn
}
