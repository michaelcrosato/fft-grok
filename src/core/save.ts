import type { Campaign } from './campaign'

export interface SaveStore {
  get(key: string): string | null
  set(key: string, value: string): void
}

export function memoryStore(initial: Record<string, string> = {}): SaveStore {
  const data = { ...initial }
  return {
    get: (key) => data[key] ?? null,
    set: (key, value) => { data[key] = value },
  }
}

export function browserStore(): SaveStore {
  return {
    get: (key) => {
      try { return localStorage.getItem(key) } catch { return null }
    },
    set: (key, value) => {
      try { localStorage.setItem(key, value) } catch { /* private mode */ }
    },
  }
}

const PREFIX = 'zodiac-standard-slot-'

export function saveSlot(store: SaveStore, slot: number, campaign: Campaign): void {
  store.set(PREFIX + slot, JSON.stringify(campaign))
}

export function loadSlot(store: SaveStore, slot: number): Campaign | null {
  const raw = store.get(PREFIX + slot)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Campaign
  if (!parsed || typeof parsed.cursor !== 'number' || !Array.isArray(parsed.party)) return null
  return parsed
}

export function listSlots(store: SaveStore, count = 3): { slot: number; hero: string; chapter: number; pending: string | null }[] {
  const out = []
  for (let slot = 1; slot <= count; slot++) {
    const campaign = loadSlot(store, slot)
    out.push({
      slot,
      hero: campaign?.hero ?? '',
      chapter: campaign?.chapter ?? 0,
      pending: campaign?.pending ?? null,
    })
  }
  return out
}
