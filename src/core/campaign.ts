import { ITEMS, PARSED_MAPS, classByIndex, isWeapon, moveFindPool, poachDrop, shopStock, type ItemDef } from '../data/content'
import { JOBS, innateAbilityIds } from '../data/jobs'
import { STORY, nextStoryId, storyById, type SpawnSpec, type StoryBattleDef } from '../data/story'
import { makeBattle, type Battle, type Tile } from './battle'
import { levelUpRaw } from './growth'
import { mulberry32, type Rng } from './rng'
import {
  blankUnit,
  canEquip,
  cloneUnit,
  equipItem,
  femaleRaw,
  maleRaw,
  permanentBraveFaith,
  refreshVitals,
  weaponItem,
  type Unit,
} from './unit'
import { zodiacFromBirthday, type Zodiac } from './zodiac'

export interface DispatchedErrand {
  id: string
  unitId: string
  remaining: number
}

export interface Campaign {
  hero: string
  birthday: { month: number; day: number }
  zodiac: Zodiac
  chapter: 1 | 2 | 3 | 4
  cursor: number
  pending: string | null
  cleared: string[]
  party: Unit[]
  gil: number
  inventory: Record<string, number>
  fur: Record<string, number>
  flags: Record<string, boolean>
  errands: DispatchedErrand[]
  location: string
  options: { mute: boolean; volume: number; animSpeed: number; effects: 'high' | 'low' }
  secrets: string[]
  deepFloor: number
  phase: 'scene' | 'world' | 'battle' | 'ending'
  sceneStep: number
  choices: Record<string, string>
}

export interface Proposition {
  id: string
  name: string
  chapter: number
  text: string
  gil: number
  jp: number
  days: number
}

export const PROPOSITIONS: Proposition[] = [
  { id: 'mandalia-sweep', name: 'Sweep the Mandalia road', chapter: 2, text: 'A baron wants the plains quiet for a week. Send a squire who can be spared.', gil: 800, jp: 40, days: 1 },
  { id: 'dorter-escort', name: 'Escort a ledger to Dorter', chapter: 2, text: 'Merchants pay for a body on the trade road, not a hero.', gil: 1200, jp: 50, days: 1 },
  { id: 'goug-ore', name: 'Haul mythril scrap from Goug', chapter: 3, text: 'Besrodio\'s neighbors will pay for ore that is not a weapon yet.', gil: 2000, jp: 60, days: 2 },
  { id: 'lesalia-whisper', name: 'Listen at the Lesalia gate', chapter: 3, text: 'A clerk wants the inquisitors\' shopping list. It is dull and well paid.', gil: 1800, jp: 40, days: 1 },
  { id: 'bed-survey', name: 'Survey the Bed Desert wells', chapter: 4, text: 'Water rights outlive kings. Mark three wells and come home.', gil: 3000, jp: 80, days: 2 },
]

export const ENCOUNTERS: Record<string, { id: string; monsters: string[] }[]> = {
  mandalia: [{ id: 'mandalia-mix', monsters: ['goblin', 'goblin', 'chocobo'] }],
  sweegy: [{ id: 'sweegy-panthers', monsters: ['red-panther', 'red-panther', 'goblin'] }],
  fovoham: [{ id: 'fovoham-chocobo', monsters: ['chocobo', 'chocobo', 'juravis'] }],
  zigolis: [{ id: 'zigolis-dead', monsters: ['ghoul', 'skeleton', 'morbol'] }],
  grog: [{ id: 'grog-beasts', monsters: ['behemoth', 'dragon', 'red-panther'] }],
  bed: [{ id: 'bed-wyrm', monsters: ['dragon', 'hyudra', 'bull-demon'] }],
  default: [{ id: 'road-goblins', monsters: ['goblin', 'goblin', 'bomb'] }],
}

export const RARE_BATTLES = [
  { id: 'grog-monks', name: 'Grog Hill South — eleven fists', region: 'grog', monsters: Array.from({ length: 6 }, () => 'monk') },
  { id: 'bariaus-monsters', name: 'Bariaus Hill — a menagerie', region: 'bariaus', monsters: ['behemoth', 'dragon', 'morbol', 'hyudra'] },
]

export const DEEP_FLOORS = [
  { id: 'nogias', name: 'Nogias' },
  { id: 'terminate', name: 'Terminate' },
  { id: 'delta', name: 'Delta' },
  { id: 'valkyries', name: 'Valkyries' },
  { id: 'mlapan', name: 'Mlapan' },
  { id: 'tiger', name: 'Tiger' },
  { id: 'bridge', name: 'Bridge' },
  { id: 'voyage', name: 'Voyage' },
  { id: 'horror', name: 'Horror' },
  { id: 'end', name: 'END' },
] as const

const PLACES = [
  'gariland', 'mandalia', 'sweegy', 'dorter', 'ziekden', 'lenalia', 'fovoham', 'zeakden',
  'araguay', 'zirekile', 'zaland', 'bariaus', 'zigolis', 'goug', 'golgorand', 'lionel',
  'goland', 'lesalia', 'orbonne', 'grog', 'yardow', 'yugou', 'riovanes', 'doguola',
  'bervenia', 'finath', 'zeltennia', 'bed-desert', 'bethla', 'germinas', 'poeskas',
  'limberry', 'igros', 'murond', 'graveyard', 'warjilis', 'zarghidas', 'nelveska',
]

export function locations(): string[] {
  return PLACES
}

export function createGame(name: string, month: number, day: number): Campaign {
  const zodiac = zodiacFromBirthday(month, day)
  const ramza = blankUnit({
    name: name.trim() || 'Ramza',
    job: 'squire',
    sex: 'male',
    zodiac,
    unique: 'ramza',
    brave: 70,
    faith: 60,
    side: 'player',
    raw: { hp: 504000, mp: 237000, sp: 98304, pa: 81920, ma: 81920 },
  })
  equipItem(ramza, 'dagger')
  equipItem(ramza, 'clothes')
  equipItem(ramza, 'leather-hat')
  return {
    hero: ramza.name,
    birthday: { month, day },
    zodiac,
    chapter: 1,
    cursor: 0,
    pending: STORY[0].id,
    cleared: [],
    party: [ramza],
    gil: 500,
    inventory: { potion: 8, 'hi-potion': 2, dagger: 2, clothes: 3, 'leather-hat': 3, 'phoenix-down': 2 },
    fur: {},
    flags: {},
    errands: [],
    location: 'orbonne',
    options: { mute: false, volume: 0.8, animSpeed: 1, effects: 'high' },
    secrets: [],
    deepFloor: 0,
    phase: 'scene',
    sceneStep: 0,
    choices: { 'save-boco': 'save', 'save-mustadio': 'save' },
  }
}

export function currentBattleDef(campaign: Campaign): StoryBattleDef | undefined {
  if (!campaign.pending) return undefined
  return storyById(campaign.pending)
}

function spawnUnit(spec: SpawnSpec, side: 'guest' | 'enemy', zodiac: Zodiac, index: number): Unit {
  const sex = spec.sex ?? (spec.job === 'dancer' || spec.name === 'Miluda' || spec.name === 'Meliadoul' ? 'female' : JOBS[spec.job]?.monster ? 'monster' : 'male')
  const unit = blankUnit({
    name: spec.name,
    job: JOBS[spec.job] ? spec.job : 'squire',
    sex,
    zodiac,
    side,
    level: 1,
    brave: spec.brave ?? (side === 'enemy' ? 65 : 70),
    faith: spec.faith ?? 60,
    unique: spec.unique,
    required: spec.required,
    objective: spec.objective,
    beast: spec.beast,
    monsterId: JOBS[spec.job]?.monster ? spec.job : undefined,
    ct: side === 'enemy' ? 40 + (index * 7) % 40 : 70 + index * 5,
  })
  const growth = classByIndex(JOBS[unit.job]?.classIndex ?? '4A')
  while (unit.level < spec.level) {
    unit.raw.hp = levelUpRaw(unit.raw.hp, growth.c.hp, unit.level)
    unit.raw.mp = levelUpRaw(unit.raw.mp, growth.c.mp, unit.level)
    unit.raw.sp = levelUpRaw(unit.raw.sp, growth.c.sp, unit.level)
    unit.raw.pa = levelUpRaw(unit.raw.pa, growth.c.pa, unit.level)
    unit.raw.ma = levelUpRaw(unit.raw.ma, growth.c.ma, unit.level)
    unit.level += 1
  }
  if (spec.beast) unit.beast = true
  refreshVitals(unit, true)
  if (!spec.weapon) {
    const kit = kitWeapon(unit, 200 + spec.level * 160)
    if (kit) equipItem(unit, kit)
  }
  if (spec.weapon) equipItem(unit, spec.weapon)
  for (const id of innateAbilityIds(unit.job)) {
    if (!unit.learned.includes(id)) unit.learned.push(id)
  }
  return unit
}

/** A shop weapon is worth carrying only when it outdamages a bare swing at this unit's stats. */
function bestWeapon(unit: Unit, allow: (item: ItemDef) => boolean): ItemDef | null {
  let best: ItemDef | null = null
  for (const item of Object.values(ITEMS)) {
    if (!isWeapon(item.category) || item.wp < 3 || !allow(item) || !canEquip(unit, item.id)) continue
    if (item.category === 'flail' || item.category === 'axe' || item.category === 'bag') continue
    if (!best || item.wp > best.wp || (item.wp === best.wp && item.price < best.price)) best = item
  }
  return best
}

function kitWeapon(unit: Unit, budget: number): string | null {
  const ceiling = Math.min(12, 4 + Math.floor(unit.level / 5))
  const purse = Math.max(budget, 1800)
  return bestWeapon(unit, (item) => item.price > 0 && item.price <= purse && item.wp <= ceiling)?.id
    ?? bestWeapon(unit, (item) => item.wp <= Math.max(ceiling, 4))?.id
    ?? null
}

/**
 * Spend gil on a stronger legal weapon and keep a pouch of hi-potions and phoenix downs.
 * Called when a story battle is built so the company walks in equipped. A player who has
 * spent the purse already simply keeps what they own.
 */
export function provisionParty(campaign: Campaign): void {
  const stock = new Set(shopStock(campaign.chapter))
  const members = [...campaign.party].sort((a, b) => Number(b.unique === 'ramza') - Number(a.unique === 'ramza'))
  for (const unit of members) {
    if (unit.sex === 'monster') continue
    const held = weaponItem(unit)?.wp ?? 0
    const pick = bestWeapon(unit, (item) => stock.has(item.id) && item.wp > held && item.price <= campaign.gil)
    if (pick && buyItem(campaign, pick.id)) equipItem(unit, pick.id)
    if (!weaponItem(unit)) {
      const issued = kitWeapon(unit, 200 + unit.level * 160)
      if (issued) equipItem(unit, issued)
    }
  }
  for (const id of ['hi-potion', 'phoenix-down']) {
    const want = id === 'hi-potion' ? 6 : 4
    while ((campaign.inventory[id] ?? 0) < want) {
      if (!buyItem(campaign, id)) break
    }
  }
}

/** Ramza always deploys. The other seats go to the highest-level companions not away on an errand. */
export function fieldUnits(campaign: Campaign, seats: number): Unit[] {
  const roster = campaign.party.filter((unit) => !campaign.errands.some((errand) => errand.unitId === unit.id))
  const ramza = roster.filter((unit) => unit.unique === 'ramza')
  const rest = roster.filter((unit) => unit.unique !== 'ramza').sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
  return [...ramza, ...rest].slice(0, Math.max(1, seats)).map((unit) => cloneUnit(unit))
}

function hash(text: string): number {
  let n = 2166136261
  for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619)
  return n >>> 0
}

export function buildMapTiles(id: string, terrain: string): { w: number; h: number; tiles: Tile[] } {
  const parsed = PARSED_MAPS[id]
  if (parsed) {
    const tiles: Tile[] = []
    const rows = parsed.rows
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const height = rows[y][x]
        tiles.push({ x, y, h: height ?? 0, blocked: height == null, terrain })
      }
    }
    connectHeights(tiles)
    sprinkleFind(tiles, id)
    return { w: parsed.cols, h: rows.length, tiles }
  }
  const w = 8 + (hash(id) % 4)
  const h = 8 + (hash(id + 'h') % 3)
  const tiles: Tile[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = hash(`${id}:${x}:${y}`)
      let height = (n % 5) * 10
      if (terrain === 'swamp' || terrain === 'lake') height = (n % 3) * 5
      if (terrain === 'peak' || terrain === 'fort' || terrain === 'castle') height = (n % 7) * 10
      if (terrain === 'desert') height = (n % 4) * 5
      const blocked = terrain === 'fort' && (x === 0 || y === 0) && n % 4 === 0
      tiles.push({ x, y, h: blocked ? 0 : height, blocked, terrain })
    }
  }
  connectHeights(tiles)
  sprinkleFind(tiles, id)
  return { w, h, tiles }
}

/**
 * Every open tile must be reachable with Jump 3. Isolated pockets, including ones
 * walled off by void, get a one-tile ramp cut through to the largest region.
 */
function connectHeights(tiles: Tile[]): void {
  const jump = 30
  const key = (tile: Tile) => `${tile.x},${tile.y}`
  const byKey = new Map(tiles.map((tile) => [key(tile), tile]))
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const
  const components = (): Tile[][] => {
    const seen = new Set<string>()
    const groups: Tile[][] = []
    for (const tile of tiles) {
      if (tile.blocked || seen.has(key(tile))) continue
      const group: Tile[] = []
      const queue = [tile]
      seen.add(key(tile))
      while (queue.length) {
        const current = queue.shift()!
        group.push(current)
        for (const [dx, dy] of dirs) {
          const next = byKey.get(`${current.x + dx},${current.y + dy}`)
          if (!next || next.blocked || seen.has(key(next))) continue
          if (Math.abs(next.h - current.h) > jump) continue
          seen.add(key(next))
          queue.push(next)
        }
      }
      groups.push(group)
    }
    return groups
  }
  for (let guard = 0; guard < tiles.length; guard++) {
    const groups = components()
    if (groups.length <= 1) return
    groups.sort((a, b) => b.length - a.length)
    const main = groups[0]
    const other = groups[1]
    let pair: { a: Tile; b: Tile; d: number } | null = null
    for (const a of main) {
      for (const b of other) {
        const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
        if (!pair || d < pair.d) pair = { a, b, d }
      }
    }
    if (!pair) return
    let x = pair.a.x
    let y = pair.a.y
    let h = pair.a.h
    while (x !== pair.b.x || y !== pair.b.y) {
      if (x !== pair.b.x) x += Math.sign(pair.b.x - x)
      else y += Math.sign(pair.b.y - y)
      const tile = byKey.get(`${x},${y}`)
      if (!tile) break
      tile.blocked = false
      if (tile.h > h + jump) tile.h = h + jump
      if (tile.h < h - jump) tile.h = h - jump
      h = tile.h
    }
  }
}

function sprinkleFind(tiles: Tile[], id: string): void {
  const pool = moveFindPool()
  if (!pool.length) return
  const open = tiles.filter((tile) => !tile.blocked)
  if (open.length < 4) return
  const a = open[hash(id) % open.length]
  const b = open[hash(id + 'b') % open.length]
  const common = pool[hash(id + 'c') % pool.length]
  const rare = pool[hash(id + 'r') % pool.length]
  a.moveFind = { common, rare, taken: false }
  if (b !== a) b.moveFind = { common: pool[hash(id + 'd') % pool.length], rare, taken: false }
}

function place(units: Unit[], tiles: Tile[], side: 'player' | 'enemy'): void {
  const open = tiles.filter((tile) => !tile.blocked)
  const sorted = open.slice().sort((a, b) => side === 'player' ? b.y - a.y || a.x - b.x : a.y - b.y || a.x - b.x)
  units.forEach((unit, index) => {
    const tile = sorted[index] ?? sorted[sorted.length - 1]
    if (!tile) return
    unit.x = tile.x
    unit.y = tile.y
    unit.facing = side === 'player' ? 0 : 2
  })
}

export function instantiateBattle(campaign: Campaign, rng: Rng = mulberry32(hash(campaign.pending ?? 'x'))): Battle | null {
  const def = currentBattleDef(campaign)
  if (!def) return null
  provisionParty(campaign)
  const map = buildMapTiles(def.id, def.terrain)
  const guests = def.guests.map((spec, index) => spawnUnit(spec, 'guest', campaign.zodiac, index))
  if (def.id === '2.2b' && campaign.choices['save-boco'] !== 'save') {
    const boco = guests.find((unit) => unit.unique === 'boco')
    if (boco) boco.required = false
  }
  const hero = campaign.party.find((unit) => unit.unique === 'ramza') ?? campaign.party[0]
  const partyLevel = Math.max(1, hero?.level ?? 1)
  const enemies = def.enemies.map((spec, index) => {
    const bump = spec.objective || spec.unique ? 1 : 0
    const level = Math.min(spec.level, partyLevel + bump)
    return spawnUnit({ ...spec, level }, 'enemy', index % 2 ? 'taurus' : 'leo', index)
  })
  const roster = campaign.party.filter((unit) => !campaign.errands.some((errand) => errand.unitId === unit.id))
  const deployed = roster.slice(0, Math.max(1, def.deploy - guests.length)).map((unit) => cloneUnit(unit))
  deployed.forEach((unit) => { unit.side = 'player'; unit.ct = Math.max(unit.ct, 80) })
  const units = [...deployed, ...guests, ...enemies]
  place(units.filter((unit) => unit.side !== 'enemy'), map.tiles, 'player')
  place(units.filter((unit) => unit.side === 'enemy'), map.tiles, 'enemy')
  const objective = enemies.find((unit) => unit.objective) ?? guests.find((unit) => unit.required && def.objectiveType === 'protect')
  return makeBattle({
    id: def.id,
    w: map.w,
    h: map.h,
    tiles: map.tiles,
    terrain: def.terrain,
    units,
    objectiveText: def.objectiveText,
    objectiveType: def.objectiveType,
    objectiveUnitId: objective?.id,
    stock: { ...campaign.inventory },
  }, rng)
}

export function commitBattleVictory(campaign: Campaign): Campaign {
  const def = currentBattleDef(campaign)
  if (!def) return campaign
  const next = { ...campaign, party: campaign.party.map(cloneUnit), cleared: [...campaign.cleared], flags: { ...campaign.flags }, inventory: { ...campaign.inventory }, fur: { ...campaign.fur }, secrets: [...campaign.secrets], choices: { ...campaign.choices }, errands: campaign.errands.map((errand) => ({ ...errand })) }
  next.cleared.push(def.id)
  next.gil += def.gil
  next.cursor += 1
  if (def.flag) next.flags[def.flag] = true
  if (def.id === 'prologue-orbonne') addCadets(next)
  for (const token of def.joins) addJoin(next, token)
  const following = nextStoryId(def.id)
  if (following === 'ending' || !following) {
    next.pending = null
    next.phase = 'ending'
  } else {
    const upcoming = storyById(following)
    next.pending = following
    next.chapter = upcoming?.chapter ?? next.chapter
    next.location = upcoming?.place ?? next.location
    next.phase = 'scene'
    next.sceneStep = 0
  }
  resolveErrands(next)
  return next
}

function addCadets(campaign: Campaign): void {
  if (campaign.party.length > 1) return
  const squire = blankUnit({ name: 'Cadet', job: 'squire', sex: 'male', zodiac: 'taurus', side: 'player', brave: 65, faith: 55, raw: maleRaw() })
  const chemist = blankUnit({ name: 'Apprentice', job: 'chemist', sex: 'female', zodiac: 'virgo', side: 'player', brave: 60, faith: 68, raw: femaleRaw() })
  equipItem(squire, 'broad-sword')
  equipItem(squire, 'clothes')
  equipItem(chemist, 'dagger')
  equipItem(chemist, 'clothes')
  equipItem(chemist, 'leather-hat')
  campaign.party.push(squire, chemist)
}

function addJoin(campaign: Campaign, token: string): void {
  if (token === 'boco' && campaign.choices['save-boco'] !== 'save') return
  if (token === 'mustadio' && campaign.choices['save-mustadio'] !== 'save') return
  if (campaign.party.some((unit) => unit.unique === token)) return
  const spec = recruitSpec(token)
  if (!spec) return
  const unit = blankUnit(spec)
  if (spec.job === 'chocobo') unit.monsterId = 'chocobo'
  campaign.party.push(unit)
  if (campaign.party.length > 16) campaign.party.length = 16
}

function recruitSpec(token: string): Partial<Unit> & Pick<Unit, 'name' | 'job' | 'sex' | 'zodiac'> {
  const table: Record<string, Partial<Unit> & Pick<Unit, 'name' | 'job' | 'sex' | 'zodiac'>> = {
    boco: { name: 'Boco', job: 'chocobo', sex: 'monster', zodiac: 'aries', unique: 'boco', monsterId: 'chocobo', brave: 60, faith: 50, level: 8 },
    mustadio: { name: 'Mustadio', job: 'engineer', sex: 'male', zodiac: 'virgo', unique: 'mustadio', brave: 68, faith: 58, level: 15 },
    agrias: { name: 'Agrias', job: 'holy-knight', sex: 'female', zodiac: 'cancer', unique: 'agrias', brave: 75, faith: 65, level: 16 },
    meliadoul: { name: 'Meliadoul', job: 'divine-knight', sex: 'female', zodiac: 'leo', unique: 'meliadoul', brave: 72, faith: 62, level: 30 },
    orlandu: { name: 'Orlandu', job: 'holy-swordsman', sex: 'male', zodiac: 'scorpio', unique: 'orlandu', brave: 80, faith: 60, level: 36 },
    rafa: { name: 'Rafa', job: 'heaven-knight', sex: 'female', zodiac: 'pisces', unique: 'rafa', brave: 64, faith: 76, level: 22 },
    malak: { name: 'Malak', job: 'hell-knight', sex: 'male', zodiac: 'gemini', unique: 'malak', brave: 60, faith: 55, level: 22 },
    beowulf: { name: 'Beowulf', job: 'templar-standin', sex: 'male', zodiac: 'libra', unique: 'beowulf', brave: 74, faith: 50, level: 28 },
    reis: { name: 'Reis', job: 'dragoner', sex: 'female', zodiac: 'cancer', unique: 'reis', brave: 70, faith: 68, level: 28 },
    'worker-8': { name: 'Worker 8', job: 'engineer', sex: 'male', zodiac: 'aquarius', unique: 'worker-8', brave: 50, faith: 40, level: 25 },
    cloud: { name: 'Cloud', job: 'soldier', sex: 'male', zodiac: 'aries', unique: 'cloud', brave: 75, faith: 65, level: 30 },
    byblos: { name: 'Byblos', job: 'lucavi', sex: 'monster', zodiac: 'serpentarius', unique: 'byblos', brave: 70, faith: 80, level: 40, beast: true },
  }
  const found = table[token]
  if (found?.job === 'templar-standin') found.job = 'holy-knight'
  return found
}

export function buyItem(campaign: Campaign, itemId: string): boolean {
  const stock = shopStock(campaign.chapter)
  const item = ITEMS[itemId]
  if (!item || !stock.includes(itemId) || campaign.gil < item.price) return false
  campaign.gil -= item.price
  campaign.inventory[itemId] = (campaign.inventory[itemId] ?? 0) + 1
  return true
}

export function sellItem(campaign: Campaign, itemId: string): boolean {
  const have = campaign.inventory[itemId] ?? 0
  const item = ITEMS[itemId]
  if (!item || have <= 0) return false
  campaign.inventory[itemId] = have - 1
  campaign.gil += Math.max(1, Math.floor(item.price / 2))
  return true
}

export function availablePropositions(campaign: Campaign): Proposition[] {
  if (campaign.chapter < 2) return []
  return PROPOSITIONS.filter((job) => job.chapter <= campaign.chapter)
}

export function dispatchProposition(campaign: Campaign, propositionId: string, unitId: string): boolean {
  const offer = availablePropositions(campaign).find((job) => job.id === propositionId)
  const unit = campaign.party.find((member) => member.id === unitId)
  if (!offer || !unit || unit.unique === 'ramza' || unit.sex === 'monster') return false
  if (campaign.errands.some((errand) => errand.unitId === unitId)) return false
  campaign.errands.push({ id: offer.id, unitId, remaining: offer.days })
  return true
}

export function resolveErrands(campaign: Campaign): void {
  const still: DispatchedErrand[] = []
  for (const errand of campaign.errands) {
    errand.remaining -= 1
    if (errand.remaining > 0) {
      still.push(errand)
      continue
    }
    const offer = PROPOSITIONS.find((job) => job.id === errand.id)
    const unit = campaign.party.find((member) => member.id === errand.unitId)
    if (offer && unit) {
      campaign.gil += offer.gil
      unit.jp[unit.job] = (unit.jp[unit.job] ?? 0) + offer.jp
    }
  }
  campaign.errands = still
}

export function rollEncounter(campaign: Campaign, region: string, rng: Rng): Battle | null {
  if (rng.d100() > 35) return null
  const table = ENCOUNTERS[region] ?? ENCOUNTERS.default
  const pick = table[rng.int(table.length)]
  return encounterBattle(campaign, pick.id, pick.monsters, rng)
}

export function encounterBattle(campaign: Campaign, id: string, monsters: string[], rng: Rng = mulberry32(1)): Battle {
  const map = buildMapTiles(id, 'wild')
  const level = Math.max(3, campaign.party.reduce((best, unit) => Math.max(best, unit.level), 1))
  const enemies = monsters.map((job, index) => spawnUnit({ name: JOBS[job]?.name ?? job, job, level, sex: 'monster' }, 'enemy', 'aries', index))
  const deployed = fieldUnits(campaign, 4)
  const units = [...deployed, ...enemies]
  place(deployed, map.tiles, 'player')
  place(enemies, map.tiles, 'enemy')
  return makeBattle({
    id,
    w: map.w,
    h: map.h,
    tiles: map.tiles,
    units,
    objectiveText: 'Defeat the creatures on the road.',
    objectiveType: 'defeat-all',
    stock: { ...campaign.inventory },
  }, rng)
}

export function rareBattle(campaign: Campaign, id: string): Battle | null {
  const rare = RARE_BATTLES.find((battle) => battle.id === id)
  if (!rare || campaign.chapter < 4) return null
  const monsters = rare.monsters.map((job) => JOBS[job]?.monster ? job : 'goblin')
  const specs = rare.id === 'grog-monks'
    ? rare.monsters.map(() => ({ name: 'Wandering Monk', job: 'monk', level: 40, sex: 'male' as const }))
    : monsters.map((job) => ({ name: JOBS[job]?.name ?? job, job, level: 42, sex: 'monster' as const }))
  const map = buildMapTiles(rare.id, 'wild')
  const enemies = specs.map((spec, index) => spawnUnit(spec, 'enemy', 'leo', index))
  const deployed = fieldUnits(campaign, 5)
  place(deployed, map.tiles, 'player')
  place(enemies, map.tiles, 'enemy')
  return makeBattle({
    id: rare.id,
    w: map.w,
    h: map.h,
    tiles: map.tiles,
    units: [...deployed, ...enemies],
    objectiveText: rare.name,
    objectiveType: 'defeat-all',
    stock: { ...campaign.inventory },
  })
}

export function tavernRecruits(campaign: Campaign): Unit[] {
  const sign = campaign.zodiac
  const male = blankUnit({ name: 'Recruit', job: 'squire', sex: 'male', zodiac: sign === 'aries' ? 'taurus' : 'aries', side: 'player', raw: maleRaw(500000, 230000) })
  const female = blankUnit({ name: 'Recruit', job: 'chemist', sex: 'female', zodiac: 'virgo', side: 'player', raw: femaleRaw() })
  male.name = `Squire ${campaign.cleared.length + 1}`
  female.name = `Chemist ${campaign.cleared.length + 1}`
  return [male, female]
}

export function recruit(campaign: Campaign, unit: Unit): boolean {
  if (campaign.party.length >= 16) return false
  if (campaign.gil < 200) return false
  campaign.gil -= 200
  unit.side = 'player'
  campaign.party.push(cloneUnit(unit))
  return true
}

const SECRET_ORDER = [
  'goug-besrodio',
  'goland-rumor',
  'lesalia-hunter',
  'colliery',
  'beowulf-reis',
  'worker-8',
  'zarghidas-flower',
  'nelveska',
  'cloud',
  'byblos',
] as const

export function secretAvailable(campaign: Campaign, step: string): boolean {
  const has = (id: string) => campaign.party.some((unit) => unit.unique === id)
  const cleared = (id: string) => campaign.cleared.includes(id)
  switch (step) {
    case 'goug-besrodio':
      return has('mustadio') && cleared('2.3b') && !campaign.secrets.includes(step)
    case 'goland-rumor':
      return campaign.secrets.includes('goug-besrodio') && !campaign.secrets.includes(step)
    case 'lesalia-hunter':
      return campaign.secrets.includes('goland-rumor') && !campaign.secrets.includes(step)
    case 'colliery':
      return campaign.secrets.includes('lesalia-hunter') && !campaign.secrets.includes(step)
    case 'beowulf-reis':
      return campaign.secrets.includes('colliery') && !has('beowulf')
    case 'worker-8':
      return has('beowulf') && has('reis') && !has('worker-8')
    case 'zarghidas-flower':
      return cleared('2.4h') && !campaign.secrets.includes(step)
    case 'nelveska':
      return campaign.secrets.includes('zarghidas-flower') && !campaign.secrets.includes(step)
    case 'cloud':
      return campaign.secrets.includes('nelveska') && !has('cloud')
    case 'byblos':
      return campaign.deepFloor >= 10 && !has('byblos')
    default:
      return false
  }
}

export function performSecret(campaign: Campaign, step: string): boolean {
  if (!secretAvailable(campaign, step)) return false
  campaign.secrets.push(step)
  if (step === 'beowulf-reis') {
    addJoin(campaign, 'beowulf')
    addJoin(campaign, 'reis')
  }
  if (step === 'worker-8') addJoin(campaign, 'worker-8')
  if (step === 'cloud') {
    addJoin(campaign, 'cloud')
    campaign.inventory['materia-blade'] = (campaign.inventory['materia-blade'] ?? 0) + 1
  }
  if (step === 'byblos') addJoin(campaign, 'byblos')
  if (step === 'colliery') campaign.flags['colliery-open'] = true
  return true
}

export function secretSteps(): string[] {
  return [...SECRET_ORDER]
}

export function deepExits(floor: number): { x: number; y: number }[] {
  const seeds = [
    [{ x: 8, y: 6 }, { x: 9, y: 3 }, { x: 1, y: 8 }, { x: 3, y: 7 }],
    [{ x: 2, y: 2 }, { x: 6, y: 7 }, { x: 4, y: 1 }, { x: 7, y: 5 }],
  ]
  return seeds[floor % 2].map((spot) => ({ ...spot }))
}

export function startDeepFloor(campaign: Campaign, floor: number): Battle | null {
  if (floor < 1 || floor > 10) return null
  if (!campaign.cleared.includes('2.4n') && campaign.deepFloor === 0 && floor === 1) {
    /* Warjilis opens the dungeon after Murond Holy Place begins. */
  }
  if (!campaign.cleared.includes('2.4n')) return null
  if (floor !== campaign.deepFloor + 1) return null
  const info = DEEP_FLOORS[floor - 1]
  const map = buildMapTiles(`deep-${info.id}`, 'cave')
  const level = 40 + floor * 3
  const kinds = ['skeleton', 'ghoul', 'ahriman', 'bomb', 'morbol', 'dragon', 'behemoth', 'hyudra', 'lucavi', 'lucavi']
  const job = kinds[floor - 1]
  const enemies = [0, 1, 2].map((index) => spawnUnit({
    name: floor === 10 && index === 0 ? 'Elidibs' : `${info.name} Beast`,
    job,
    level,
    sex: 'monster',
    beast: job === 'lucavi',
    objective: floor === 10 && index === 0,
  }, 'enemy', 'scorpio', index))
  const deployed = fieldUnits(campaign, 5)
  place(deployed, map.tiles, 'player')
  place(enemies, map.tiles, 'enemy')
  const exits = deepExits(floor)
  for (const exit of exits) {
    const tile = map.tiles.find((candidate) => candidate.x === exit.x && candidate.y === exit.y)
    if (tile) tile.blocked = false
  }
  return makeBattle({
    id: `deep-${info.id}`,
    w: map.w,
    h: map.h,
    tiles: map.tiles,
    units: [...deployed, ...enemies],
    objectiveText: `Find the hidden exit of ${info.name} before the dark takes the floor. Every Deep floor is dark until something dies into light.`,
    objectiveType: floor === 10 ? 'defeat-one' : 'defeat-all',
    objectiveUnitId: enemies[0]?.id,
    dark: true,
    hiddenExits: exits,
    stock: { ...campaign.inventory },
  })
}

export function completeDeepFloor(campaign: Campaign, floor: number, usedExit: boolean): void {
  if (!usedExit) return
  if (floor === campaign.deepFloor + 1) campaign.deepFloor = floor
}

export function absorbBattleLoot(campaign: Campaign, battle: Battle): void {
  for (const unit of battle.units) {
    if (unit.side !== 'player') continue
    const home = campaign.party.find((member) => member.id === unit.id)
    if (!home) continue
    if (unit.crystal && home.unique !== 'ramza' && battle.result !== 'victory') {
      campaign.party = campaign.party.filter((member) => member.id !== home.id)
      continue
    }
    permanentBraveFaith(unit)
    home.level = unit.level
    home.exp = unit.exp
    home.raw = { ...unit.raw }
    home.jp = { ...unit.jp }
    home.learned = [...unit.learned]
    home.brave = unit.brave
    home.baseBrave = unit.baseBrave
    home.faith = unit.faith
    home.baseFaith = unit.baseFaith
    home.paMod = 0
    home.maMod = 0
    home.spMod = 0
    refreshVitals(home, true)
  }
  for (const [id, count] of Object.entries(battle.stock)) {
    campaign.inventory[id] = count
  }
  for (const [id, count] of Object.entries(battle.fur)) {
    campaign.fur[id] = (campaign.fur[id] ?? 0) + count
  }
  for (const monsterId of battle.invited) {
    if (campaign.party.length >= 16) break
    if (campaign.party.some((unit) => unit.monsterId === monsterId && unit.side === 'player')) continue
    const unit = blankUnit({
      name: JOBS[monsterId]?.name ?? monsterId,
      job: monsterId,
      sex: 'monster',
      zodiac: 'aries',
      monsterId,
      side: 'player',
      brave: 55,
      faith: 50,
    })
    campaign.party.push(unit)
  }
}

export function poachIntoFur(campaign: Campaign, monsterId: string, roll: number): string | null {
  const drop = poachDrop(monsterId, roll)
  if (!drop) return null
  campaign.fur[drop] = (campaign.fur[drop] ?? 0) + 1
  return drop
}

export function inviteSpecies(campaign: Campaign, monsterId: string): boolean {
  if (!JOBS[monsterId]?.monster) return false
  if (campaign.party.length >= 16) return false
  const unit = blankUnit({
    name: JOBS[monsterId].name,
    job: monsterId,
    sex: 'monster',
    zodiac: 'aries',
    monsterId,
    side: 'player',
    brave: 60,
    faith: 50,
  })
  campaign.party.push(unit)
  return true
}

export { poachDrop }
