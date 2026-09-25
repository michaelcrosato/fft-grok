/** Truncating division, matching the PS1 integer math in the mechanics guide. */
export function idiv(n: number, d: number): number {
  if (d === 0) return 0
  return Math.trunc(n / d)
}

/** Round-up division: RU{n / d} = [(n + d - 1) / d] for positive values. */
export function ru(n: number, d: number): number {
  if (d === 0) return 0
  return idiv(n + d - 1, d)
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
