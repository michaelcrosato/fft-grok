import { idiv } from './int'

export const ZODIAC = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  'serpentarius',
] as const

export type Zodiac = (typeof ZODIAC)[number]
export type Compat = 'neutral' | 'good' | 'bad' | 'best' | 'worst'
export type Sex = 'male' | 'female' | 'monster'

/**
 * Row is the attacker's sign, column the target's, copied from the
 * compatibility chart in the battle-mechanics guide. A glyph of 0 is
 * the guide's neutral mark on the Gemini row.
 */
const CHART = [
  'ooo-+o?o+-ooo',
  'oooo-+o?o+-oo',
  'ooooo-+0?0+-o',
  '-ooooo-+o?o+o',
  '+-ooooo-+o?oo',
  'o+-ooooo-+o?o',
  '?o+-ooooo-+oo',
  'o?o+-ooooo-+o',
  '+o?o+-oooooo-',
  '-+o?o+-oooooo',
  'o-+o?o+-ooooo',
  'oo-+o?o+-oooo',
  'ooooooooooooo',
]

/** Birthday ranges are the ones printed beside the sign list in the walkthrough. */
export function zodiacFromBirthday(month: number, day: number): Zodiac {
  const md = month * 100 + day
  if (md >= 1221 || md <= 120) return 'capricorn'
  if (md <= 220) return 'aquarius'
  if (md <= 320) return 'pisces'
  if (md <= 420) return 'aries'
  if (md <= 520) return 'taurus'
  if (md <= 620) return 'gemini'
  if (md <= 720) return 'cancer'
  if (md <= 820) return 'leo'
  if (md <= 920) return 'virgo'
  if (md <= 1020) return 'libra'
  if (md <= 1120) return 'scorpio'
  return 'sagittarius'
}

export function compatibility(attacker: Zodiac, target: Zodiac, attackerSex: Sex, targetSex: Sex): Compat {
  const i = ZODIAC.indexOf(attacker)
  const j = ZODIAC.indexOf(target)
  const raw = CHART[i]?.[j] ?? 'o'
  const sym = raw === '0' ? 'o' : raw
  if (sym === 'o') return 'neutral'
  if (sym === '+') return 'good'
  if (sym === '-') return 'bad'
  if (attackerSex === 'monster' || targetSex === 'monster') return 'bad'
  return attackerSex !== targetSex ? 'best' : 'worst'
}

export function zodiacScale(xa: number, compat: Compat): number {
  if (compat === 'good') return xa + idiv(xa, 4)
  if (compat === 'bad') return xa - idiv(xa, 4)
  if (compat === 'best') return xa + idiv(xa, 2)
  if (compat === 'worst') return xa - idiv(xa, 2)
  return xa
}
