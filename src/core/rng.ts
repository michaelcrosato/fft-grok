export interface Rng {
  /** Integer in 0..99. */
  d100(): number
  /** Integer in 0..n-1. n must be positive. */
  int(n: number): number
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    d100: () => Math.floor(next() * 100),
    int: (n: number) => Math.floor(next() * n),
  }
}

/** Each call consumes the next scripted roll. The last roll repeats. */
export function scriptedRng(rolls: number[]): Rng {
  let i = 0
  const take = () => {
    const v = rolls[Math.min(i, Math.max(0, rolls.length - 1))] ?? 0
    if (i < rolls.length) i += 1
    return v
  }
  return {
    d100: () => ((take() % 100) + 100) % 100,
    int: (n: number) => {
      const v = take()
      return n <= 0 ? 0 : ((v % n) + n) % n
    },
  }
}
