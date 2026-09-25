import { idiv } from './int'

/** HP/MP/Sp/PA/MA = [(Raw * multiplier) / 1638400], minimum 1. */
export function surfaceStat(raw: number, multiplier: number, beast = false): number {
  const div = beast ? 163840 : 1_638_400
  return Math.max(1, idiv(raw * multiplier, div))
}

/**
 * Raw stat gained when leveling from `level` to `level + 1`.
 * bonus = [currentRaw / (C + level)], level being the lower one.
 */
export function levelUpBonus(currentRaw: number, c: number, level: number): number {
  return idiv(currentRaw, c + level)
}

export function levelUpRaw(currentRaw: number, c: number, level: number): number {
  return currentRaw + levelUpBonus(currentRaw, c, level)
}

/** Job level from total JP in that job. Thresholds are the guide's table in section 6.3. */
export function jobLevelFromJp(jp: number): number {
  const tiers = [0, 100, 200, 350, 550, 800, 1150, 1550, 2100]
  let level = 0
  for (let i = 1; i < tiers.length; i++) {
    if (jp >= tiers[i]) level = i
  }
  return level
}

export function expForAction(actorLevel: number, targetLevel: number, prevKills: number, expUp: boolean): number {
  let d = -8
  if (prevKills <= 0) d = 10
  else if (prevKills === 1) d = 0
  else if (prevKills === 2) d = -4
  else if (prevKills === 3) d = -5
  else if (prevKills === 4) d = -6
  else if (prevKills === 5) d = -7
  const base = Math.max(10 + (targetLevel - actorLevel) + d, 1)
  return expUp ? base * 2 : base
}

export function jpForAction(jobLevel: number, unitLevel: number, jpUp: boolean): number {
  const base = 8 + jobLevel * 2 + idiv(unitLevel, 4)
  return jpUp ? idiv(base * 3, 2) : base
}
