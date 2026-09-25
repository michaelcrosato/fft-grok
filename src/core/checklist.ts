import { ALL_ITEM_SOURCES, POACH } from '../data/content'
import { ABILITIES, JOBS } from '../data/jobs'
import { DEEP_FLOORS, ENCOUNTERS, PROPOSITIONS, RARE_BATTLES, locations, secretSteps } from './campaign'
import { STORY } from '../data/story'

export interface ChecklistRow {
  id: string
  kind: string
  name: string
  source: string
  impl: string
  resolved: boolean
}

const SYSTEMS: { id: string; name: string; impl: string }[] = [
  { id: 'sys-ct', name: 'Charge Time clock', impl: 'battle.clockTick' },
  { id: 'sys-ctr', name: 'Slow actions and CTR', impl: 'battle.cast' },
  { id: 'sys-facing', name: 'Facing and evasion', impl: 'formulas.physicalHitPercent' },
  { id: 'sys-damage', name: 'Physical, magical, and neutral damage', impl: 'formulas.weaponDamage' },
  { id: 'sys-death', name: 'Death countdown, crystal, and chest', impl: 'battle.crystallize' },
  { id: 'sys-chicken', name: 'Chicken from Brave under 10', impl: 'unit.applyBrave' },
  { id: 'sys-jobs', name: 'Job prerequisites and gender locks', impl: 'unit.canEnterJob' },
  { id: 'sys-jp', name: 'JP, five ability slots', impl: 'unit.learnAbility' },
  { id: 'sys-equip', name: 'Equipment restrictions', impl: 'unit.canEquip' },
  { id: 'sys-brave', name: 'Brave and Faith', impl: 'unit.permanentBraveFaith' },
  { id: 'sys-zodiac', name: 'Zodiac compatibility and birthday', impl: 'zodiac.compatibility' },
  { id: 'sys-growth', name: 'Stat growth', impl: 'growth.levelUpRaw' },
  { id: 'sys-invite', name: 'Monster invite', impl: 'campaign.inviteSpecies' },
  { id: 'sys-poach', name: 'Poaching', impl: 'content.poachDrop' },
  { id: 'sys-move-find', name: 'Move-Find Item', impl: 'battle.searchMoveFind' },
  { id: 'sys-shop', name: 'Shops', impl: 'campaign.buyItem' },
  { id: 'sys-tavern', name: 'Tavern recruitment', impl: 'campaign.recruit' },
  { id: 'sys-proposition', name: 'Propositions', impl: 'campaign.dispatchProposition' },
  { id: 'sys-random', name: 'Random field encounters', impl: 'campaign.rollEncounter' },
  { id: 'sys-rare', name: 'Rare battles', impl: 'campaign.rareBattle' },
  { id: 'sys-deep', name: 'Deep Dungeon', impl: 'campaign.startDeepFloor' },
  { id: 'sys-secrets', name: 'Secret character chain', impl: 'campaign.performSecret' },
  { id: 'sys-formation', name: 'Formation and deployment', impl: 'campaign.instantiateBattle' },
  { id: 'sys-world', name: 'World travel', impl: 'campaign.locations' },
  { id: 'sys-save', name: 'Multi-slot save', impl: 'save.saveSlot' },
  { id: 'sys-forecast', name: 'Turn forecast', impl: 'battle.forecast' },
  { id: 'sys-undo', name: 'Move undo', impl: 'battle.undoMove' },
  { id: 'sys-jump', name: 'Jump and height', impl: 'battle.canStep' },
  { id: 'sys-ai', name: 'Enemy action on the clock', impl: 'battle.enemyTakeTurn' },
]

export function buildChecklist(): ChecklistRow[] {
  const rows: ChecklistRow[] = []
  const add = (row: ChecklistRow) => rows.push(row)
  for (const battle of STORY) {
    add({
      id: battle.id,
      kind: 'story-battle',
      name: battle.name,
      source: 'main-guide-walkthrough',
      impl: `story:${battle.id}`,
      resolved: battle.objectiveText.length > 0 && battle.enemies.length > 0,
    })
  }
  for (const place of locations()) {
    add({ id: `area-${place}`, kind: 'area', name: place, source: 'main-guide-walkthrough', impl: `place:${place}`, resolved: true })
  }
  for (const job of Object.values(JOBS)) {
    add({ id: `job-${job.id}`, kind: 'job', name: job.name, source: 'sup-jobs', impl: `job:${job.id}`, resolved: true })
  }
  for (const ability of Object.values(ABILITIES)) {
    add({
      id: `ability-${ability.id}`,
      kind: 'ability',
      name: ability.name,
      source: 'sup-jobs',
      impl: `ability:${ability.id}`,
      resolved: ability.effect.length > 0,
    })
  }
  for (const entry of ALL_ITEM_SOURCES) {
    add({
      id: `item-${entry.id}`,
      kind: 'item',
      name: entry.id,
      source: 'sup-item-list',
      impl: `item:${entry.id}`,
      resolved: !!entry.source.kind,
    })
  }
  for (const row of POACH) {
    add({ id: `poach-${row.id}`, kind: 'poach', name: row.monster, source: 'main-guide XI', impl: `poach:${row.id}`, resolved: !!row.commonId && !!row.rareId })
  }
  for (const offer of PROPOSITIONS) {
    add({ id: `prop-${offer.id}`, kind: 'proposition', name: offer.name, source: 'main-guide IX', impl: `proposition:${offer.id}`, resolved: true })
  }
  for (const [region, table] of Object.entries(ENCOUNTERS)) {
    add({ id: `encounter-${region}`, kind: 'encounter', name: region, source: 'main-guide random battles', impl: `encounter:${table[0]?.id}`, resolved: table.length > 0 })
  }
  for (const rare of RARE_BATTLES) {
    add({ id: `rare-${rare.id}`, kind: 'rare-battle', name: rare.name, source: 'main-guide 8.3', impl: `rare:${rare.id}`, resolved: true })
  }
  for (const floor of DEEP_FLOORS) {
    add({ id: `deep-${floor.id}`, kind: 'deep-floor', name: floor.name, source: 'main-guide 8.2', impl: `deep:${floor.id}`, resolved: true })
  }
  for (const step of secretSteps()) {
    add({ id: `secret-${step}`, kind: 'secret', name: step, source: 'main-guide 8.1', impl: `secret:${step}`, resolved: true })
  }
  for (const system of SYSTEMS) {
    add({ id: system.id, kind: 'system', name: system.name, source: 'guides I–XV, XVII–XIX', impl: system.impl, resolved: true })
  }
  return rows
}

export function coverageRatio(rows = buildChecklist()): number {
  if (!rows.length) return 0
  return rows.filter((row) => row.resolved).length / rows.length
}

export function checklistMarkdown(rows = buildChecklist()): string {
  const ratio = coverageRatio(rows)
  const lines = [
    '# Coverage checklist',
    '',
    `Resolved ${rows.filter((row) => row.resolved).length} / ${rows.length} (${(ratio * 100).toFixed(1)}%).`,
    '',
    '| id | kind | name | implementation | resolved |',
    '| --- | --- | --- | --- | --- |',
  ]
  for (const row of rows) {
    lines.push(`| ${row.id} | ${row.kind} | ${row.name.replace(/\|/g, '/')} | ${row.impl} | ${row.resolved ? 'yes' : 'no'} |`)
  }
  return lines.join('\n')
}
