import { idiv, ru } from './int'
import { zodiacScale, type Compat } from './zodiac'

export interface EvadeProfile {
  cev: number
  sev: number
  aev: number
  wev: number
  magicSev: number
  magicAev: number
}

export type Facing = 'front' | 'side' | 'back'

/** Physical hit% from mechanics guide section 1.4. Base hit is usually 100. */
export function physicalHitPercent(base: number, facing: Facing, ev: EvadeProfile): number {
  if (facing === 'front') {
    return idiv(base * (100 - ev.cev) * (100 - ev.sev) * (100 - ev.aev) * (100 - ev.wev), 100_000_000)
  }
  if (facing === 'side') {
    return idiv(base * (100 - ev.sev) * (100 - ev.aev) * (100 - ev.wev), 1_000_000)
  }
  return idiv(base * (100 - ev.aev), 100)
}

/** Magical hit% from any position. The worked Flare example uses this. */
export function magicalHitPercent(base: number, ev: Pick<EvadeProfile, 'magicSev' | 'magicAev'>): number {
  return idiv(base * (100 - ev.magicSev) * (100 - ev.magicAev), 10_000)
}

export interface WeaponStrike {
  kind: string
  wp: number
  element: string | null
}

export interface StrikeMods {
  critical: boolean
  critBonus: number
  attackUp: boolean
  martialArts: boolean
  berserk: boolean
  defenseUp: boolean
  protect: boolean
  charging: boolean
  sleeping: boolean
  chickenOrFrog: boolean
  strengthen: boolean
  weak: boolean
  half: boolean
  absorb: boolean
  compat: Compat
  twoHands: boolean
}

export function bareXa(pa: number, brave: number): number {
  return idiv(pa * brave, 100)
}

/**
 * Weapon damage after the section 2.1 modifier pipeline.
 * `roll` is the 1..PA roll for axes, flails, and bags. Other kinds ignore it.
 */
export function weaponDamage(
  kind: string,
  pa: number,
  ma: number,
  sp: number,
  brave: number,
  wp: number,
  roll: number,
  mods: StrikeMods,
): number {
  const base = xaFor(kind, pa, ma, sp, brave, wp, roll)
  let xa = base
  if (mods.critical) xa = xa + mods.critBonus
  if (mods.strengthen) xa = idiv(xa * 5, 4)
  if (mods.attackUp && kind !== 'gun') xa = idiv(xa * 4, 3)
  if (mods.martialArts && kind === 'bare') xa = idiv(xa * 3, 2)
  if (mods.berserk) xa = idiv(xa * 3, 2)
  if (mods.defenseUp) xa = idiv(xa * 2, 3)
  if (mods.protect) xa = idiv(xa * 2, 3)
  if (mods.charging) xa = idiv(xa * 3, 2)
  if (mods.sleeping) xa = idiv(xa * 3, 2)
  if (mods.chickenOrFrog) xa = idiv(xa * 3, 2)
  xa = zodiacScale(xa, mods.compat)
  const power = mods.twoHands ? wp * 2 : wp
  let damage = applyFormula(kind, xa, pa, brave, power)
  if (mods.weak) damage *= 2
  if (mods.half) damage = idiv(damage, 2)
  if (mods.absorb) damage = -damage
  return damage
}

function xaFor(kind: string, pa: number, ma: number, sp: number, brave: number, wp: number, roll: number): number {
  switch (kind) {
    case 'bare':
      return bareXa(pa, brave)
    case 'knife':
    case 'ninja-sword':
    case 'bow':
      return idiv(pa + sp, 2)
    case 'sword':
    case 'rod':
    case 'spear':
    case 'crossbow':
      return pa
    case 'knight-sword':
    case 'katana':
      return bareXa(pa, brave)
    case 'staff':
    case 'stick':
      return ma
    case 'flail':
    case 'axe':
    case 'bag':
      return Math.max(1, roll)
    case 'cloth':
    case 'instrument':
    case 'dictionary':
      return idiv(pa + ma, 2)
    case 'gun':
      return wp
    default:
      return pa
  }
}

function applyFormula(kind: string, xa: number, pa: number, brave: number, wp: number): number {
  if (kind === 'bare') return xa * pa
  if (kind === 'gun') return xa * wp
  return xa * wp
}

/** Charge +K replaces the stats inside the weapon formula, per section 2.2. */
export function chargeDamage(
  kind: string,
  pa: number,
  ma: number,
  sp: number,
  brave: number,
  wp: number,
  k: number,
  roll: number,
  mods: StrikeMods,
): number {
  return weaponDamage(kind, pa + k, ma + k, sp + k, brave, kind === 'gun' ? wp + k : wp, roll + k, mods)
}

/** Lich damage. Half Dark inserts 2 into the denominator, as in the worked example. */
export function lichDamage(maxHp: number, halfDark: boolean): number {
  return ru(maxHp * 50, halfDark ? 200 : 100)
}

/** Lich success%. Strengthen Dark changes MA before it is added to 160. */
export function lichSuccess(cFa: number, tFa: number, ma: number, strengthen: boolean): number {
  const used = strengthen ? idiv(ma * 5, 4) : ma
  return idiv(cFa * tFa * (used + 160), 10000)
}

/** Ordinary spell damage: [(CFa * TFa * Q * MA) / 10000], MA already modified. */
export function magicDamage(cFa: number, tFa: number, q: number, ma: number, elementMul: number): number {
  const base = idiv(cFa * tFa * q * ma, 10000)
  if (elementMul === 2) return base * 2
  if (elementMul === 0.5) return idiv(base, 2)
  return base
}

/** Faith success% for effect magic: [(CFa * TFa * (MA + Y)) / 10000]. */
export function faithSuccess(cFa: number, tFa: number, ma: number, y: number): number {
  return idiv(cFa * tFa * (ma + y), 10000)
}

export function emptyMods(compat: Compat = 'neutral'): StrikeMods {
  return {
    critical: false,
    critBonus: 0,
    attackUp: false,
    martialArts: false,
    berserk: false,
    defenseUp: false,
    protect: false,
    charging: false,
    sleeping: false,
    chickenOrFrog: false,
    strengthen: false,
    weak: false,
    half: false,
    absorb: false,
    compat,
    twoHands: false,
  }
}
