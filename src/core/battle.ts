import { itemById, poachDrop } from '../data/content'
import { ABILITIES, type AbilityDef } from '../data/jobs'
import {
  emptyMods,
  faithSuccess,
  lichDamage,
  magicalHitPercent,
  magicDamage,
  physicalHitPercent,
  weaponDamage,
  type EvadeProfile,
  type Facing,
  type StrikeMods,
} from './formulas'
import { expForAction, jpForAction } from './growth'
import { idiv } from './int'
import { mulberry32, type Rng } from './rng'
import {
  actionAbilities,
  applyBrave,
  applyFaith,
  canExecute,
  gainExp,
  grantJp,
  hasFlag,
  jobLevel,
  jobOf,
  jumpOf,
  maOf,
  maxHp,
  moveOf,
  paOf,
  speedOf,
  weaponItem,
  type Unit,
} from './unit'
import { compatibility, zodiacScale } from './zodiac'

export interface Tile {
  x: number
  y: number
  /** Height in tenths. 10 is one full height unit. */
  h: number
  blocked: boolean
  terrain: string
  moveFind?: { common: string; rare: string; taken: boolean }
}

export interface Battle {
  id: string
  tiles: Tile[]
  w: number
  h: number
  units: Unit[]
  rng: Rng
  result: null | 'victory' | 'defeat'
  objectiveText: string
  objectiveType: 'defeat-all' | 'defeat-one' | 'protect'
  objectiveUnitId?: string
  activeId: string | null
  phase: 'clock' | 'input' | 'done'
  undo: null | { id: string; x: number; y: number; facing: Unit['facing'] }
  log: string[]
  tick: number
  dark: boolean
  hiddenExits: { x: number; y: number }[]
  exitBy: null | 'player' | 'enemy'
  lastAction: null | { abilityId: string; casterId: string; x: number; y: number; targetId?: string }
  stock: Record<string, number>
  fur: Record<string, number>
  invited: string[]
  reactionsFired: string[]
}

export interface BattleSetup {
  id: string
  w: number
  h: number
  tiles?: Tile[]
  heights?: (number | null)[][]
  terrain?: string
  units: Unit[]
  objectiveText: string
  objectiveType: 'defeat-all' | 'defeat-one' | 'protect'
  objectiveUnitId?: string
  dark?: boolean
  hiddenExits?: { x: number; y: number }[]
  stock?: Record<string, number>
}

const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

export function grid(w: number, h: number, heightAt: (x: number, y: number) => number | null, terrain = 'stone'): Tile[] {
  const tiles: Tile[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const height = heightAt(x, y)
      tiles.push({
        x, y,
        h: height ?? 0,
        blocked: height == null,
        terrain,
      })
    }
  }
  return tiles
}

export function makeBattle(setup: BattleSetup, rng: Rng = mulberry32(1)): Battle {
  let tiles = setup.tiles
  if (!tiles && setup.heights) {
    tiles = []
    const rows = setup.heights
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const height = rows[y][x]
        tiles.push({ x, y, h: height ?? 0, blocked: height == null, terrain: setup.terrain ?? 'stone' })
      }
    }
  }
  if (!tiles) tiles = grid(setup.w, setup.h, () => 0, setup.terrain ?? 'stone')
  return {
    id: setup.id,
    tiles,
    w: setup.w,
    h: setup.h,
    units: setup.units,
    rng,
    result: null,
    objectiveText: setup.objectiveText,
    objectiveType: setup.objectiveType,
    objectiveUnitId: setup.objectiveUnitId,
    activeId: null,
    phase: 'clock',
    undo: null,
    log: [],
    tick: 0,
    dark: setup.dark ?? false,
    hiddenExits: setup.hiddenExits ?? [],
    exitBy: null,
    lastAction: null,
    stock: { ...(setup.stock ?? {}) },
    fur: {},
    invited: [],
    reactionsFired: [],
  }
}

export function tileAt(battle: Battle, x: number, y: number): Tile | undefined {
  return battle.tiles.find((tile) => tile.x === x && tile.y === y)
}

export function unitAt(battle: Battle, x: number, y: number): Unit | undefined {
  return battle.units.find((unit) => unit.x === x && unit.y === y && !unit.crystal && !unit.dead)
}

export function fighting(unit: Unit): boolean {
  return !unit.dead && !unit.crystal && unit.hp > 0
}

export function evadeProfile(unit: Unit): EvadeProfile {
  const cev = jobOf(unit).cev
  let sev = 0
  let magicSev = 0
  let aev = 0
  let magicAev = 0
  let wev = 0
  const left = unit.left ? itemById(unit.left) : undefined
  if (left?.category === 'shield') {
    sev = left.evade
    magicSev = left.magicEvade
  }
  const acc = unit.accessory ? itemById(unit.accessory) : undefined
  if (acc) {
    aev += acc.evade
    magicAev += acc.magicEvade
  }
  if (hasFlag(unit, 'flag:weapon-guard')) {
    const right = unit.right ? itemById(unit.right) : undefined
    wev = right?.evade ?? 0
  }
  const doubled = hasFlag(unit, 'flag:abandon') || unit.statuses.includes('defending')
  const bump = (n: number) => Math.min(95, doubled ? n * 2 : n)
  return { cev: bump(cev), sev: bump(sev), aev: bump(aev), wev: bump(wev), magicSev: bump(magicSev), magicAev: bump(magicAev) }
}

const FACE: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

/** Front, side, or back from the attacker's panel, per the facing diagram in section 1.4. */
export function relativeFacing(ax: number, ay: number, tx: number, ty: number, targetFacing: number): Facing {
  const dx = ax - tx
  const dy = ay - ty
  const [fx, fy] = FACE[targetFacing] ?? [0, 1]
  const forward = dx * fx + dy * fy
  const side = Math.abs(dx * fy - dy * fx)
  const front = Math.max(0, forward)
  const back = Math.max(0, -forward)
  if (front >= side && front >= back) return 'front'
  if (side >= back) return 'side'
  return 'back'
}

function modsFor(attacker: Unit, defender: Unit, critical: boolean, critBonus: number): StrikeMods {
  const compat = compatibility(attacker.zodiac, defender.zodiac, attacker.sex, defender.sex)
  const weapon = weaponItem(attacker)
  const mods = emptyMods(compat)
  mods.critical = critical
  mods.critBonus = critBonus
  mods.attackUp = hasFlag(attacker, 'flag:attack-up')
  mods.martialArts = hasFlag(attacker, 'flag:martial-arts')
  mods.berserk = attacker.statuses.includes('berserk')
  mods.defenseUp = hasFlag(defender, 'flag:defense-up')
  mods.protect = defender.statuses.includes('protect')
  mods.charging = defender.charging != null
  mods.sleeping = defender.statuses.includes('sleep')
  mods.chickenOrFrog = defender.chicken || defender.statuses.includes('frog')
  mods.strengthen = !!weapon?.element && attackerHasStrengthen(attacker, weapon.element)
  mods.weak = !!weapon?.element && defender.statuses.includes(`weak:${weapon.element}`)
  mods.half = !!weapon?.element && defender.statuses.includes(`half:${weapon.element}`)
  mods.absorb = !!weapon?.element && defender.statuses.includes(`absorb:${weapon.element}`)
  mods.twoHands = hasFlag(attacker, 'flag:two-hands') && !!weapon && !weapon.twoHands && !unitShield(attacker)
  return mods
}

function unitShield(unit: Unit): boolean {
  const left = unit.left ? itemById(unit.left) : undefined
  return left?.category === 'shield'
}

function attackerHasStrengthen(unit: Unit, element: string): boolean {
  return [unit.accessory, unit.body, unit.head].some((id) => {
    const item = id ? itemById(id) : undefined
    return item?.element === element && item.adds.some((add) => /strengthen/i.test(add))
  })
}

/** Deterministic attack number used by equipment checks and the damage preview. */
export function previewAttack(attacker: Unit, defender: Unit): number {
  const weapon = weaponItem(attacker)
  const kind = weapon?.category ?? 'bare'
  const mods = modsFor(attacker, defender, false, 0)
  return weaponDamage(kind, paOf(attacker), maOf(attacker), speedOf(attacker), attacker.brave, weapon?.wp ?? 0, paOf(attacker), mods)
}

export function canStep(battle: Battle, unit: Unit, from: Tile, to: Tile): boolean {
  if (to.blocked) return false
  const occupied = unitAt(battle, to.x, to.y)
  if (occupied && occupied.id !== unit.id) return false
  const delta = Math.abs(to.h - from.h)
  if (delta > jumpOf(unit) * 10) return false
  return true
}

export function reachable(battle: Battle, unit: Unit): Tile[] {
  const start = tileAt(battle, unit.x, unit.y)
  if (!start || !fighting(unit)) return []
  const budget = moveOf(unit)
  const best = new Map<string, number>([[`${unit.x},${unit.y}`, 0]])
  const queue = [{ x: unit.x, y: unit.y, cost: 0 }]
  const out: Tile[] = []
  while (queue.length) {
    const current = queue.shift()!
    const from = tileAt(battle, current.x, current.y)
    if (!from) continue
    if (current.cost > 0) out.push(from)
    if (current.cost >= budget) continue
    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx
      const ny = current.y + dy
      const next = tileAt(battle, nx, ny)
      if (!next || !canStep(battle, unit, from, next)) continue
      const key = `${nx},${ny}`
      const spent = current.cost + 1
      if ((best.get(key) ?? 99) <= spent) continue
      best.set(key, spent)
      queue.push({ x: nx, y: ny, cost: spent })
    }
  }
  return out
}

export function moveUnit(battle: Battle, unit: Unit, x: number, y: number): boolean {
  if (unit.moved || battle.result) return false
  const options = reachable(battle, unit)
  const dest = options.find((tile) => tile.x === x && tile.y === y)
  if (!dest) return false
  if (!battle.undo) battle.undo = { id: unit.id, x: unit.x, y: unit.y, facing: unit.facing }
  const dx = x - unit.x
  const dy = y - unit.y
  if (Math.abs(dx) > Math.abs(dy)) unit.facing = dx > 0 ? 1 : 3
  else if (dy !== 0) unit.facing = dy > 0 ? 2 : 0
  unit.x = x
  unit.y = y
  unit.moved = true
  battle.log.push(`${unit.name} moves.`)
  const found = searchMoveFind(battle, unit, x, y)
  if (found) battle.log.push(`${unit.name} finds ${found}.`)
  const exit = battle.hiddenExits.find((spot) => spot.x === x && spot.y === y)
  if (exit && !battle.exitBy) {
    battle.exitBy = unit.side === 'enemy' ? 'enemy' : 'player'
    battle.log.push(battle.exitBy === 'player' ? 'A hidden stair answers.' : 'The enemy reaches the hidden stair.')
  }
  return true
}

export function undoMove(battle: Battle): boolean {
  if (!battle.undo) return false
  const unit = battle.units.find((candidate) => candidate.id === battle.undo?.id)
  if (!unit || unit.acted) return false
  unit.x = battle.undo.x
  unit.y = battle.undo.y
  unit.facing = battle.undo.facing
  unit.moved = false
  battle.undo = null
  return true
}

export function searchMoveFind(battle: Battle, unit: Unit, x: number, y: number): string | null {
  if (!hasFlag(unit, 'move:find')) return null
  const tile = tileAt(battle, x, y)
  if (!tile?.moveFind || tile.moveFind.taken) return null
  const rareChance = 100 - unit.brave
  const itemId = battle.rng.d100() < rareChance ? tile.moveFind.rare : tile.moveFind.common
  tile.moveFind.taken = true
  battle.stock[itemId] = (battle.stock[itemId] ?? 0) + 1
  return itemId
}

export function endTurn(battle: Battle, unit: Unit, kind: 'both' | 'move' | 'act' | 'wait'): void {
  const cost = kind === 'both' ? 100 : kind === 'wait' ? 60 : 80
  unit.ct -= cost
  if (unit.ct > 60) unit.ct = 60
  if (unit.ct < 0) unit.ct = 0
  unit.moved = false
  unit.acted = false
  battle.undo = null
  if (battle.activeId === unit.id) battle.activeId = null
  battle.phase = 'clock'
  if (unit.chicken) {
    applyBrave(unit, unit.brave + 1)
  }
}

export function clockTick(battle: Battle): void {
  battle.tick += 1
  for (const unit of battle.units) {
    if (unit.crystal) continue
    const frozen = !unit.dead && (unit.statuses.includes('stop') || unit.statuses.includes('petrify') || unit.statuses.includes('sleep'))
    if (frozen) continue
    unit.ct += speedOf(unit)
  }
  for (const unit of battle.units) {
    if (!unit.charging) continue
    unit.charging.ctr -= 1
    if (unit.charging.ctr <= 0) {
      const charge = unit.charging
      unit.charging = null
      resolveAbility(battle, unit, charge.abilityId, charge.x, charge.y, charge.targetId, true)
    }
  }
  for (const unit of battle.units) {
    if (!unit.dead || unit.deathCount == null || unit.crystal) continue
    if (unit.ct < 100) continue
    unit.deathCount -= 1
    unit.ct -= 60
    if (unit.ct > 60) unit.ct = 60
    if (unit.ct < 0) unit.ct = 0
    if (unit.deathCount <= -1) crystallize(battle, unit)
  }
  for (const unit of battle.units) {
    if (!fighting(unit)) continue
    if (unit.statuses.includes('poison')) applyHp(battle, unit, -Math.max(1, idiv(maxHp(unit), 8)), null)
    if (unit.statuses.includes('regen')) applyHp(battle, unit, Math.max(1, idiv(maxHp(unit), 8)), null)
  }
  checkEnd(battle)
}

function crystallize(battle: Battle, unit: Unit): void {
  unit.crystal = battle.rng.d100() < 50 ? 'crystal' : 'chest'
  unit.dead = true
  unit.deathCount = null
  battle.log.push(`${unit.name} becomes a ${unit.crystal}.`)
  if (unit.required || (battle.objectiveType === 'protect' && unit.id === battle.objectiveUnitId)) {
    battle.result = 'defeat'
    battle.phase = 'done'
  }
  checkEnd(battle)
}

export function applyHp(battle: Battle, unit: Unit, delta: number, source: Unit | null): void {
  if (unit.crystal) return
  if (unit.statuses.includes('golem') && delta < 0) {
    const absorbed = Math.min(100, -delta)
    delta += absorbed
    if (absorbed >= 100) unit.statuses = unit.statuses.filter((status) => status !== 'golem')
  }
  const before = unit.hp
  unit.hp = Math.max(0, Math.min(maxHp(unit), unit.hp + delta))
  if (unit.hp === 0 && before > 0) down(battle, unit, source)
  if (delta > 0 && unit.hp > 0 && unit.dead) {
    unit.dead = false
    unit.deathCount = null
  }
  checkEnd(battle)
}

function down(battle: Battle, unit: Unit, source: Unit | null): void {
  if (unit.statuses.includes('reraise')) {
    unit.statuses = unit.statuses.filter((status) => status !== 'reraise')
    unit.hp = Math.max(1, idiv(maxHp(unit), 10))
    battle.log.push(`${unit.name} rises again.`)
    return
  }
  unit.dead = true
  unit.deathCount = 3
  unit.hp = 0
  unit.charging = null
  unit.ct = 0
  unit.statuses = unit.statuses.filter((status) => status === 'undead')
  battle.log.push(`${unit.name} falls.`)
  if (source && fighting(source)) {
    const prev = source.kills[unit.id] ?? 0
    gainExp(source, expForAction(source.level, unit.level, prev, hasFlag(source, 'flag:exp-up')))
    const job = source.job === 'squire-ramza' ? 'squire' : source.job
    const gained = jpForAction(Math.max(1, jobLevel(source, job)), source.level, hasFlag(source, 'flag:jp-up'))
    grantJp(source, job, gained)
    if (source.job === 'squire-ramza') grantJp(source, 'squire-ramza', gained)
    source.kills[unit.id] = prev + 1
    if (hasFlag(source, 'flag:secret-hunt') && unit.monsterId) {
      const drop = poachDrop(unit.monsterId, battle.rng.d100())
      if (drop) {
        battle.fur[drop] = (battle.fur[drop] ?? 0) + 1
        battle.log.push(`Poach yields ${drop}.`)
      }
    }
  }
  if (unit.objective || (battle.objectiveType === 'defeat-one' && unit.id === battle.objectiveUnitId)) {
    battle.result = 'victory'
    battle.phase = 'done'
  }
}

export function reviveUnit(battle: Battle, unit: Unit, hp: number): void {
  unit.dead = false
  unit.deathCount = null
  unit.crystal = null
  unit.hp = Math.max(1, Math.min(maxHp(unit), hp))
  battle.log.push(`${unit.name} is revived.`)
}

function checkEnd(battle: Battle): void {
  if (battle.result) {
    battle.phase = 'done'
    return
  }
  const allies = battle.units.filter((unit) => unit.side !== 'enemy')
  const enemies = battle.units.filter((unit) => unit.side === 'enemy')
  if (allies.length && allies.every((unit) => !fighting(unit))) {
    battle.result = 'defeat'
    battle.phase = 'done'
    return
  }
  if (battle.objectiveType === 'defeat-all' && enemies.length && enemies.every((unit) => !fighting(unit))) {
    battle.result = 'victory'
    battle.phase = 'done'
  }
  if (battle.objectiveType === 'defeat-one') {
    const target = battle.units.find((unit) => unit.id === battle.objectiveUnitId)
    if (target && !fighting(target)) {
      battle.result = 'victory'
      battle.phase = 'done'
    }
  }
}

export function readyUnits(battle: Battle): Unit[] {
  return battle.units.filter((unit) => (
    fighting(unit)
    && !unit.charging
    && unit.ct >= 100
    && !unit.statuses.includes('stop')
    && !unit.statuses.includes('petrify')
    && !unit.statuses.includes('sleep')
  ))
}

export function forecast(battle: Battle, count = 8): { id: string; name: string; ticks: number }[] {
  const sim = battle.units.filter((unit) => !unit.crystal).map((unit) => ({
    id: unit.id,
    name: unit.name,
    ct: unit.ct,
    sp: speedOf(unit),
    dead: unit.dead,
    ctr: unit.charging?.ctr ?? 0,
  }))
  const out: { id: string; name: string; ticks: number }[] = []
  for (let t = 1; t <= 48 && out.length < count; t++) {
    for (const unit of sim) {
      if (unit.ctr > 0) {
        unit.ctr -= 1
        if (unit.ctr === 0) out.push({ id: unit.id, name: `${unit.name} resolves`, ticks: t })
      }
      unit.ct += unit.sp
      if (!unit.dead && unit.ct >= 100) {
        out.push({ id: unit.id, name: unit.name, ticks: t })
        unit.ct = Math.min(60, unit.ct - 100)
        if (out.length >= count) break
      }
    }
  }
  return out.slice(0, count)
}

export function inRange(ax: number, ay: number, tx: number, ty: number, range: number, fromH: number, toH: number, vert: number): boolean {
  const dist = Math.abs(ax - tx) + Math.abs(ay - ty)
  if (dist === 0 || dist > range) return false
  return Math.abs(fromH - toH) <= vert * 10
}

export function abilityTargets(battle: Battle, unit: Unit, ability: AbilityDef): Tile[] {
  const origin = tileAt(battle, unit.x, unit.y)
  if (!origin) return []
  const range = ability.range === 0 ? 0 : ability.range
  if (range === 0) return [origin]
  return battle.tiles.filter((tile) => {
    if (tile.blocked) return false
    return inRange(unit.x, unit.y, tile.x, tile.y, range, origin.h, tile.h, ability.vert || 3)
  })
}

export function weaponRangeTiles(battle: Battle, unit: Unit, fromX = unit.x, fromY = unit.y): Tile[] {
  const weapon = weaponItem(unit)
  const kind = weapon?.category ?? 'bare'
  let range = 1
  let min = 1
  if (kind === 'spear' || kind === 'stick' || kind === 'cloth') range = 2
  if (kind === 'bow' || kind === 'crossbow' || kind === 'gun' || kind === 'instrument' || kind === 'dictionary') {
    min = 3
    range = kind === 'gun' ? 8 : kind === 'bow' ? 5 : 4
  }
  const origin = tileAt(battle, fromX, fromY)
  if (!origin) return []
  return battle.tiles.filter((tile) => {
    const dist = Math.abs(fromX - tile.x) + Math.abs(fromY - tile.y)
    if (dist < min || dist > range) return false
    return Math.abs(origin.h - tile.h) <= 30
  })
}

export function resolveWeaponHit(battle: Battle, attacker: Unit, defender: Unit): { hit: boolean; damage: number; facing: Facing; reaction: boolean } {
  const facing = relativeFacing(attacker.x, attacker.y, defender.x, defender.y, defender.facing)
  const weapon = weaponItem(attacker)
  const kind = weapon?.category ?? 'bare'
  const ev = evadeProfile(defender)
  let hitChance = kind === 'gun' || hasFlag(attacker, 'flag:concentrate')
    ? 100
    : physicalHitPercent(100, facing, ev)
  const hitRoll = battle.rng.d100()
  const hit = hitRoll < hitChance
  if (!hit) {
    battle.log.push(`${attacker.name} misses ${defender.name}.`)
    return { hit: false, damage: 0, facing, reaction: false }
  }
  const critRoll = battle.rng.d100()
  const critical = kind !== 'gun' && critRoll < 5
  const xa = kind === 'bare' ? idiv(paOf(attacker) * attacker.brave, 100) : paOf(attacker)
  const critBonus = critical ? Math.max(0, (battle.rng.int(Math.max(1, xa)) + 1) - 1) : 0
  const roll = battle.rng.int(Math.max(1, paOf(attacker))) + 1
  const damage = weaponDamage(kind, paOf(attacker), maOf(attacker), speedOf(attacker), attacker.brave, weapon?.wp ?? 0, roll, modsFor(attacker, defender, critical, critBonus))
  applyHp(battle, defender, -Math.max(0, damage), attacker)
  battle.log.push(`${attacker.name} hits ${defender.name} for ${damage} (${facing}).`)
  const reaction = hit ? tryReaction(battle, defender, attacker) : false
  return { hit: true, damage, facing, reaction }
}

export function tryReaction(battle: Battle, defender: Unit, attacker: Unit): boolean {
  if (!fighting(defender) || !defender.reaction) return false
  if (!canExecute(defender, defender.reaction)) return false
  const ability = ABILITIES[defender.reaction]
  if (!ability || !ability.effect.startsWith('reaction:')) return false
  const roll = battle.rng.d100()
  if (roll >= defender.brave) return false
  battle.reactionsFired.push(ability.id)
  if (ability.effect === 'reaction:auto-potion') {
    const heal = (battle.stock.potion ?? 0) > 0 ? 30 : (battle.stock['hi-potion'] ?? 0) > 0 ? 70 : 30
    applyHp(battle, defender, heal, null)
    battle.log.push(`${defender.name} drinks a potion.`)
    return true
  }
  if (ability.effect === 'reaction:brave-up') {
    applyBrave(defender, defender.brave + 1)
    return true
  }
  if (ability.effect === 'reaction:counter' || ability.effect === 'reaction:counter-magic') {
    const weapon = weaponItem(defender)
    const kind = weapon?.category ?? 'bare'
    const damage = Math.max(1, weaponDamage(
      kind,
      paOf(defender),
      maOf(defender),
      speedOf(defender),
      defender.brave,
      weapon?.wp ?? 0,
      paOf(defender),
      modsFor(defender, attacker, false, 0),
    ))
    applyHp(battle, attacker, -damage, defender)
    battle.log.push(`${defender.name} counters.`)
    return true
  }
  return false
}

export function cast(battle: Battle, unit: Unit, abilityId: string, x: number, y: number): boolean {
  if (battle.result || unit.acted) return false
  const ability = ABILITIES[abilityId]
  if (!ability || !canExecute(unit, abilityId)) return false
  if (ability.mp > 0 && unit.mp < ability.mp) return false
  const tiles = abilityTargets(battle, unit, ability)
  const self = ability.range === 0
  if (!self && !tiles.some((tile) => tile.x === x && tile.y === y)) return false
  if (ability.mp > 0) unit.mp -= hasFlag(unit, 'flag:half-mp') ? idiv(ability.mp, 2) : ability.mp
  unit.acted = true
  battle.undo = null
  let ctr = ability.ctr
  if (ability.effect.startsWith('charge:')) ctr = Number(ability.effect.split(':')[1] ? chargeCtr(Number(ability.effect.split(':')[1])) : ability.ctr)
  if (hasFlag(unit, 'flag:short-charge') && ctr > 0 && !ability.effect.startsWith('charge:') && ability.effect !== 'jump') {
    ctr = Math.max(1, idiv(ctr, 2))
  }
  if (ability.effect === 'jump') ctr = Math.max(1, idiv(50, speedOf(unit)))
  if (ctr > 0) {
    const target = unitAt(battle, x, y)
    unit.charging = { abilityId, ctr, x, y, targetId: target?.id }
    battle.log.push(`${unit.name} begins ${ability.name}.`)
    return true
  }
  resolveAbility(battle, unit, abilityId, x, y, unitAt(battle, x, y)?.id, false)
  return true
}

function chargeCtr(k: number): number {
  const table: Record<number, number> = { 1: 4, 2: 5, 3: 6, 4: 8, 5: 10, 7: 14, 10: 20, 20: 35 }
  return table[k] ?? 4
}

function resolveAbility(battle: Battle, unit: Unit, abilityId: string, x: number, y: number, targetId: string | undefined, charged: boolean): void {
  const ability = ABILITIES[abilityId]
  if (!ability || !fighting(unit) && ability.effect !== 'mimic') return
  battle.lastAction = { abilityId, casterId: unit.id, x, y, targetId }
  const targets = collectTargets(battle, unit, ability, x, y, targetId)
  for (const target of targets) applyEffect(battle, unit, target, ability)
  if (!charged) battle.log.push(`${unit.name} uses ${ability.name}.`)
}

function collectTargets(battle: Battle, unit: Unit, ability: AbilityDef, x: number, y: number, targetId?: string): Unit[] {
  if (ability.effect === 'math') {
    return battle.units.filter((candidate) => fighting(candidate) && (candidate.level % 4 === 0 || candidate.ct % 5 === 0))
  }
  if (ability.range === 0 && ability.aoe === 0) return [unit]
  const center = targetId ? battle.units.find((candidate) => candidate.id === targetId) : unitAt(battle, x, y)
  const list: Unit[] = []
  for (const candidate of battle.units) {
    if (candidate.crystal) continue
    const dist = Math.abs(candidate.x - x) + Math.abs(candidate.y - y)
    if (dist <= ability.aoe) list.push(candidate)
  }
  if (list.length === 0 && center) list.push(center)
  if (ability.effect === 'magic-heal' || ability.effect.startsWith('heal') || ability.effect.startsWith('revive') || ability.effect === 'purge') {
    return list.filter((candidate) => candidate.side === unit.side || candidate.id === unit.id)
  }
  return list.length ? list : center ? [center] : []
}

function applyEffect(battle: Battle, caster: Unit, target: Unit, ability: AbilityDef): void {
  const effect = ability.effect
  const compat = compatibility(caster.zodiac, target.zodiac, caster.sex, target.sex)
  if (effect === 'pa+1') caster.paMod += 1
  else if (effect === 'sp+1') caster.spMod += 1
  else if (effect === 'brave+4') applyBrave(target, target.brave + 4)
  else if (effect === 'brave-20') applyBrave(target, target.brave - 20)
  else if (effect === 'faith+4') applyFaith(target, target.faith + 4)
  else if (effect === 'faith-20') applyFaith(target, target.faith - 20)
  else if (effect === 'heal:flat') applyHp(battle, target, ability.power || 30, null)
  else if (effect === 'heal:pct') applyHp(battle, target, Math.max(1, idiv(maxHp(target) * (ability.power || 25), 100)), null)
  else if (effect === 'mp:flat') target.mp = Math.min(target.mp + (ability.power || 20), 999)
  else if (effect === 'elixir') {
    applyHp(battle, target, maxHp(target), null)
    target.mp = 999
  }
  else if (effect === 'cancel' && ability.status) {
    const gone = ability.status.split(',')
    target.statuses = target.statuses.filter((status) => !gone.includes(status))
    if (gone.includes('frog')) applyBrave(target, Math.max(target.brave, 10))
  }
  else if (effect === 'purge') target.statuses = target.statuses.filter((status) => status === 'float' || status === 'protect' || status === 'shell')
  else if (effect === 'dash' || effect === 'stone' || effect === 'punch' || effect === 'holy-sword' || effect === 'draw') {
    const base = Math.max(1, (effect === 'holy-sword' ? paOf(caster) * (ability.power || 2) : paOf(caster)) )
    const scaled = zodiacScale(base, compat)
    applyHp(battle, target, -scaled, caster)
  }
  else if (effect === 'draw-heal') applyHp(battle, target, maOf(caster) * 4, null)
  else if (effect.startsWith('charge:')) {
    const k = Number(effect.split(':')[1])
    const weapon = weaponItem(caster)
    const kind = weapon?.category ?? 'bare'
    const damage = weaponDamage(kind, paOf(caster) + k, maOf(caster) + k, speedOf(caster) + k, caster.brave, (weapon?.wp ?? 0), paOf(caster), modsFor(caster, target, false, 0))
    applyHp(battle, target, -Math.max(1, damage), caster)
  }
  else if (effect === 'magic' || effect === 'magic-heal' || effect === 'zodiac-spell') {
    let ma = maOf(caster)
    if (hasFlag(caster, 'flag:magic-attack-up')) ma = idiv(ma * 4, 3)
    if (ability.element && casterHasElementBoost(caster, ability.element)) ma = idiv(ma * 5, 4)
    ma = zodiacScale(ma, compat)
    if (target.statuses.includes('shell') || hasFlag(target, 'flag:magic-defend-up')) ma = idiv(ma * 2, 3)
    const q = ability.power || 14
    let damage = magicDamage(caster.faith, effect === 'magic-heal' ? caster.faith : target.faith, q, ma, 1)
    if (ability.element && target.statuses.includes(`half:${ability.element}`)) damage = idiv(damage, 2)
    if (ability.element && target.statuses.includes(`weak:${ability.element}`)) damage *= 2
    if (effect === 'magic-heal') applyHp(battle, target, Math.max(1, damage), null)
    else {
      const ev = evadeProfile(target)
      const chance = hasFlag(caster, 'flag:concentrate') ? 100 : magicalHitPercent(100, ev)
      if (battle.rng.d100() < chance) {
        applyHp(battle, target, -Math.max(1, damage), caster)
        if (effect === 'zodiac-spell' && target.job === 'summoner' && fighting(target)) {
          if (!target.learned.includes('summoner-zodiac')) target.learned.push('summoner-zodiac')
          battle.log.push(`${target.name} learns Zodiac.`)
        }
      }
    }
  }
  else if (effect === 'lich') {
    const half = target.statuses.includes('half:dark')
    const success = idiv(caster.faith * target.faith * (maOf(caster) + 160), 10000)
    if (battle.rng.d100() < success) applyHp(battle, target, -lichDamage(maxHp(target), half), caster)
  }
  else if (effect === 'pct-hp') {
    const pct = ability.power || 25
    applyHp(battle, target, -Math.max(1, idiv(maxHp(target) * pct, 100)), caster)
  }
  else if (effect === 'add' || effect === 'faith-status') {
    const y = ability.power || 160
    const chance = effect === 'faith-status'
      ? faithSuccess(caster.faith, target.faith, zodiacScale(maOf(caster), compat), y)
      : 100
    if (battle.rng.d100() < chance && ability.status) {
      for (const status of ability.status.split(',')) addStatus(battle, target, status, caster)
    }
  }
  else if (effect.startsWith('break:')) {
    const slot = effect.split(':')[1] as 'head' | 'body' | 'shield' | 'weapon'
    const map = { head: 'head', body: 'body', shield: 'left', weapon: 'right' } as const
    const key = map[slot]
    if (key && target[key]) {
      battle.stock[target[key]!] = (battle.stock[target[key]!] ?? 0)
      target[key] = null
      battle.log.push(`${target.name}'s ${slot} breaks.`)
    }
  }
  else if (effect.startsWith('down:')) {
    const stat = effect.split(':')[1]
    if (stat === 'pa') target.paMod -= ability.power || 2
    if (stat === 'ma') target.maMod -= ability.power || 2
    if (stat === 'sp') target.spMod -= ability.power || 1
    if (stat === 'mp') target.mp = Math.max(0, target.mp - (ability.power || 10))
  }
  else if (effect.startsWith('steal:')) {
    const slot = effect.split(':')[1]
    const chance = Math.min(95, speedOf(caster) + paOf(caster))
    if (battle.rng.d100() < chance) {
      if (slot === 'weapon' && target.right) {
        battle.stock[target.right] = (battle.stock[target.right] ?? 0) + 1
        target.right = null
      } else if (slot === 'head' && target.head) {
        battle.stock[target.head] = (battle.stock[target.head] ?? 0) + 1
        target.head = null
      } else if (slot === 'gil') battle.stock.gil = (battle.stock.gil ?? 0) + 100
    }
  }
  else if (effect === 'invite') {
    if (target.monsterId && target.side === 'enemy') {
      const chance = Math.min(90, paOf(caster) + idiv(caster.faith, 2))
      if (hasFlag(caster, 'flag:monster-talk') || hasFlag(caster, 'flag:train') || battle.rng.d100() < chance) {
        target.side = 'player'
        battle.invited.push(target.monsterId)
        battle.log.push(`${target.name} joins.`)
      }
    }
  }
  else if (effect === 'jump') {
    const weapon = weaponItem(caster)
    const pa = weapon?.category === 'spear' ? idiv(paOf(caster) * 3, 2) : paOf(caster)
    const damage = Math.max(1, zodiacScale(pa, compat) * (weapon?.wp ?? paOf(caster)))
    applyHp(battle, target, -damage, caster)
  }
  else if (effect === 'throw') {
    const thrown = Object.keys(battle.stock).find((id) => (battle.stock[id] ?? 0) > 0 && itemById(id)?.category === 'throwing')
    const wp = thrown ? (itemById(thrown)?.wp || 8) : 8
    if (thrown) battle.stock[thrown] -= 1
    applyHp(battle, target, -Math.max(1, speedOf(caster) * wp), caster)
  }
  else if (effect === 'drain-hp') {
    const amount = Math.max(1, idiv(maxHp(target) * (ability.power || 25), 100))
    applyHp(battle, target, -amount, caster)
    applyHp(battle, caster, amount, null)
  }
  else if (effect === 'drain-mp') {
    const amount = Math.max(1, idiv(target.mp, 4))
    target.mp -= amount
    caster.mp += amount
  }
  else if (effect === 'revive:half' || effect === 'revive:full' || effect === 'revive:phoenix') {
    if (target.dead && !target.crystal) {
      const hp = effect === 'revive:full' ? maxHp(target) : effect === 'revive:half' ? Math.max(1, idiv(maxHp(target), 2)) : 1 + battle.rng.int(20)
      reviveUnit(battle, target, hp)
    }
  }
  else if (effect === 'self-destruct') {
    const amount = caster.hp
    applyHp(battle, target, -amount, caster)
    applyHp(battle, caster, -caster.hp, null)
  }
  else if (effect === 'golem') addStatus(battle, caster, 'golem', caster)
  else if (effect === 'quick') caster.ct = Math.max(caster.ct, 100)
  else if (effect === 'geomancy') {
    const tile = tileAt(battle, caster.x, caster.y)
    const element = tile?.terrain === 'water' ? 'water' : tile?.terrain === 'lava' ? 'fire' : 'earth'
    const ma = zodiacScale(idiv(maOf(caster) + paOf(caster), 2), compat)
    applyHp(battle, target, -Math.max(1, magicDamage(caster.faith, target.faith, 14, ma, 1)), caster)
    battle.log.push(`Geomancy stirs the ${element}.`)
  }
  else if (effect === 'mimic' && battle.lastAction && battle.lastAction.casterId !== caster.id) {
    resolveAbility(battle, caster, battle.lastAction.abilityId, xOr(target, caster), target.y, target.id, true)
  }
  else if (effect === 'math') {
    const ma = zodiacScale(maOf(caster), compat)
    applyHp(battle, target, -Math.max(1, magicDamage(caster.faith, target.faith, 18, ma, 1)), caster)
  }
  else if (effect.startsWith('jump-range')) {
    /* Learned range upgrade. The Jump action reads the highest learned power. */
  }
}

function xOr(target: Unit, caster: Unit): number {
  return target.x || caster.x
}

function casterHasElementBoost(unit: Unit, element: string): boolean {
  return [unit.accessory, unit.head, unit.body].some((id) => itemById(id ?? '')?.element === element)
}

function addStatus(battle: Battle, unit: Unit, status: string, source: Unit | null): void {
  if (status === 'dead') {
    applyHp(battle, unit, -unit.hp, source)
    return
  }
  if (status === 'doom') {
    unit.statuses.push('doom')
    unit.deathCount = unit.deathCount ?? 3
    return
  }
  if (!unit.statuses.includes(status)) unit.statuses.push(status)
  if (status === 'frog' || status === 'chicken') applyBrave(unit, Math.min(unit.brave, 9))
}

export function attackCommand(battle: Battle, unit: Unit, target: Unit): boolean {
  if (unit.acted || !fighting(unit) || !fighting(target)) return false
  if (unit.job === 'mime') return false
  const tiles = weaponRangeTiles(battle, unit)
  if (!tiles.some((tile) => tile.x === target.x && tile.y === target.y)) return false
  unit.acted = true
  battle.undo = null
  resolveWeaponHit(battle, unit, target)
  battle.lastAction = { abilityId: 'attack', casterId: unit.id, x: target.x, y: target.y, targetId: target.id }
  return true
}

export function commitTurn(battle: Battle, unit: Unit): void {
  if (unit.moved && unit.acted) endTurn(battle, unit, 'both')
  else if (unit.moved || unit.acted) endTurn(battle, unit, unit.moved ? 'move' : 'act')
  else endTurn(battle, unit, 'wait')
}

export function enemyTakeTurn(battle: Battle, unit: Unit): void {
  if (unit.chicken) {
    endTurn(battle, unit, 'wait')
    return
  }
  const foes = battle.units.filter((candidate) => candidate.side !== unit.side && fighting(candidate))
  if (foes.length === 0) {
    endTurn(battle, unit, 'wait')
    return
  }
  const spots = [tileAt(battle, unit.x, unit.y)!, ...reachable(battle, unit)].filter(Boolean)
  let choice: { x: number; y: number; foe: Unit } | null = null
  for (const spot of spots) {
    const saved = { x: unit.x, y: unit.y }
    unit.x = spot.x
    unit.y = spot.y
    for (const foe of foes) {
      if (weaponRangeTiles(battle, unit).some((tile) => tile.x === foe.x && tile.y === foe.y)) {
        choice = { x: spot.x, y: spot.y, foe }
        break
      }
    }
    unit.x = saved.x
    unit.y = saved.y
    if (choice) break
  }
  if (choice) {
    if (choice.x !== unit.x || choice.y !== unit.y) moveUnit(battle, unit, choice.x, choice.y)
    attackCommand(battle, unit, choice.foe)
    commitTurn(battle, unit)
    return
  }
  const nearest = foes.slice().sort((a, b) => dist(unit, a) - dist(unit, b))[0]
  const step = reachable(battle, unit).sort((a, b) => Math.abs(a.x - nearest.x) + Math.abs(a.y - nearest.y) - (Math.abs(b.x - nearest.x) + Math.abs(b.y - nearest.y)))[0]
  if (step) moveUnit(battle, unit, step.x, step.y)
  commitTurn(battle, unit)
}

function dist(a: Unit, b: Unit): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function advanceClock(battle: Battle): 'player' | 'enemy' | 'tick' | 'done' {
  if (battle.result) return 'done'
  const ready = readyUnits(battle).sort((a, b) => b.ct - a.ct || speedOf(b) - speedOf(a))
  if (ready.length === 0) {
    clockTick(battle)
    return battle.result ? 'done' : 'tick'
  }
  const unit = ready[0]
  if (unit.side === 'enemy' || unit.chicken) {
    enemyTakeTurn(battle, unit)
    return battle.result ? 'done' : 'enemy'
  }
  battle.activeId = unit.id
  battle.phase = 'input'
  return 'player'
}

export function activeUnit(battle: Battle): Unit | undefined {
  return battle.units.find((unit) => unit.id === battle.activeId)
}

export function learnZodiacBySurvival(unit: Unit, damage: number, hpAfter: number): boolean {
  if (unit.job !== 'summoner' || damage <= 0 || hpAfter <= 0) return false
  if (!unit.learned.includes('summoner-zodiac')) unit.learned.push('summoner-zodiac')
  return true
}
