import { classByIndex, isAccessory, isBody, isHead, isWeapon, itemById, type ItemDef } from '../data/content'
import { ABILITIES, JOBS, innateAbilityIds, type AbilityDef, type JobDef } from '../data/jobs'
import { jobLevelFromJp, levelUpRaw, surfaceStat } from './growth'
import { clamp } from './int'
import type { Sex, Zodiac } from './zodiac'

export interface RawStats {
  hp: number
  mp: number
  sp: number
  pa: number
  ma: number
}

export interface Unit {
  id: string
  name: string
  side: 'player' | 'guest' | 'enemy'
  sex: Sex
  job: string
  zodiac: Zodiac
  brave: number
  faith: number
  baseBrave: number
  baseFaith: number
  raw: RawStats
  level: number
  exp: number
  jp: Record<string, number>
  learned: string[]
  secondary: string | null
  reaction: string | null
  support: string | null
  movement: string | null
  right: string | null
  left: string | null
  head: string | null
  body: string | null
  accessory: string | null
  ct: number
  hp: number
  mp: number
  x: number
  y: number
  facing: 0 | 1 | 2 | 3
  dead: boolean
  deathCount: number | null
  chicken: boolean
  statuses: string[]
  charging: null | { abilityId: string; ctr: number; x: number; y: number; targetId?: string }
  paMod: number
  maMod: number
  spMod: number
  required: boolean
  objective: boolean
  monsterId?: string
  unique?: string
  beast: boolean
  acted: boolean
  moved: boolean
  kills: Record<string, number>
  crystal: null | 'crystal' | 'chest'
}

let seq = 1
export function nextUnitId(prefix = 'u'): string {
  seq += 1
  return `${prefix}-${seq}`
}

export function maleRaw(rngHp = 491520, rngMp = 229376): RawStats {
  return { hp: rngHp, mp: rngMp, sp: 98304, pa: 81920, ma: 65536 }
}

export function femaleRaw(rngHp = 458752, rngMp = 245760): RawStats {
  return { hp: rngHp, mp: rngMp, sp: 98304, pa: 65536, ma: 81920 }
}

export function ramzaRaw(rngHp = 504000, rngMp = 237000): RawStats {
  return { hp: rngHp, mp: rngMp, sp: 98304, pa: 81920, ma: 81920 }
}

export function blankUnit(partial: Partial<Unit> & Pick<Unit, 'name' | 'job' | 'sex' | 'zodiac'>): Unit {
  const job = JOBS[partial.job]
  const raw = partial.raw ?? (partial.sex === 'female' ? femaleRaw() : partial.unique === 'ramza' ? ramzaRaw() : maleRaw())
  const unit: Unit = {
    id: partial.id ?? nextUnitId(partial.side === 'enemy' ? 'e' : 'p'),
    name: partial.name,
    side: partial.side ?? 'player',
    sex: partial.sex,
    job: partial.job,
    zodiac: partial.zodiac,
    brave: partial.brave ?? 70,
    faith: partial.faith ?? 70,
    baseBrave: partial.baseBrave ?? partial.brave ?? 70,
    baseFaith: partial.baseFaith ?? partial.faith ?? 70,
    raw,
    level: partial.level ?? 1,
    exp: partial.exp ?? 0,
    jp: partial.jp ?? { [partial.job]: partial.job === 'squire' || partial.job === 'chemist' || partial.job === 'squire-ramza' ? 100 : 0 },
    learned: partial.learned ? [...partial.learned] : [],
    secondary: partial.secondary ?? null,
    reaction: partial.reaction ?? null,
    support: partial.support ?? null,
    movement: partial.movement ?? null,
    right: partial.right ?? null,
    left: partial.left ?? null,
    head: partial.head ?? null,
    body: partial.body ?? null,
    accessory: partial.accessory ?? null,
    ct: partial.ct ?? 0,
    hp: 1,
    mp: 0,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    facing: partial.facing ?? 2,
    dead: false,
    deathCount: null,
    chicken: false,
    statuses: [],
    charging: null,
    paMod: 0,
    maMod: 0,
    spMod: 0,
    required: partial.required ?? false,
    objective: partial.objective ?? false,
    monsterId: partial.monsterId,
    unique: partial.unique,
    beast: partial.beast ?? false,
    acted: false,
    moved: false,
    kills: {},
    crystal: null,
  }
  if (job?.monster) unit.monsterId = unit.monsterId ?? job.id
  for (const id of innateAbilityIds(unit.job)) {
    if (!unit.learned.includes(id)) unit.learned.push(id)
  }
  refreshVitals(unit, true)
  applyBrave(unit, unit.brave)
  return unit
}

export function jobOf(unit: Unit): JobDef {
  return JOBS[unit.job] ?? JOBS.squire
}

export function classOf(unit: Unit) {
  if (unit.unique === 'ramza' && (unit.job === 'squire' || unit.job === 'squire-ramza')) {
    return classByIndex('01')
  }
  return classByIndex(jobOf(unit).classIndex)
}

export function applyBrave(unit: Unit, value: number): void {
  unit.brave = clamp(Math.round(value), 0, 100)
  unit.chicken = unit.brave < 10
}

export function applyFaith(unit: Unit, value: number): void {
  unit.faith = clamp(Math.round(value), 0, 100)
}

export function jobLevel(unit: Unit, jobId = unit.job): number {
  let jp = unit.jp[jobId] ?? 0
  if (jobId === 'squire') jp = Math.max(jp, unit.jp['squire-ramza'] ?? 0)
  return jobLevelFromJp(jp)
}

export function canEnterJob(unit: Unit, jobId: string): boolean {
  const next = JOBS[jobId]
  if (!next) return false
  if (next.monster) return false
  if (next.gender && next.gender !== unit.sex) return false
  if (next.special && next.special !== unit.unique) return false
  if (unit.sex === 'monster') return false
  return next.prereq.every((need) => jobLevel(unit, need.job) >= need.level)
}

export function changeJob(unit: Unit, jobId: string): boolean {
  if (!canEnterJob(unit, jobId)) return false
  unit.job = jobId
  if (unit.secondary === jobId) unit.secondary = null
  if ((unit.jp[jobId] ?? 0) < 100 && !JOBS[jobId].special) unit.jp[jobId] = 100
  for (const id of innateAbilityIds(jobId)) {
    if (!unit.learned.includes(id)) unit.learned.push(id)
  }
  if (unit.right && !canEquip(unit, unit.right)) unit.right = null
  if (unit.left && !canEquip(unit, unit.left)) unit.left = null
  if (unit.head && !canEquip(unit, unit.head)) unit.head = null
  if (unit.body && !canEquip(unit, unit.body)) unit.body = null
  refreshVitals(unit, false)
  return true
}

export function learnAbility(unit: Unit, abilityId: string): boolean {
  const ability = ABILITIES[abilityId]
  if (!ability) return false
  if (unit.learned.includes(abilityId)) return true
  if ((unit.jp[ability.job] ?? 0) < ability.jp) return false
  unit.learned.push(abilityId)
  return true
}

export function grantJp(unit: Unit, jobId: string, amount: number): void {
  unit.jp[jobId] = (unit.jp[jobId] ?? 0) + amount
}

export function knows(unit: Unit, abilityId: string): boolean {
  return unit.learned.includes(abilityId)
}

/** An action fires only from the current job or the equipped secondary command. */
export function canExecute(unit: Unit, abilityId: string): boolean {
  const ability = ABILITIES[abilityId]
  if (!ability || !unit.learned.includes(abilityId)) return false
  if (ability.job === 'squire-ramza' && unit.unique !== 'ramza') return false
  if (ability.slot === 'action') {
    const jobOk = unit.job === ability.job || unit.secondary === ability.job
      || (ability.job === 'squire-ramza' && (unit.job === 'squire' || unit.secondary === 'squire'))
    return jobOk
  }
  if (ability.slot === 'reaction') return unit.reaction === abilityId
  if (ability.slot === 'support') return unit.support === abilityId
  if (ability.slot === 'movement') return unit.movement === abilityId
  return false
}

export function equipAbility(unit: Unit, slot: 'secondary' | 'reaction' | 'support' | 'movement', abilityId: string | null): boolean {
  if (abilityId == null) {
    unit[slot] = null
    return true
  }
  const ability = ABILITIES[abilityId]
  if (!ability || !unit.learned.includes(abilityId)) return false
  if (slot === 'secondary') {
    if (ability.slot !== 'action') return false
    if (ability.job === unit.job) return false
    unit.secondary = ability.job
    return true
  }
  if (ability.slot !== slot) return false
  unit[slot] = abilityId
  return true
}

export function supportFlags(unit: Unit): Set<string> {
  const flags = new Set<string>()
  const consider = [unit.support, unit.movement, unit.reaction]
  for (const id of consider) {
    if (!id || !unit.learned.includes(id)) continue
    const ability = ABILITIES[id]
    if (!ability) continue
    if (ability.effect.startsWith('flag:') || ability.effect.startsWith('move:') || ability.effect.startsWith('reaction:')) {
      flags.add(ability.effect)
    }
  }
  for (const innate of jobOf(unit).innate ?? []) {
    const ability = ABILITIES[innate]
    if (ability) flags.add(ability.effect)
  }
  if (unit.statuses.includes('protect')) flags.add('status:protect')
  if (unit.statuses.includes('shell')) flags.add('status:shell')
  if (unit.statuses.includes('haste')) flags.add('status:haste')
  if (unit.statuses.includes('slow')) flags.add('status:slow')
  if (unit.chicken || unit.statuses.includes('frog')) flags.add('status:chicken')
  return flags
}

export function hasFlag(unit: Unit, effect: string): boolean {
  return supportFlags(unit).has(effect)
}

export function canEquip(unit: Unit, itemId: string): boolean {
  const item = itemById(itemId)
  if (!item) return false
  if (item.category === 'consumable' || item.category === 'throwing') return false
  if ((item.category === 'ribbon' || item.category === 'bag' || item.category === 'perfume' || item.category === 'cloth') && unit.sex !== 'female') {
    return false
  }
  const job = jobOf(unit)
  if (job.monster || job.id === 'mime' || job.id === 'monk') {
    if (job.id === 'monk') return false
    if (job.id === 'mime') return false
  }
  const flags = supportFlags(unit)
  const cat = item.category
  if (cat === 'shield') return job.shield || flags.has('flag:equip-shield')
  if (isWeapon(cat)) {
    if (job.weapons.includes(cat)) return true
    if (cat === 'axe' && flags.has('flag:equip-axe')) return true
    if (cat === 'sword' && flags.has('flag:equip-sword')) return true
    if (cat === 'katana' && flags.has('flag:equip-katana')) return true
    if (cat === 'spear' && flags.has('flag:equip-spear')) return true
    if (cat === 'gun' && flags.has('flag:equip-gun')) return true
    if (cat === 'crossbow' && flags.has('flag:equip-crossbow')) return true
    return false
  }
  if (isHead(cat)) return job.head.includes(cat)
  if (isBody(cat)) {
    if (job.body.includes(cat)) return true
    if (cat === 'armor' && flags.has('flag:equip-armor')) return true
    return false
  }
  if (isAccessory(cat)) return true
  return false
}

export function equipItem(unit: Unit, itemId: string): boolean {
  const item = itemById(itemId)
  if (!item || !canEquip(unit, itemId)) return false
  const cat = item.category
  if (cat === 'shield') {
    if (unit.right && itemById(unit.right)?.twoHands) return false
    unit.left = itemId
  } else if (isWeapon(cat)) {
    if (item.twoHands) unit.left = null
    if (unit.right && hasFlag(unit, 'flag:two-swords') && !item.twoHands && itemById(unit.right)?.twoSwords) {
      unit.left = itemId
    } else {
      unit.right = itemId
      if (item.twoHands) unit.left = null
    }
  } else if (isHead(cat)) unit.head = itemId
  else if (isBody(cat)) unit.body = itemId
  else if (isAccessory(cat)) unit.accessory = itemId
  else return false
  refreshVitals(unit, false)
  return true
}

export function unequipSlot(unit: Unit, slot: 'right' | 'left' | 'head' | 'body' | 'accessory'): void {
  unit[slot] = null
  refreshVitals(unit, false)
}

function gearList(unit: Unit): ItemDef[] {
  return [unit.right, unit.left, unit.head, unit.body, unit.accessory]
    .map((id) => (id ? itemById(id) : undefined))
    .filter((item): item is ItemDef => !!item)
}

export function maxHp(unit: Unit): number {
  const cls = classOf(unit)
  const base = surfaceStat(unit.raw.hp, cls.mul.hp, unit.beast)
  return base + gearList(unit).reduce((sum, item) => sum + item.hp, 0)
}

export function maxMp(unit: Unit): number {
  const cls = classOf(unit)
  const base = surfaceStat(unit.raw.mp, cls.mul.mp, unit.beast)
  return base + gearList(unit).reduce((sum, item) => sum + item.mp, 0)
}

export function speedOf(unit: Unit): number {
  const cls = classOf(unit)
  let sp = surfaceStat(unit.raw.sp, cls.mul.sp, false) + unit.spMod
  sp += gearList(unit).reduce((sum, item) => sum + item.speed, 0)
  if (unit.statuses.includes('haste')) sp = Math.floor(sp * 1.5)
  if (unit.statuses.includes('slow')) sp = Math.max(1, Math.floor(sp * 2 / 3))
  return clamp(sp, 1, 50)
}

export function paOf(unit: Unit): number {
  const cls = classOf(unit)
  const base = surfaceStat(unit.raw.pa, cls.mul.pa, false) + unit.paMod
  return clamp(base + gearList(unit).reduce((sum, item) => sum + item.pa, 0), 1, 99)
}

export function maOf(unit: Unit): number {
  const cls = classOf(unit)
  const base = surfaceStat(unit.raw.ma, cls.mul.ma, false) + unit.maMod
  return clamp(base + gearList(unit).reduce((sum, item) => sum + item.ma, 0), 1, 99)
}

export function moveOf(unit: Unit): number {
  let move = jobOf(unit).move
  if (hasFlag(unit, 'move:+1')) move += 1
  if (hasFlag(unit, 'move:+2')) move += 2
  if (hasFlag(unit, 'move:+3')) move += 3
  if (unit.chicken) move = 1
  return move
}

export function jumpOf(unit: Unit): number {
  let jump = jobOf(unit).jump
  if (hasFlag(unit, 'move:jump+1')) jump += 1
  if (hasFlag(unit, 'move:jump+2')) jump += 2
  if (hasFlag(unit, 'move:fly') || hasFlag(unit, 'move:ignore-height') || hasFlag(unit, 'move:teleport')) return 99
  return jump
}

export function weaponItem(unit: Unit): ItemDef | null {
  if (!unit.right) return null
  const item = itemById(unit.right)
  if (!item || !isWeapon(item.category)) return null
  if (!canEquip(unit, item.id)) return null
  return item
}

export function weaponPower(unit: Unit): number {
  return weaponItem(unit)?.wp ?? 0
}

export function refreshVitals(unit: Unit, fill: boolean): void {
  const hp = maxHp(unit)
  const mp = maxMp(unit)
  if (fill || unit.hp > hp) unit.hp = hp
  if (fill) unit.mp = mp
  else if (unit.mp > mp) unit.mp = mp
  if (unit.hp <= 0) unit.hp = fill ? hp : 0
}

export function gainExp(unit: Unit, amount: number): boolean {
  if (unit.sex === 'monster' && unit.job !== unit.monsterId) return false
  unit.exp += amount
  let leveled = false
  while (unit.exp >= 100 && unit.level < 99) {
    unit.exp -= 100
    const cls = classOf(unit)
    unit.raw = {
      hp: levelUpRaw(unit.raw.hp, cls.c.hp, unit.level),
      mp: levelUpRaw(unit.raw.mp, cls.c.mp, unit.level),
      sp: levelUpRaw(unit.raw.sp, cls.c.sp, unit.level),
      pa: levelUpRaw(unit.raw.pa, cls.c.pa, unit.level),
      ma: levelUpRaw(unit.raw.ma, cls.c.ma, unit.level),
    }
    unit.level += 1
    leveled = true
  }
  if (leveled) refreshVitals(unit, false)
  return leveled
}

export function actionAbilities(unit: Unit): AbilityDef[] {
  const out: AbilityDef[] = []
  const jobs = new Set<string>([unit.job])
  if (unit.secondary) jobs.add(unit.secondary)
  for (const id of unit.learned) {
    const ability = ABILITIES[id]
    if (!ability || ability.slot !== 'action') continue
    if (!jobs.has(ability.job)) continue
    out.push(ability)
  }
  return out
}

export function permanentBraveFaith(unit: Unit): void {
  const braveDelta = unit.brave - unit.baseBrave
  const faithDelta = unit.faith - unit.baseFaith
  unit.baseBrave = clamp(unit.baseBrave + Math.trunc(braveDelta / 4), 0, 100)
  unit.baseFaith = clamp(unit.baseFaith + Math.trunc(faithDelta / 4), 0, 100)
  unit.brave = unit.baseBrave
  unit.faith = unit.baseFaith
  applyBrave(unit, unit.brave)
}

export function cloneUnit(unit: Unit): Unit {
  return {
    ...unit,
    raw: { ...unit.raw },
    jp: { ...unit.jp },
    learned: [...unit.learned],
    statuses: [...unit.statuses],
    kills: { ...unit.kills },
    charging: unit.charging ? { ...unit.charging } : null,
  }
}
