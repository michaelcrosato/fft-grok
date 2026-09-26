import { describe, expect, it } from 'vitest'
import { buyItem, commitBattleVictory, completeDeepFloor, createGame, dispatchProposition, encounterBattle, inviteSpecies, performSecret, rareBattle, resolveErrands, rollEncounter, secretAvailable, startDeepFloor, tavernRecruits } from '../src/core/campaign'
import { buildChecklist, coverageRatio } from '../src/core/checklist'
import { learnZodiacBySurvival } from '../src/core/battle'
import { scriptedRng } from '../src/core/rng'
import { STORY, nextStoryId, storyById } from '../src/data/story'
import { blankUnit } from '../src/core/unit'

const REQUIRED = [
  '2.1a', '2.1b', '2.1c', '2.1d', '2.1e', '2.1f', '2.1g', '2.1h', '2.1i',
  '2.2a', '2.2b', '2.2c', '2.2d', '2.2e', '2.2f', '2.2g', '2.2h', '2.2i', '2.2j', '2.2k',
  '2.3a', '2.3b', '2.3c', '2.3d', '2.3e', '2.3f', '2.3g', '2.3h', '2.3i', '2.3j', '2.3k',
  '2.4a', '2.4b', '2.4c', '2.4d', '2.4e', '2.4f', '2.4g', '2.4h', '2.4i', '2.4j', '2.4k', '2.4l', '2.4m',
  '2.4n', '2.4o', '2.4p', '2.4q', '2.4r', '2.4s', '2.4t', '2.4u', '2.4v',
]

describe('campaign from a new game through the ending', () => {
  it('walks Orbonne and every story battle into the ending', () => {
    let game = createGame('Ramza', 1, 1)
    expect(game.zodiac).toBe('capricorn')
    expect(game.pending).toBe('prologue-orbonne')
    const ids = STORY.map((battle) => battle.id)
    expect(ids[0]).toBe('prologue-orbonne')
    for (const id of REQUIRED) expect(ids).toContain(id)
    for (const battle of STORY) {
      expect(battle.objectiveText.length).toBeGreaterThan(0)
      expect(nextStoryId(battle.id)).toBeTruthy()
      expect(battle.enemies.length).toBeGreaterThan(0)
    }
    game = commitBattleVictory(game)
    for (const id of REQUIRED) {
      expect(game.pending).toBe(id)
      expect(storyById(id)?.objectiveText.length).toBeGreaterThan(0)
      game = commitBattleVictory(game)
    }
    expect(game.phase).toBe('ending')
    expect(game.pending).toBeNull()
    expect(game.party.some((unit) => unit.unique === 'boco')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'mustadio')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'agrias')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'orlandu')).toBe(true)
  })

  it('buys from a shop, resolves a proposition, and rolls a region encounter', () => {
    const game = createGame('Ramza', 1, 1)
    game.gil = 5000
    expect(buyItem(game, 'potion')).toBe(true)
    expect(game.inventory.potion).toBeGreaterThan(8)
    game.chapter = 2
    const recruit = tavernRecruits(game)[0]
    game.party.push(recruit)
    expect(dispatchProposition(game, 'mandalia-sweep', recruit.id)).toBe(true)
    const before = game.gil
    resolveErrands(game)
    expect(game.gil).toBeGreaterThan(before)
    const table = encounterBattle(game, 'mandalia-mix', ['goblin', 'chocobo'])
    expect(table.units.some((unit) => unit.monsterId === 'goblin')).toBe(true)
    const rolled = rollEncounter(game, 'mandalia', scriptedRng([0, 0]))
    expect(rolled?.units.some((unit) => unit.side === 'enemy')).toBe(true)
    expect(inviteSpecies(game, 'chocobo')).toBe(true)
  })

  it('opens the secret chain through Cloud and Byblos and enters a dark Deep floor', () => {
    let game = createGame('Ramza', 1, 1)
    while (game.pending && game.pending !== '2.4v') game = commitBattleVictory(game)
    expect(game.party.some((unit) => unit.unique === 'mustadio')).toBe(true)
    expect(secretAvailable(game, 'goug-besrodio')).toBe(true)
    expect(performSecret(game, 'goug-besrodio')).toBe(true)
    expect(performSecret(game, 'goland-rumor')).toBe(true)
    expect(performSecret(game, 'lesalia-hunter')).toBe(true)
    expect(performSecret(game, 'colliery')).toBe(true)
    expect(performSecret(game, 'beowulf-reis')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'beowulf')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'reis')).toBe(true)
    expect(performSecret(game, 'worker-8')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'worker-8')).toBe(true)
    expect(performSecret(game, 'zarghidas-flower')).toBe(true)
    expect(performSecret(game, 'nelveska')).toBe(true)
    expect(performSecret(game, 'cloud')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'cloud')).toBe(true)
    expect(game.inventory['materia-blade']).toBeGreaterThan(0)
    for (let floor = 1; floor <= 10; floor++) {
      const battle = startDeepFloor(game, floor)
      expect(battle).not.toBeNull()
      expect(battle?.dark).toBe(true)
      expect(battle?.hiddenExits.length).toBe(4)
      if (floor === 10) {
        expect(battle?.objectiveType).toBe('defeat-one')
        expect(battle?.units.some((unit) => unit.name === 'Elidibs')).toBe(true)
      }
      completeDeepFloor(game, floor, true)
      expect(game.deepFloor).toBe(floor)
    }
    const end = startDeepFloor(game, 10)
    expect(end).toBeNull()
    const summoner = blankUnit({ name: 'Voice', job: 'summoner', sex: 'female', zodiac: 'virgo' })
    expect(learnZodiacBySurvival(summoner, 40, 12)).toBe(true)
    expect(summoner.learned).toContain('summoner-zodiac')
    expect(game.deepFloor).toBe(10)
    expect(performSecret(game, 'byblos')).toBe(true)
    expect(game.party.some((unit) => unit.unique === 'byblos')).toBe(true)
    const rare = rareBattle(game, 'bariaus-monsters')
    expect(rare?.units.some((unit) => unit.side === 'enemy')).toBe(true)
  })

  it('resolves at least 90% of the checklist, including every story battle', () => {
    const rows = buildChecklist()
    expect(coverageRatio(rows)).toBeGreaterThanOrEqual(0.9)
    for (const id of ['prologue-orbonne', ...REQUIRED]) {
      const row = rows.find((entry) => entry.id === id)
      expect(row?.resolved).toBe(true)
    }
    for (const kind of ['job', 'item', 'system']) {
      expect(rows.some((row) => row.kind === kind && row.resolved)).toBe(true)
    }
  })
})
