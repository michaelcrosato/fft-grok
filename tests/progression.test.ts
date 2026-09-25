import { describe, expect, it } from 'vitest'
import { classByIndex, poachDrop } from '../src/data/content'
import { levelUpRaw, surfaceStat } from '../src/core/growth'
import { memoryStore, loadSlot, saveSlot } from '../src/core/save'
import {
  blankUnit,
  canEnterJob,
  canExecute,
  changeJob,
  equipItem,
  gainExp,
  grantJp,
  learnAbility,
} from '../src/core/unit'
import { cast, grid, makeBattle, previewAttack } from '../src/core/battle'
import { createGame, inviteSpecies, poachIntoFur } from '../src/core/campaign'
import { zodiacFromBirthday } from '../src/core/zodiac'

describe('jobs, equipment, poach, zodiac, growth, and save', () => {
  it('locks Knight until Squire level 2 and Mime until the printed prerequisites', () => {
    const unit = blankUnit({ name: 'Cadet', job: 'squire', sex: 'male', zodiac: 'aries' })
    unit.jp.squire = 199
    expect(canEnterJob(unit, 'knight')).toBe(false)
    unit.jp.squire = 200
    expect(canEnterJob(unit, 'knight')).toBe(true)
    expect(canEnterJob(unit, 'mime')).toBe(false)
    unit.jp.squire = 2100
    unit.jp.chemist = 2100
    unit.jp.geomancer = 550
    unit.jp.lancer = 550
    unit.jp.mediator = 549
    unit.jp.summoner = 550
    expect(canEnterJob(unit, 'mime')).toBe(false)
    unit.jp.mediator = 550
    expect(canEnterJob(unit, 'mime')).toBe(true)
  })

  it('rejects Dancer for a male and Bard for a female', () => {
    const male = blankUnit({ name: 'Male', job: 'squire', sex: 'male', zodiac: 'leo' })
    const female = blankUnit({ name: 'Female', job: 'chemist', sex: 'female', zodiac: 'virgo' })
    male.jp.geomancer = 800
    male.jp.lancer = 800
    female.jp.geomancer = 800
    female.jp.lancer = 800
    female.jp.mediator = 800
    female.jp.summoner = 800
    male.jp.mediator = 800
    male.jp.summoner = 800
    expect(canEnterJob(male, 'dancer')).toBe(false)
    expect(canEnterJob(female, 'dancer')).toBe(true)
    expect(canEnterJob(female, 'bard')).toBe(false)
    expect(canEnterJob(male, 'bard')).toBe(true)
  })

  it('keeps a learned ability after a job change and will not execute it until the slot is equipped', () => {
    const unit = blankUnit({ name: 'Cadet', job: 'squire', sex: 'male', zodiac: 'aries' })
    grantJp(unit, 'squire', 300)
    expect(learnAbility(unit, 'squire-accumulate')).toBe(true)
    expect(changeJob(unit, 'knight')).toBe(true)
    expect(unit.learned).toContain('squire-accumulate')
    expect(canExecute(unit, 'squire-accumulate')).toBe(false)
    const blocked = makeBattle({
      id: 'slot',
      w: 2,
      h: 2,
      tiles: grid(2, 2, () => 0),
      units: [unit],
      objectiveText: 'Hold.',
      objectiveType: 'defeat-all',
    })
    expect(cast(blocked, unit, 'squire-accumulate', unit.x, unit.y)).toBe(false)
    expect(unit.paMod).toBe(0)
    unit.secondary = 'squire'
    expect(canExecute(unit, 'squire-accumulate')).toBe(true)
    expect(cast(blocked, unit, 'squire-accumulate', unit.x, unit.y)).toBe(true)
    expect(unit.paMod).toBe(1)
  })

  it('changes attack when a dagger is legal and leaves it unchanged when it is not', () => {
    const dummy = blankUnit({ name: 'Dummy', job: 'squire', sex: 'male', zodiac: 'cancer', side: 'enemy' })
    const squire = blankUnit({ name: 'Squire', job: 'squire', sex: 'male', zodiac: 'aries' })
    const bare = previewAttack(squire, dummy)
    expect(equipItem(squire, 'dagger')).toBe(true)
    expect(previewAttack(squire, dummy)).not.toBe(bare)
    const knight = blankUnit({ name: 'Knight', job: 'knight', sex: 'male', zodiac: 'aries' })
    knight.jp.squire = 200
    const before = previewAttack(knight, dummy)
    expect(equipItem(knight, 'dagger')).toBe(false)
    expect(previewAttack(knight, dummy)).toBe(before)
  })

  it('poaches a goblin into the guide result and invites that species', () => {
    expect(poachDrop('goblin', 50)).toBe('potion')
    expect(poachDrop('goblin', 0)).toBe('hi-potion')
    const game = createGame('Ramza', 1, 1)
    expect(poachIntoFur(game, 'goblin', 50)).toBe('potion')
    expect(game.fur.potion).toBe(1)
    expect(inviteSpecies(game, 'goblin')).toBe(true)
    expect(game.party.some((unit) => unit.monsterId === 'goblin' && unit.learned.includes('goblin-goblin-punch'))).toBe(true)
  })

  it('maps January 1 to Capricorn', () => {
    expect(zodiacFromBirthday(1, 1)).toBe('capricorn')
    expect(zodiacFromBirthday(3, 21)).toBe('aries')
    expect(zodiacFromBirthday(12, 21)).toBe('capricorn')
    expect(zodiacFromBirthday(12, 20)).toBe('sagittarius')
  })

  it('grows raw HP the way the squire example does', () => {
    const squire = classByIndex('4A')
    expect(squire.mul.hp).toBe(100)
    expect(squire.c.hp).toBe(11)
    expect(surfaceStat(458752, squire.mul.hp)).toBe(28)
    expect(levelUpRaw(504000, 11, 1)).toBe(546000)
    const unit = blankUnit({
      name: 'Squire',
      job: 'squire',
      sex: 'male',
      zodiac: 'aries',
      raw: { hp: 504000, mp: 229376, sp: 98304, pa: 81920, ma: 65536 },
    })
    unit.exp = 0
    gainExp(unit, 100)
    expect(unit.raw.hp).toBe(546000)
    expect(unit.level).toBe(2)
  })

  it('restores story index, JP, abilities, inventory, and Brave/Faith through save and load', () => {
    const game = createGame('Ramza', 1, 1)
    game.cursor = 4
    game.pending = '2.1d'
    game.party[0].jp.squire = 480
    game.party[0].learned.push('squire-accumulate')
    game.party[0].brave = 72
    game.party[0].baseBrave = 72
    game.party[0].faith = 61
    game.party[0].baseFaith = 61
    game.inventory['potion'] = 9
    const store = memoryStore()
    saveSlot(store, 2, game)
    const loaded = loadSlot(store, 2)
    expect(loaded?.cursor).toBe(4)
    expect(loaded?.pending).toBe('2.1d')
    expect(loaded?.party[0].jp.squire).toBe(480)
    expect(loaded?.party[0].learned).toContain('squire-accumulate')
    expect(loaded?.inventory.potion).toBe(9)
    expect(loaded?.party[0].brave).toBe(72)
    expect(loaded?.party[0].faith).toBe(61)
  })
})

