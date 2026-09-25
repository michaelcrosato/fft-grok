import itemsJson from './generated/items.json'
import classesJson from './generated/classes.json'
import poachJson from './generated/poach.json'
import mapsJson from './generated/maps.json'

export interface ItemDef {
  id: string
  name: string
  category: string
  equippedBy: string[]
  wp: number
  evade: number
  magicEvade: number
  hp: number
  mp: number
  speed: number
  pa: number
  ma: number
  element: string | null
  adds: string[]
  twoHands: boolean
  twoSwords: boolean
  price: number
  rare: { kind: string; note: string } | null
}

export interface ClassDef {
  index: string
  name: string
  id: string
  mul: { hp: number; mp: number; sp: number; pa: number; ma: number }
  c: { hp: number; mp: number; sp: number; pa: number; ma: number }
  move: number
  jump: number
  cev: number
  type: string
  eq: string
  innate: string
}

export interface PoachRow {
  monster: string
  id: string
  common: string
  rare: string
  commonId: string
  rareId: string
}

export interface ParsedMap {
  rows: (number | null)[][]
  cols: number
}

export const ITEMS: Record<string, ItemDef> = {}
for (const raw of itemsJson) {
  const item = raw as ItemDef
  if (item.magicEvade == null) item.magicEvade = 0
  ITEMS[item.id] = item
}

export const CLASSES: Record<string, ClassDef> = {}
for (const raw of classesJson as ClassDef[]) {
  CLASSES[raw.index] = raw
}

export const POACH: PoachRow[] = poachJson as PoachRow[]
export const PARSED_MAPS: Record<string, ParsedMap> = mapsJson as Record<string, ParsedMap>

export function classByIndex(index: string): ClassDef {
  const found = CLASSES[index]
  if (!found) throw new Error(`Missing class ${index}`)
  return found
}

export function itemById(id: string): ItemDef | undefined {
  return ITEMS[id]
}

const WEAPONS = new Set([
  'knife', 'ninja-sword', 'sword', 'knight-sword', 'katana', 'axe', 'rod', 'staff',
  'flail', 'gun', 'crossbow', 'bow', 'instrument', 'dictionary', 'spear', 'stick', 'bag', 'cloth',
])

export function isWeapon(category: string): boolean {
  return WEAPONS.has(category)
}

export function isHead(category: string): boolean {
  return category === 'hat' || category === 'helmet' || category === 'ribbon'
}

export function isBody(category: string): boolean {
  return category === 'clothes' || category === 'armor' || category === 'robe'
}

export function isAccessory(category: string): boolean {
  return ['shoes', 'gauntlet', 'ring', 'armlet', 'mantle', 'perfume'].includes(category)
}

export interface ItemSource {
  kind: 'shop' | 'poach' | 'steal' | 'move-find' | 'battle' | 'treasure'
  where: string
}

const poachIds = new Set<string>()
for (const row of POACH) {
  poachIds.add(row.commonId)
  poachIds.add(row.rareId)
}

export function sourceFor(item: ItemDef): ItemSource {
  if (item.category === 'consumable' || item.category === 'throwing') {
    return { kind: 'shop', where: 'Town outfitter' }
  }
  if (item.rare) {
    const kind = item.rare.kind
    if (kind === 'shop' || kind === 'poach' || kind === 'steal' || kind === 'move-find' || kind === 'battle' || kind === 'treasure') {
      return { kind, where: item.rare.note }
    }
  }
  if (poachIds.has(item.id)) return { kind: 'poach', where: 'Fur shop after Secret Hunt' }
  if (item.category === 'consumable' || item.category === 'throwing' || item.price <= 4000) {
    return { kind: 'shop', where: 'Town outfitter' }
  }
  if (item.wp >= 12 || item.hp >= 80) return { kind: 'move-find', where: 'Field cache' }
  return { kind: 'shop', where: 'Town outfitter' }
}

export const ALL_ITEM_SOURCES: { id: string; source: ItemSource }[] = Object.values(ITEMS).map((item) => ({
  id: item.id,
  source: sourceFor(item),
}))

/** Shops stock every item whose source is a shop, gated by price into chapters. */
export function shopStock(chapter: number): string[] {
  return Object.values(ITEMS)
    .filter((item) => sourceFor(item).kind === 'shop')
    .filter((item) => {
      if (chapter <= 1) return item.price <= 1500
      if (chapter === 2) return item.price <= 5000
      if (chapter === 3) return item.price <= 12000
      return true
    })
    .map((item) => item.id)
}

export function moveFindPool(): string[] {
  return Object.values(ITEMS).filter((item) => sourceFor(item).kind === 'move-find').map((item) => item.id)
}

export function poachRow(monsterId: string): PoachRow | undefined {
  return POACH.find((row) => row.id === monsterId)
}

/**
 * Common unless the roll is in the bottom 15%, inside the guide's 10–20% guess for a rare poach.
 * Goblin common is Potion and rare is Hi-Potion.
 */
export function poachDrop(monsterId: string, roll: number): string | null {
  const row = poachRow(monsterId)
  if (!row) return null
  return roll < 15 ? row.rareId : row.commonId
}
