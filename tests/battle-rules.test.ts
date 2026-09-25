import { describe, expect, it } from 'vitest'
import { advanceClock, applyHp, canStep, cast, clockTick, endTurn, grid, makeBattle, moveUnit, previewAttack, relativeFacing, resolveWeaponHit, reviveUnit, tileAt, tryReaction } from '../src/core/battle'
import { lichDamage, lichSuccess, magicalHitPercent, physicalHitPercent } from '../src/core/formulas'
import { scriptedRng } from '../src/core/rng'
import { blankUnit, equipAbility, equipItem, learnAbility, type Unit } from '../src/core/unit'

function fighter(partial: Partial<Unit> & Pick<Unit, 'name' | 'side'>): Unit {
  const unit = blankUnit({
    job: 'squire',
    sex: 'male',
    zodiac: 'aries',
    brave: 70,
    faith: 70,
    ...partial,
  })
  unit.ct = partial.ct ?? 0
  return unit
}

function flatBattle(units: Unit[], rng = scriptedRng([0, 99, 0, 0, 0, 0])) {
  return makeBattle({
    id: 'spec',
    w: 6,
    h: 6,
    tiles: grid(6, 6, () => 0),
    units,
    objectiveText: 'Defeat all enemies.',
    objectiveType: 'defeat-all',
  }, rng)
}

describe('charge time', () => {
  it('adds Speed each clocktick and spends 100, 80, or 60, capped at 60', () => {
    const unit = fighter({ name: 'Ramza', side: 'player', ct: 0 })
    const battle = flatBattle([unit])
    clockTick(battle)
    expect(unit.ct).toBeGreaterThan(0)
    const gained = unit.ct
    unit.ct = 100
    endTurn(battle, unit, 'both')
    expect(unit.ct).toBe(0)
    unit.ct = 180
    endTurn(battle, unit, 'both')
    expect(unit.ct).toBe(60)
    unit.ct = 100
    endTurn(battle, unit, 'move')
    expect(unit.ct).toBe(20)
    unit.ct = 100
    endTurn(battle, unit, 'act')
    expect(unit.ct).toBe(20)
    unit.ct = 100
    endTurn(battle, unit, 'wait')
    expect(unit.ct).toBe(40)
    expect(gained).toBeGreaterThanOrEqual(1)
  })
})

describe('movement and facing', () => {
  it('refuses a tile taller than the unit can jump', () => {
    const unit = fighter({ name: 'Ramza', side: 'player', x: 0, y: 0 })
    const battle = makeBattle({
      id: 'jump',
      w: 3,
      h: 1,
      tiles: grid(3, 1, (x) => (x === 1 ? 40 : 0)),
      units: [unit],
      objectiveText: 'Hold.',
      objectiveType: 'defeat-all',
    })
    const from = tileAt(battle, 0, 0)!
    const tooHigh = tileAt(battle, 1, 0)!
    expect(canStep(battle, unit, from, tooHigh)).toBe(false)
    expect(moveUnit(battle, unit, 1, 0)).toBe(false)
    const lowBattle = makeBattle({
      id: 'jump-ok',
      w: 2,
      h: 1,
      tiles: grid(2, 1, (x) => (x === 1 ? 30 : 0)),
      units: [unit],
      objectiveText: 'Hold.',
      objectiveType: 'defeat-all',
    })
    expect(canStep(lowBattle, unit, tileAt(lowBattle, 0, 0)!, tileAt(lowBattle, 1, 0)!)).toBe(true)
  })

  it('treats a back attack as more likely than the front against the guide shield example', () => {
    const ev = { cev: 10, sev: 40, aev: 25, wev: 0, magicSev: 15, magicAev: 25 }
    expect(physicalHitPercent(100, 'side', ev)).toBe(45)
    expect(magicalHitPercent(100, ev)).toBe(63)
    const front = physicalHitPercent(100, 'front', ev)
    const back = physicalHitPercent(100, 'back', ev)
    expect(back).toBeGreaterThan(front)
    expect(relativeFacing(1, 2, 1, 1, 2)).toBe('front')
    expect(relativeFacing(1, 0, 1, 1, 2)).toBe('back')
  })
})

describe('slow actions, reactions, death, and the clock', () => {
  it('resolves Charge +1 on a later tick', () => {
    const archer = fighter({ name: 'Archer', side: 'player', job: 'archer', x: 0, y: 0, ct: 100 })
    archer.jp.archer = 200
    learnAbility(archer, 'archer-charge-1')
    archer.secondary = 'archer'
    const target = fighter({ name: 'Target', side: 'enemy', x: 3, y: 0, zodiac: 'cancer' })
    const before = target.hp
    const battle = flatBattle([archer, target], scriptedRng([0, 99, 0, 0, 0]))
    expect(cast(battle, archer, 'archer-charge-1', 3, 0)).toBe(true)
    expect(target.hp).toBe(before)
    expect(archer.charging?.ctr).toBe(4)
    clockTick(battle)
    clockTick(battle)
    clockTick(battle)
    expect(target.hp).toBe(before)
    clockTick(battle)
    expect(target.hp).toBeLessThan(before)
  })

  it('fires a reaction only when it is equipped and the Brave roll passes', () => {
    const attacker = fighter({ name: 'Striker', side: 'enemy', x: 1, y: 0, brave: 70, ct: 100 })
    const defender = fighter({ name: 'Guard', side: 'player', x: 0, y: 0, brave: 70 })
    defender.jp.squire = 300
    learnAbility(defender, 'squire-counter-tackle')
    const battle = flatBattle([attacker, defender], scriptedRng([0, 99, 0, 0]))
    const before = attacker.hp
    resolveWeaponHit(battle, attacker, defender)
    expect(attacker.hp).toBe(before)
    defender.reaction = 'squire-counter-tackle'
    const again = flatBattle([attacker, defender], scriptedRng([0, 99, 0, 0]))
    const hp = attacker.hp
    resolveWeaponHit(again, attacker, defender)
    expect(attacker.hp).toBeLessThan(hp)
    const refused = flatBattle(
      [fighter({ name: 'Striker', side: 'enemy', x: 1, y: 0 }), defender],
      scriptedRng([0, 99, 0, 70]),
    )
    const foe = refused.units[0]
    const held = foe.hp
    defender.reaction = 'squire-counter-tackle'
    resolveWeaponHit(refused, foe, defender)
    expect(foe.hp).toBe(held)
    expect(tryReaction(refused, defender, foe)).toBe(false)
  })

  it('starts a death countdown, clears it on revive, and removes the unit as a crystal or chest', () => {
    const unit = fighter({ name: 'Fallen', side: 'player', ct: 100 })
    const ally = fighter({ name: 'Ally', side: 'player', x: 2, y: 2, ct: 0 })
    const battle = flatBattle([unit, ally], scriptedRng([10, 10, 10, 80]))
    applyHp(battle, unit, -9999, null)
    expect(unit.hp).toBe(0)
    expect(unit.deathCount).toBe(3)
    expect(unit.crystal).toBeNull()
    reviveUnit(battle, unit, 12)
    expect(unit.deathCount).toBeNull()
    expect(unit.hp).toBeGreaterThan(0)
    applyHp(battle, unit, -9999, null)
    unit.ct = 100
    unit.spMod = 40
    for (let i = 0; i < 8 && !unit.crystal; i++) clockTick(battle)
    expect(unit.crystal === 'crystal' || unit.crystal === 'chest').toBe(true)
    expect(battle.units.find((candidate) => candidate.id === unit.id)?.crystal).toBeTruthy()
  })

  it('turns a unit into a chicken below 10 Brave and not at 10', () => {
    const chicken = fighter({ name: 'Nervous', side: 'player', brave: 9 })
    const steady = fighter({ name: 'Steady', side: 'player', brave: 10 })
    expect(chicken.chicken).toBe(true)
    expect(steady.chicken).toBe(false)
  })

  it('wins when the objective target falls and loses when a required guest is gone for good', () => {
    const boss = fighter({ name: 'Boss', side: 'enemy', x: 3, y: 0, objective: true })
    const hero = fighter({ name: 'Hero', side: 'player' })
    const win = flatBattle([hero, boss])
    win.objectiveType = 'defeat-one'
    win.objectiveUnitId = boss.id
    applyHp(win, boss, -9999, hero)
    expect(win.result).toBe('victory')

    const guest = fighter({ name: 'Ovelia', side: 'guest', x: 1, y: 1, required: true, ct: 100 })
    const keeper = fighter({ name: 'Keeper', side: 'player', x: 0, y: 1 })
    const loss = flatBattle([guest, keeper], scriptedRng([90]))
    applyHp(loss, guest, -9999, null)
    expect(loss.result).toBeNull()
    guest.ct = 100
    guest.spMod = 40
    for (let i = 0; i < 8 && !guest.crystal; i++) clockTick(loss)
    expect(loss.result).toBe('defeat')
    expect(guest.crystal === 'crystal' || guest.crystal === 'chest').toBe(true)
  })

  it('has an in-range enemy act after the player only waits', () => {
    const hero = fighter({ name: 'Hero', side: 'player', x: 0, y: 0, ct: 100, brave: 70 })
    const enemy = fighter({ name: 'Bandit', side: 'enemy', x: 1, y: 0, ct: 90, brave: 70, zodiac: 'cancer' })
    const battle = flatBattle([hero, enemy], scriptedRng([0, 99, 0, 0, 0, 0, 0]))
    const before = hero.hp
    endTurn(battle, hero, 'wait')
    let acted = false
    for (let i = 0; i < 8 && !acted; i++) {
      const step = advanceClock(battle)
      if (step === 'enemy') acted = true
    }
    expect(acted).toBe(true)
    expect(hero.hp).not.toBe(before)
  })
})

describe('worked magic example', () => {
  it('matches the Lich numbers printed in the mechanics guide', () => {
    expect(lichDamage(501, false)).toBe(251)
    expect(lichDamage(501, true)).toBe(126)
    expect(lichSuccess(70, 60, 20, false)).toBe(75)
    expect(lichSuccess(70, 60, 20, true)).toBe(77)
  })
})

describe('equipment changes the attack', () => {
  it('accepts a dagger on a squire and rejects it on a knight', () => {
    const dummy = fighter({ name: 'Dummy', side: 'enemy', zodiac: 'cancer' })
    const squire = fighter({ name: 'Squire', side: 'player' })
    const bare = previewAttack(squire, dummy)
    expect(equipItem(squire, 'dagger')).toBe(true)
    expect(previewAttack(squire, dummy)).not.toBe(bare)
    const knight = fighter({ name: 'Knight', side: 'player', job: 'knight' })
    const before = previewAttack(knight, dummy)
    expect(equipItem(knight, 'dagger')).toBe(false)
    expect(previewAttack(knight, dummy)).toBe(before)
    expect(equipAbility(squire, 'secondary', 'squire-accumulate')).toBe(false)
  })
})

