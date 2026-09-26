import { describe, expect, it } from 'vitest'
import { advanceClock, enemyTakeTurn } from '../src/core/battle'
import { absorbBattleLoot, commitBattleVictory, createGame, instantiateBattle } from '../src/core/campaign'
import { REQUIRED_STORY_IDS, STORY } from '../src/data/story'

function fight(game: ReturnType<typeof createGame>, limit = 2500) {
  const field = instantiateBattle(game)
  if (!field) throw new Error('no battle')
  let guard = 0
  while (!field.result && guard < limit) {
    const step = advanceClock(field)
    if (step === 'player') {
      const unit = field.units.find((candidate) => candidate.id === field.activeId)
      if (unit) enemyTakeTurn(field, unit)
    }
    guard += 1
  }
  return { field, guard }
}

describe('auto resolves the chronicle', () => {
  it('wins every story battle through the ending with the shipped clock', () => {
    let game = createGame('Ramza', 1, 1)
    const stuck: string[] = []
    const won: string[] = []
    for (const battle of STORY) {
      const { field, guard } = fight(game)
      if (field.id !== battle.id) stuck.push(`${battle.id} opened ${field.id}`)
      if (field.result === 'victory') {
        won.push(field.id)
        absorbBattleLoot(game, field)
        game = commitBattleVictory(game)
      } else {
        const board = field.units.map((unit) => `${unit.name}:${unit.side}:${unit.hp}:L${unit.level}:${unit.right ?? 'bare'}`).join(', ')
        stuck.push(`${battle.id} ${field.result ?? 'stuck'} t=${guard} heroL=${game.party[0]?.level} ${board} :: ${field.log.slice(-12).join(' / ')}`)
        break
      }
    }
    expect(stuck).toEqual([])
    expect(won[0]).toBe('prologue-orbonne')
    expect(won.slice(1)).toEqual([...REQUIRED_STORY_IDS])
    expect(won.at(-1)).toBe('2.4v')
    expect(game.phase).toBe('ending')
  }, 180000)

  it('lets an unarmed level-1 cadet lose the Riovanes duel', () => {
    const game = createGame('Ramza', 1, 1)
    game.gil = 0
    game.inventory = {}
    game.pending = '2.3i'
    game.chapter = 3
    const { field } = fight(game, 800)
    expect(field.id).toBe('2.3i')
    expect(field.units.find((unit) => unit.unique === 'ramza')?.level).toBe(1)
    expect(field.result).toBe('defeat')
  }, 30000)
})