import { advanceClock, attackCommand, cast, commitTurn, drinkStock, enemyTakeTurn, forecast, moveUnit, phoenixDown, reachable, undoMove, weaponRangeTiles, type Battle } from '../core/battle'
import {
  absorbBattleLoot,
  availablePropositions,
  buyItem,
  commitBattleVictory,
  completeDeepFloor,
  createGame,
  currentBattleDef,
  dispatchProposition,
  instantiateBattle,
  locations,
  performSecret,
  rareBattle,
  resolveErrands,
  rollEncounter,
  secretAvailable,
  secretSteps,
  startDeepFloor,
  tavernRecruits,
  type Campaign,
} from '../core/campaign'
import { commandFromGamepad, commandFromKey, commandFromPointer, type Command } from '../core/inputmap'
import { AudioBus } from '../core/mixer'
import { browserStore, listSlots, loadSlot, saveSlot } from '../core/save'
import { ITEMS, shopStock } from '../data/content'
import { ABILITIES_BY_JOB, JOBS } from '../data/jobs'
import { storyById } from '../data/story'
import { canEnterJob, canExecute, changeJob, equipAbility, learnAbility } from '../core/unit'
import { setTileHandler, stage } from './stage'
import { createScore, type Score } from './sound'

type Mode = 'title' | 'options' | 'naming' | 'scene' | 'world' | 'shop' | 'tavern' | 'errand' | 'jobs' | 'save' | 'battle' | 'ending' | 'warn'

const panel = () => document.getElementById('panel')!
const bus = new AudioBus()
const score: Score = createScore(bus)
const store = browserStore()

let mode: Mode = 'title'
let campaign: Campaign | null = null
let battle: Battle | null = null
let line = 0
let aiming: 'move' | 'attack' | 'ability' | 'phoenix' = 'move'
let abilityId: string | null = null
let menu: 'root' | 'act' | 'abilities' = 'root'
let returnMode: Mode = 'title'
let pumpTimer = 0
let lastPad = ''
let shownTurn = ''
let auto = false
const notes: string[] = []

export async function requestPresentationLock(): Promise<string> {
  const root = document.getElementById('app') ?? document.body
  try {
    if (!document.fullscreenElement) await root.requestFullscreen()
    const orientation = screen.orientation as ScreenOrientation & { lock?: (kind: string) => Promise<void> }
    if (orientation.lock) await orientation.lock('landscape')
    return 'ok'
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function render(): void {
  const root = panel()
  root.innerHTML = ''
  if (mode === 'title') root.append(titleCard())
  else if (mode === 'options') root.append(optionsCard())
  else if (mode === 'naming') root.append(namingCard())
  else if (mode === 'scene') root.append(sceneCard())
  else if (mode === 'world') root.append(worldCard())
  else if (mode === 'shop') root.append(shopCard())
  else if (mode === 'tavern') root.append(tavernCard())
  else if (mode === 'errand') root.append(errandCard())
  else if (mode === 'jobs') root.append(jobCard())
  else if (mode === 'save') root.append(saveCard())
  else if (mode === 'warn') root.append(warnCard())
  else if (mode === 'ending') root.append(endingCard())
  else if (mode === 'battle') root.append(battleHud())
  stage.paint = mode === 'battle' ? 'battle' : mode === 'world' ? 'map' : 'title'
  stage.battle = battle
  stage.effects = campaign?.options.effects ?? 'high'
}

function titleCard(): HTMLElement {
  const card = el('div', 'card')
  card.append(el('h1', '', 'The Zodiac Standard'))
  card.append(el('p', 'sub', 'A chronicle of succession, told on a clock of courage. Raise a company, spend the turn, and decide who the history will bother to name.'))
  card.append(button('New Game', () => { mode = 'naming'; score.ui(); render() }, 'primary'))
  const row = el('div', 'row')
  row.append(button('Continue', () => { returnMode = 'title'; mode = 'save'; render() }))
  row.append(button('Options', () => { returnMode = 'title'; mode = 'options'; render() }))
  card.append(row)
  card.append(el('p', 'credit', 'Original build 2026-09-25 · Grok 4.7'))
  return card
}

function namingCard(): HTMLElement {
  const card = el('div', 'card')
  card.append(el('h1', '', 'Name the witness'))
  card.append(el('p', 'sub', 'The birthday chooses a zodiac. January 1 is Capricorn, the sign the old tutors favored.'))
  const name = input('text', 'Ramza')
  const month = input('number', '1')
  const day = input('number', '1')
  month.min = '1'; month.max = '12'; day.min = '1'; day.max = '31'
  card.append(labeled('Name', name), labeled('Month', month), labeled('Day', day))
  card.append(button('Begin the chronicle', () => {
    score.unlock()
    campaign = createGame(name.value || 'Ramza', clampNum(month.value, 1, 12), clampNum(day.value, 1, 31))
    bus.setVolume(campaign.options.volume)
    bus.setMuted(campaign.options.mute)
    line = 0
    mode = 'scene'
    score.ui()
    render()
  }, 'primary'))
  return card
}

function sceneCard(): HTMLElement {
  const card = el('div', 'card')
  const def = campaign ? currentBattleDef(campaign) : undefined
  const lines = def ? [...def.before] : []
  const current = lines[Math.min(line, Math.max(0, lines.length - 1))]
  card.append(el('div', 'speaker', current?.speaker ?? 'Narrator'))
  card.append(el('p', 'sub', current?.text ?? 'The road is quiet.'))
  card.append(button(line < lines.length - 1 ? 'Continue' : 'To the field', () => {
    score.ui()
    if (line < lines.length - 1) { line += 1; render(); return }
    if (def?.noRetreat) { mode = 'warn'; render(); return }
    enterBattle()
  }, 'primary'))
  return card
}

function warnCard(): HTMLElement {
  const card = el('div', 'card warn')
  card.append(el('h1', '', 'No retreat'))
  card.append(el('p', 'sub', 'This battle cannot be left until it is won. The chronicle keeps three slots so a hard gate does not erase the road behind you. Save another slot, then enter.'))
  const row = el('div', 'row')
  row.append(button('Save another slot', () => { returnMode = 'warn'; mode = 'save'; render() }))
  row.append(button('Enter anyway', () => enterBattle(), 'primary'))
  card.append(row)
  return card
}

function worldCard(): HTMLElement {
  const card = el('div', 'card')
  if (!campaign) return card
  const def = currentBattleDef(campaign)
  card.append(el('h1', '', `Chapter ${campaign.chapter}`))
  card.append(el('p', 'sub', def ? `Next: ${def.name}. ${def.objectiveText}` : 'The war is written.'))
  card.append(el('p', 'readout', `${campaign.gil} gil · ${campaign.location}`))
  const row = el('div', 'row')
  row.append(button('Take the field', () => {
    const battleDef = currentBattleDef(campaign!)
    if (battleDef?.noRetreat) { mode = 'warn'; render(); return }
    line = 0
    mode = 'scene'
    render()
  }, 'primary'))
  row.append(button('Shop', () => { mode = 'shop'; render() }))
  row.append(button('Tavern', () => { mode = 'tavern'; render() }))
  row.append(button('Errands', () => { mode = 'errand'; render() }))
  row.append(button('Jobs', () => { mode = 'jobs'; render() }))
  row.append(button('Save', () => { returnMode = 'world'; mode = 'save'; render() }))
  row.append(button('Options', () => { returnMode = 'world'; mode = 'options'; render() }))
  card.append(row)
  const places = el('div', 'menu-list')
  for (const place of locations()) {
    const here = place === def?.place
    places.append(button(here ? `${place} — story` : place, () => travel(place)))
  }
  card.append(places)
  const secrets = secretSteps().filter((step) => secretAvailable(campaign!, step))
  for (const step of secrets) {
    card.append(button(`Rumor: ${step.replace(/-/g, ' ')}`, () => {
      performSecret(campaign!, step)
      score.reward()
      render()
    }))
  }
  if (campaign.cleared.includes('2.4n')) {
    card.append(button(`Deep Dungeon ${campaign.deepFloor + 1}`, () => {
      const next = startDeepFloor(campaign!, campaign!.deepFloor + 1)
      if (!next) return
      battle = next
      beginField()
    }))
  }
  if (campaign.chapter >= 4) {
    card.append(button('Rare: Bariaus menagerie', () => {
      battle = rareBattle(campaign!, 'bariaus-monsters')
      if (battle) beginField()
    }))
  }
  return card
}

function shopCard(): HTMLElement {
  const card = el('div', 'card')
  if (!campaign) return card
  card.append(el('h1', '', 'Outfitter'))
  card.append(el('p', 'readout', `${campaign.gil} gil`))
  const list = el('div', 'menu-list')
  for (const id of shopStock(campaign.chapter)) {
    const item = ITEMS[id]
    if (!item) continue
    list.append(button(`${item.name} — ${item.price}`, () => {
      if (buyItem(campaign!, id)) { score.reward(); render() }
    }))
  }
  card.append(list)
  const fur = Object.entries(campaign.fur).filter(([, count]) => count > 0)
  if (fur.length) {
    card.append(el('p', 'sub', 'Fur shop'))
    for (const [id, count] of fur) {
      card.append(button(`Buy ${ITEMS[id]?.name ?? id} ×${count}`, () => {
        const item = ITEMS[id]
        if (!item || campaign!.gil < item.price) return
        campaign!.gil -= item.price
        campaign!.fur[id] -= 1
        campaign!.inventory[id] = (campaign!.inventory[id] ?? 0) + 1
        score.reward()
        render()
      }))
    }
  }
  card.append(button('Back', () => { mode = 'world'; render() }))
  return card
}

function tavernCard(): HTMLElement {
  const card = el('div', 'card')
  if (!campaign) return card
  card.append(el('h1', '', 'Tavern'))
  card.append(el('p', 'sub', 'A bed and a contract. Recruits cost 200 gil. The roster holds sixteen.'))
  for (const unit of tavernRecruits(campaign)) {
    card.append(button(`Hire ${unit.name} (${JOBS[unit.job]?.name ?? unit.job})`, () => {
      if (campaign!.gil < 200 || campaign!.party.length >= 16) return
      campaign!.gil -= 200
      campaign!.party.push(unit)
      score.reward()
      render()
    }))
  }
  card.append(button('Back', () => { mode = 'world'; render() }))
  return card
}

function errandCard(): HTMLElement {
  const card = el('div', 'card')
  if (!campaign) return card
  card.append(el('h1', '', 'Propositions'))
  card.append(el('p', 'sub', 'Generics leave the squad until the errand resolves on the next story step.'))
  for (const offer of availablePropositions(campaign)) {
    const unit = campaign.party.find((member) => member.unique !== 'ramza' && member.sex !== 'monster' && !campaign!.errands.some((errand) => errand.unitId === member.id))
    card.append(button(`${offer.name} (+${offer.gil} gil)`, () => {
      if (!unit) return
      dispatchProposition(campaign!, offer.id, unit.id)
      resolveErrands(campaign!)
      score.reward()
      render()
    }))
  }
  if (!availablePropositions(campaign).length) card.append(el('p', 'sub', 'Errands open in chapter two.'))
  card.append(button('Back', () => { mode = 'world'; render() }))
  return card
}

function jobCard(): HTMLElement {
  const card = el('div', 'card')
  if (!campaign) return card
  card.append(el('h1', '', 'Jobs'))
  const unit = campaign.party[0]
  card.append(el('p', 'sub', `${unit.name} · ${JOBS[unit.job]?.name} · Brave ${unit.brave} · Faith ${unit.faith}`))
  const list = el('div', 'menu-list')
  for (const job of Object.values(JOBS)) {
    if (job.monster || job.special && job.special !== unit.unique) continue
    const needs = job.prereq.map((need) => `${JOBS[need.job]?.name ?? need.job} ${need.level}`).join(', ') || 'none'
    const open = canEnterJob(unit, job.id)
    list.append(button(`${job.name} — ${open ? 'open' : needs}`, () => {
      if (changeJob(unit, job.id)) { score.ui(); render() }
    }))
  }
  card.append(list)
  const learn = el('div', 'menu-list')
  for (const ability of ABILITIES_BY_JOB[unit.job] ?? []) {
    const known = unit.learned.includes(ability.id)
    learn.append(button(`${known ? 'Learned' : 'Learn'} ${ability.name} (${ability.jp} JP)`, () => {
      if (learnAbility(unit, ability.id)) {
        if (ability.slot === 'reaction') equipAbility(unit, 'reaction', ability.id)
        if (ability.slot === 'support') equipAbility(unit, 'support', ability.id)
        if (ability.slot === 'movement') equipAbility(unit, 'movement', ability.id)
        score.ui()
        render()
      }
    }))
  }
  card.append(learn)
  card.append(button('Back', () => { mode = 'world'; render() }))
  return card
}

function saveCard(): HTMLElement {
  const card = el('div', 'card')
  card.append(el('h1', '', 'Chronicles'))
  for (const slot of listSlots(store, 3)) {
    const row = el('div', 'row')
    const label = slot.hero ? `${slot.hero} · ch ${slot.chapter}` : 'Empty slot'
    row.append(button(`Slot ${slot.slot}: ${label}`, () => {
      const loaded = loadSlot(store, slot.slot)
      if (!loaded) return
      campaign = loaded
      bus.setMuted(campaign.options.mute)
      bus.setVolume(campaign.options.volume)
      mode = campaign.phase === 'ending' ? 'ending' : 'world'
      stage.effects = campaign.options.effects
      render()
    }))
    row.append(button('Save', () => {
      if (!campaign) return
      saveSlot(store, slot.slot, campaign)
      score.ui()
      render()
    }))
    card.append(row)
  }
  card.append(button('Back', () => { mode = returnMode === 'warn' ? 'warn' : campaign ? 'world' : 'title'; render() }))
  return card
}

function optionsCard(): HTMLElement {
  const card = el('div', 'card')
  card.append(el('h1', '', 'Options'))
  const volume = document.createElement('input')
  volume.type = 'range'
  volume.min = '0'
  volume.max = '1'
  volume.step = '0.05'
  volume.value = String(campaign?.options.volume ?? bus.volume)
  volume.addEventListener('input', () => {
    const value = Number(volume.value)
    bus.setVolume(value)
    if (campaign) campaign.options.volume = value
  })
  card.append(labeled('Volume', volume))
  card.append(button(bus.muted ? 'Unmute' : 'Mute', () => {
    bus.setMuted(!bus.muted)
    if (campaign) campaign.options.mute = bus.muted
    render()
  }))
  card.append(button('Fullscreen lock', () => { void requestPresentationLock() }))
  card.append(button(`Effects: ${campaign?.options.effects ?? stage.effects}`, () => {
    const next = (campaign?.options.effects ?? stage.effects) === 'high' ? 'low' : 'high'
    stage.effects = next
    if (campaign) campaign.options.effects = next
    render()
  }))
  card.append(button(`Animation: ${campaign?.options.animSpeed ?? 1}`, () => {
    if (!campaign) return
    campaign.options.animSpeed = campaign.options.animSpeed >= 4 ? 1 : campaign.options.animSpeed + 1
    render()
  }))
  card.append(button('Back', () => { mode = returnMode === 'title' || !campaign ? 'title' : 'world'; render() }))
  return card
}

function endingCard(): HTMLElement {
  const card = el('div', 'card')
  card.append(el('h1', '', 'Somebody to Love'))
  card.append(el('p', 'sub', 'Delita keeps the crown. Ovelia learns what a banner costs. The church\'s zodiac beasts are ash. Ramza and Alma walk out of the record, and the chronicle — this one — refuses to forget which of them stopped the war.'))
  card.append(el('p', 'credit', `${campaign?.hero ?? 'Ramza'} · ${campaign?.zodiac ?? ''} · 2026-09-25 · Grok 4.7`))
  card.append(button('Title', () => { mode = 'title'; battle = null; render() }, 'primary'))
  return card
}

function battleHud(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.display = 'flex'
  wrap.style.flexDirection = 'column'
  wrap.style.height = '100%'
  wrap.style.pointerEvents = 'none'
  const top = el('div', 'topbar')
  const order = el('div', 'forecast')
  if (battle) {
    for (const entry of forecast(battle, 6)) {
      const chip = el('div', 'chip', entry.name)
      if (battle.activeId === entry.id) chip.classList.add('on')
      order.append(chip)
    }
  }
  top.append(order)
  top.append(el('div', 'readout', `Tile ${colName(stage.cursor.x)}${stage.cursor.y + 1}`))
  const bottom = el('div', 'bottombar')
  const pad = el('div', 'pad')
  pad.append(cmdButton('▲', 'up', 'up'), cmdButton('◀', 'left', 'left'), cmdButton('▶', 'right', 'right'), cmdButton('▼', 'down', 'down'))
  const actions = el('div', 'row')
  actions.append(cmdButton('Act', 'act'), cmdButton('Wait', 'wait'), cmdButton('Undo', 'undo'), button(auto ? 'Auto on' : 'Auto', () => {
    auto = !auto
    if (auto) schedulePump()
    render()
  }), cmdButton('Menu', 'menu'))
  const note = el('div', 'objective', battle?.objectiveText ?? '')
  const log = el('p', 'sub', notes.join(' · '))
  log.id = 'battle-log'
  bottom.append(pad, actions, note, log)
  const state = document.createElement('div')
  state.id = 'battle-state'
  state.hidden = true
  wrap.append(state)
  if (menu !== 'root' && battle) {
    const list = el('div', 'menu-list')
    list.style.pointerEvents = 'auto'
    const active = battle.units.find((unit) => unit.id === battle!.activeId)
    if (menu === 'act' && active) {
      list.append(button('Attack', () => { aiming = 'attack'; abilityId = null; menu = 'root'; refreshRange(); score.ui() }))
      if ((battle.stock.potion ?? 0) > 0 || (battle.stock['hi-potion'] ?? 0) > 0 || (battle.stock['x-potion'] ?? 0) > 0) {
        list.append(button('Drink', () => {
          if (!drinkStock(battle!, active)) return
          remember(`${active.name} drinks`)
          commitTurn(battle!, active)
          menu = 'root'
          score.reward()
          schedulePump()
        }))
      }
      if ((battle.stock['phoenix-down'] ?? 0) > 0) {
        list.append(button('Phoenix Down', () => {
          aiming = 'phoenix'
          abilityId = null
          menu = 'root'
          refreshRange()
          score.ui()
        }))
      }
      for (const ability of (ABILITIES_BY_JOB[active.job] ?? []).concat(active.secondary ? ABILITIES_BY_JOB[active.secondary] ?? [] : [])) {
        if (ability.slot !== 'action' || !canExecute(active, ability.id)) continue
        list.append(button(ability.name, () => {
          aiming = 'ability'
          abilityId = ability.id
          menu = 'root'
          refreshRange()
        }))
      }
    }
    bottom.append(list)
  }
  wrap.append(top, bottom)
  queueMicrotask(publishState)
  if (battle?.id === 'prologue-orbonne') {
    note.textContent = 'Blue tiles are movement. The ribbon is turn order. Side and back beat a shield\'s front. Move+Act spends 100. Wait spends 60. ' + (battle.objectiveText)
  }
  return wrap
}

function enterBattle(): void {
  if (!campaign) return
  battle = instantiateBattle(campaign)
  if (!battle) return
  beginField()
}

function beginField(): void {
  if (!battle) return
  mode = 'battle'
  menu = 'root'
  aiming = 'move'
  auto = false
  notes.length = 0
  stage.cursor = { x: battle.units[0]?.x ?? 1, y: battle.units[0]?.y ?? 1 }
  refreshRange()
  render()
  schedulePump()
}

function travel(place: string): void {
  if (!campaign) return
  campaign.location = place
  const encounter = rollEncounter(campaign, place, { d100: () => Math.floor(Math.random() * 100), int: (n) => Math.floor(Math.random() * n) })
  if (encounter) {
    battle = encounter
    score.ui()
    beginField()
    return
  }
  render()
}

function refreshRange(): void {
  stage.range = []
  stage.threat = []
  if (!battle) return
  const active = battle.units.find((unit) => unit.id === battle!.activeId)
  if (!active) return
  if (aiming === 'move' && !active.moved) stage.range = reachable(battle, active).map((tile) => ({ x: tile.x, y: tile.y }))
  if (aiming === 'attack') stage.threat = weaponRangeTiles(battle, active).map((tile) => ({ x: tile.x, y: tile.y }))
  if (aiming === 'ability' && abilityId) {
    stage.threat = weaponRangeTiles(battle, active).map((tile) => ({ x: tile.x, y: tile.y }))
  }
  if (aiming === 'phoenix') {
    stage.threat = battle.tiles
      .filter((tile) => Math.abs(tile.x - active.x) + Math.abs(tile.y - active.y) <= 1)
      .map((tile) => ({ x: tile.x, y: tile.y }))
  }
}

function handle(command: Command): void {
  if (mode !== 'battle' || !battle) {
    if (command === 'confirm' && mode === 'title') { mode = 'naming'; render() }
    if (command === 'cancel' && mode !== 'title') { mode = campaign ? 'world' : 'title'; render() }
    return
  }
  if (command === 'menu') { mode = 'options'; returnMode = 'battle'; render(); return }
  if (command === 'speed' && campaign) {
    campaign.options.animSpeed = campaign.options.animSpeed >= 4 ? 1 : campaign.options.animSpeed + 1
    return
  }
  if (command === 'left') stage.cursor.x = Math.max(0, stage.cursor.x - 1)
  if (command === 'right') stage.cursor.x = Math.min(battle.w - 1, stage.cursor.x + 1)
  if (command === 'up') stage.cursor.y = Math.max(0, stage.cursor.y - 1)
  if (command === 'down') stage.cursor.y = Math.min(battle.h - 1, stage.cursor.y + 1)
  if (command === 'undo' && undoMove(battle)) { aiming = 'move'; score.ui(); refreshRange() }
  if (command === 'wait') {
    const active = battle.units.find((unit) => unit.id === battle!.activeId)
    if (active) {
      remember(`${active.name} waits`)
      commitTurn(battle, active)
      score.ui()
      schedulePump()
    }
  }
  if (command === 'act') { menu = menu === 'act' ? 'root' : 'act'; render(); return }
  if (command === 'cancel') { menu = 'root'; aiming = 'move'; refreshRange() }
  if (command === 'confirm') confirmTile(stage.cursor.x, stage.cursor.y)
  const readout = document.querySelector('.readout')
  if (readout) readout.textContent = `Tile ${colName(stage.cursor.x)}${stage.cursor.y + 1}`
  publishState()
}

function confirmTile(x: number, y: number): void {
  if (!battle) return
  const active = battle.units.find((unit) => unit.id === battle!.activeId)
  if (!active || battle.phase !== 'input') {
    stage.cursor = { x, y }
    return
  }
  if (aiming === 'move' && !active.moved) {
    if (moveUnit(battle, active, x, y)) {
      score.move()
      remember(`${active.name} moved to ${x},${y}`)
      aiming = 'attack'
      refreshRange()
      publishState()
      return
    }
  }
  const target = battle.units.find((unit) => unit.x === x && unit.y === y && !unit.dead && !unit.crystal)
  if (aiming === 'attack' && target && target.side === 'enemy') {
    if (attackCommand(battle, active, target)) {
      score.hit()
      remember(`${active.name} acts on ${target.name}`)
      commitTurn(battle, active)
      schedulePump()
      return
    }
  }
  if (aiming === 'ability' && abilityId) {
    if (cast(battle, active, abilityId, x, y)) {
      score.hit()
      if (!active.charging) commitTurn(battle, active)
      else commitTurn(battle, active)
      schedulePump()
    }
  }
  const fallen = battle.units.find((unit) => unit.x === x && unit.y === y && unit.dead && !unit.crystal)
  if (aiming === 'phoenix' && fallen && phoenixDown(battle, active, fallen)) {
    score.reward()
    remember(`${active.name} uses a phoenix down on ${fallen.name}`)
    commitTurn(battle, active)
    schedulePump()
  }
  stage.cursor = { x, y }
}

function schedulePump(): void {
  window.clearTimeout(pumpTimer)
  const speed = campaign?.options.animSpeed ?? 1
  const delay = speed >= 4 ? 0 : speed === 3 ? 40 : speed === 2 ? 90 : 160
  const step = () => {
    if (!battle || mode !== 'battle') return
    if (battle.result) {
      finishBattle()
      return
    }
    if (auto && battle.phase === 'input' && battle.activeId) {
      const active = battle.units.find((unit) => unit.id === battle!.activeId)
      if (active) {
        enemyTakeTurn(battle, active)
        remember(`${active.name} auto`)
      }
      pumpTimer = window.setTimeout(step, delay)
      return
    }
    if (battle.phase === 'input' && battle.activeId) {
      const stamp = `${battle.activeId}:${battle.tick}`
      if (shownTurn !== stamp) {
        shownTurn = stamp
        aiming = 'move'
        const active = battle.units.find((unit) => unit.id === battle!.activeId)
        if (active) stage.cursor = { x: active.x, y: active.y }
        refreshRange()
        render()
      }
      return
    }
    const outcome = advanceClock(battle)
    if (outcome === 'enemy') score.hit()
    pumpTimer = window.setTimeout(step, delay)
  }
  pumpTimer = window.setTimeout(step, delay)
}

function remember(text: string): void {
  notes.unshift(text)
  if (notes.length > 8) notes.length = 8
  const node = document.getElementById('battle-log')
  if (node) node.textContent = notes.join(' · ')
}

function publishState(): void {
  const node = document.getElementById('battle-state')
  if (!node || !battle) return
  const active = battle.units.find((unit) => unit.id === battle!.activeId)
  node.dataset.phase = battle.phase
  node.dataset.result = battle.result ?? ''
  node.dataset.active = active?.name ?? ''
  node.dataset.pos = active ? `${active.x},${active.y}` : ''
  node.dataset.hp = String(active?.hp ?? '')
  node.dataset.cursor = `${stage.cursor.x},${stage.cursor.y}`
  node.dataset.range = stage.range.map((tile) => `${tile.x},${tile.y}`).join(' ')
  node.dataset.foes = battle.units
    .filter((unit) => unit.side === 'enemy' && !unit.crystal)
    .map((unit) => `${unit.name}:${unit.x},${unit.y}:${unit.hp}:${unit.dead ? 1 : 0}`)
    .join('|')
}

function finishBattle(): void {
  if (!battle || !campaign) return
  auto = false
  absorbBattleLoot(campaign, battle)
  score.reward()
  if (battle.result === 'victory' && storyById(battle.id)) {
    const after = storyById(battle.id)?.after ?? []
    campaign = commitBattleVictory(campaign)
    battle = null
    if (campaign.phase === 'ending') { mode = 'ending'; render(); return }
    mode = 'scene'
    line = 0
    const cardNote = after[0]?.text
    if (cardNote && currentBattleDef(campaign)) {
      /* The next scene belongs to the following battle. Show the victory line on the world first. */
    }
    mode = 'world'
    render()
    const toast = el('p', 'sub', after.map((entry) => `${entry.speaker}: ${entry.text}`).join(' '))
    panel().append(toast)
    return
  }
  if (battle.id.startsWith('deep-') && battle.result === 'victory' && battle.exitBy === 'player') {
    completeDeepFloor(campaign, campaign.deepFloor + 1, true)
  }
  battle = null
  mode = 'world'
  render()
}

function bootInput(): void {
  window.addEventListener('keydown', (event) => {
    const command = commandFromKey(event.code)
    if (!command) return
    event.preventDefault()
    handle(command)
  })
  window.addEventListener('pointerdown', () => score.unlock(), { once: true })
  setTileHandler((x, y) => {
    stage.cursor = { x, y }
    handle('confirm')
  })
  const poll = () => {
    const pads = navigator.getGamepads?.() ?? []
    const pad = pads[0]
    if (pad) {
      const command = commandFromGamepad(pad)
      const signature = command ?? ''
      if (signature && signature !== lastPad) handle(command!)
      lastPad = signature
    }
    requestAnimationFrame(poll)
  }
  requestAnimationFrame(poll)
}

function cmdButton(label: string, command: string, className = ''): HTMLButtonElement {
  const node = button(label, () => {
    const mapped = commandFromPointer(command)
    if (mapped) handle(mapped)
  })
  if (className) node.classList.add(className)
  node.dataset.cmd = command
  return node
}

function button(label: string, onClick: () => void, kind = ''): HTMLButtonElement {
  const node = document.createElement('button')
  node.type = 'button'
  node.textContent = label
  if (kind) node.classList.add(kind)
  node.addEventListener('click', (event) => {
    event.stopPropagation()
    onClick()
  })
  return node
}

function el(tag: string, className = '', text = ''): HTMLElement {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function labeled(text: string, field: HTMLElement): HTMLElement {
  const wrap = document.createElement('label')
  wrap.append(document.createTextNode(text), field)
  return wrap
}

function input(type: string, value: string): HTMLInputElement {
  const node = document.createElement('input')
  node.type = type
  node.value = value
  return node
}

function clampNum(value: string, lo: number, hi: number): number {
  const n = Number(value)
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function colName(x: number): string {
  return String.fromCharCode(65 + x)
}

export function bootShell(): void {
  bootInput()
  render()
}

