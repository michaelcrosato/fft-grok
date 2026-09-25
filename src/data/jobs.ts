export type Slot = 'action' | 'reaction' | 'support' | 'movement'

export interface JobDef {
  id: string
  name: string
  /** Class index in the mechanics compendium, used for growth. */
  classIndex: string
  prereq: { job: string; level: number }[]
  gender?: 'male' | 'female'
  /** Only this unique character may enter the job. */
  special?: string
  move: number
  jump: number
  cev: number
  weapons: string[]
  shield: boolean
  head: string[]
  body: string[]
  monster?: boolean
  innate?: string[]
}

export interface AbilityDef {
  id: string
  name: string
  job: string
  slot: Slot
  jp: number
  mp: number
  ctr: number
  range: number
  vert: number
  aoe: number
  element?: string
  effect: string
  power: number
  status?: string
}

export const JOBS: Record<string, JobDef> = {}
export const ABILITIES: Record<string, AbilityDef> = {}
export const ABILITIES_BY_JOB: Record<string, AbilityDef[]> = {}

function job(def: JobDef): void {
  JOBS[def.id] = def
  ABILITIES_BY_JOB[def.id] = []
}

function ab(partial: AbilityDef): void {
  ABILITIES[partial.id] = partial
  const list = ABILITIES_BY_JOB[partial.job] ?? []
  list.push(partial)
  ABILITIES_BY_JOB[partial.job] = list
}

function act(
  jobId: string,
  name: string,
  jp: number,
  effect: string,
  extra: Partial<AbilityDef> = {},
): void {
  const id = `${jobId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  ab({
    id,
    name,
    job: jobId,
    slot: 'action',
    jp,
    mp: extra.mp ?? 0,
    ctr: extra.ctr ?? 0,
    range: extra.range ?? 1,
    vert: extra.vert ?? 3,
    aoe: extra.aoe ?? 0,
    element: extra.element,
    effect,
    power: extra.power ?? 0,
    status: extra.status,
  })
}

function passive(jobId: string, slot: Slot, name: string, jp: number, effect: string): void {
  const id = `${jobId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  ab({
    id,
    name,
    job: jobId,
    slot,
    jp,
    mp: 0,
    ctr: 0,
    range: 0,
    vert: 0,
    aoe: 0,
    effect,
    power: 0,
  })
}

const human = {
  prereq: [] as { job: string; level: number }[],
}

job({
  id: 'squire', name: 'Squire', classIndex: '4A', ...human,
  move: 4, jump: 3, cev: 5,
  weapons: ['knife', 'sword', 'axe', 'flail'], shield: false,
  head: ['hat'], body: ['clothes'],
})
job({
  id: 'knight', name: 'Knight', classIndex: '4C',
  prereq: [{ job: 'squire', level: 2 }],
  move: 3, jump: 3, cev: 10,
  weapons: ['sword', 'knight-sword'], shield: true,
  head: ['helmet'], body: ['armor', 'robe'],
})
job({
  id: 'archer', name: 'Archer', classIndex: '4D',
  prereq: [{ job: 'squire', level: 2 }],
  move: 3, jump: 3, cev: 10,
  weapons: ['bow', 'crossbow'], shield: true,
  head: ['hat'], body: ['clothes'],
})
job({
  id: 'monk', name: 'Monk', classIndex: '4E',
  prereq: [{ job: 'knight', level: 2 }],
  move: 3, jump: 4, cev: 20,
  weapons: [], shield: false, head: [], body: [],
})
job({
  id: 'thief', name: 'Thief', classIndex: '53',
  prereq: [{ job: 'archer', level: 2 }],
  move: 4, jump: 4, cev: 25,
  weapons: ['knife'], shield: false, head: ['hat'], body: ['clothes'],
})
job({
  id: 'geomancer', name: 'Geomancer', classIndex: '56',
  prereq: [{ job: 'monk', level: 3 }],
  move: 4, jump: 3, cev: 10,
  weapons: ['sword', 'axe', 'flail'], shield: false, head: ['hat'], body: ['clothes'],
})
job({
  id: 'lancer', name: 'Lancer', classIndex: '57',
  prereq: [{ job: 'thief', level: 3 }],
  move: 3, jump: 4, cev: 15,
  weapons: ['spear'], shield: false, head: ['helmet'], body: ['armor'],
})
job({
  id: 'dancer', name: 'Dancer', classIndex: '5C',
  prereq: [{ job: 'geomancer', level: 4 }, { job: 'lancer', level: 4 }],
  gender: 'female',
  move: 3, jump: 3, cev: 5,
  weapons: ['knife', 'cloth'], shield: false, head: ['hat', 'ribbon'], body: ['clothes'],
})
job({
  id: 'chemist', name: 'Chemist', classIndex: '4B', ...human,
  move: 3, jump: 3, cev: 5,
  weapons: ['knife', 'gun'], shield: false, head: ['hat'], body: ['clothes'],
  innate: ['chemist-throw-item'],
})
job({
  id: 'priest', name: 'Priest', classIndex: '4F',
  prereq: [{ job: 'chemist', level: 2 }],
  move: 3, jump: 3, cev: 5,
  weapons: ['staff'], shield: false, head: ['hat'], body: ['clothes', 'robe'],
})
job({
  id: 'wizard', name: 'Wizard', classIndex: '50',
  prereq: [{ job: 'chemist', level: 2 }],
  move: 3, jump: 3, cev: 5,
  weapons: ['rod'], shield: false, head: ['hat'], body: ['clothes', 'robe'],
})
job({
  id: 'oracle', name: 'Oracle', classIndex: '55',
  prereq: [{ job: 'priest', level: 2 }],
  move: 3, jump: 3, cev: 5,
  weapons: ['rod', 'stick'], shield: false, head: ['hat'], body: ['clothes', 'robe'],
})
job({
  id: 'time-mage', name: 'Time Mage', classIndex: '51',
  prereq: [{ job: 'wizard', level: 2 }],
  move: 3, jump: 3, cev: 5,
  weapons: ['staff'], shield: false, head: ['hat'], body: ['clothes', 'robe'],
})
job({
  id: 'mediator', name: 'Mediator', classIndex: '54',
  prereq: [{ job: 'oracle', level: 2 }],
  move: 3, jump: 3, cev: 5,
  weapons: ['knife', 'gun'], shield: false, head: ['hat'], body: ['clothes'],
})
job({
  id: 'summoner', name: 'Summoner', classIndex: '52',
  prereq: [{ job: 'time-mage', level: 2 }],
  move: 3, jump: 3, cev: 5,
  weapons: ['rod'], shield: false, head: ['hat'], body: ['clothes', 'robe'],
})
job({
  id: 'bard', name: 'Bard', classIndex: '5B',
  prereq: [{ job: 'mediator', level: 4 }, { job: 'summoner', level: 4 }],
  gender: 'male',
  move: 3, jump: 3, cev: 5,
  weapons: ['instrument'], shield: false, head: ['hat'], body: ['clothes'],
})
job({
  id: 'samurai', name: 'Samurai', classIndex: '58',
  prereq: [{ job: 'knight', level: 3 }, { job: 'monk', level: 4 }, { job: 'lancer', level: 2 }],
  move: 3, jump: 3, cev: 20,
  weapons: ['katana'], shield: false, head: ['helmet'], body: ['armor'],
})
job({
  id: 'ninja', name: 'Ninja', classIndex: '59',
  prereq: [{ job: 'archer', level: 3 }, { job: 'thief', level: 4 }, { job: 'geomancer', level: 2 }],
  move: 4, jump: 4, cev: 30,
  weapons: ['ninja-sword', 'knife'], shield: false, head: ['hat'], body: ['clothes'],
})
job({
  id: 'calculator', name: 'Calculator', classIndex: '5A',
  prereq: [
    { job: 'priest', level: 4 }, { job: 'wizard', level: 4 },
    { job: 'time-mage', level: 3 }, { job: 'oracle', level: 3 },
  ],
  move: 3, jump: 3, cev: 5,
  weapons: ['dictionary'], shield: false, head: ['hat'], body: ['clothes', 'robe'],
})
job({
  id: 'mime', name: 'Mime', classIndex: '5D',
  prereq: [
    { job: 'squire', level: 8 }, { job: 'chemist', level: 8 },
    { job: 'geomancer', level: 4 }, { job: 'lancer', level: 4 },
    { job: 'mediator', level: 4 }, { job: 'summoner', level: 4 },
  ],
  move: 4, jump: 4, cev: 5,
  weapons: [], shield: false, head: [], body: [],
})

const special = (
  id: string, name: string, classIndex: string, who: string,
  weapons: string[], extra: Partial<JobDef> = {},
): void => {
  job({
    id, name, classIndex, special: who, prereq: [],
    move: extra.move ?? 4, jump: extra.jump ?? 3, cev: extra.cev ?? 10,
    weapons, shield: extra.shield ?? true,
    head: extra.head ?? ['helmet', 'hat'],
    body: extra.body ?? ['armor', 'clothes', 'robe'],
  })
}

special('holy-knight', 'Holy Knight', '01', 'agrias', ['sword', 'knight-sword'])
special('dark-knight', 'Dark Knight', '4C', 'gafgarion', ['sword', 'knight-sword'])
special('engineer', 'Engineer', '4A', 'mustadio', ['gun'], { shield: false, head: ['hat'], body: ['clothes'] })
special('heaven-knight', 'Heaven Knight', '4F', 'rafa', ['staff'], { shield: false, head: ['hat'], body: ['robe', 'clothes'] })
special('hell-knight', 'Hell Knight', '50', 'malak', ['rod'], { shield: false, head: ['hat'], body: ['robe', 'clothes'] })
special('divine-knight', 'Divine Knight', '4C', 'meliadoul', ['sword', 'knight-sword'])
special('holy-swordsman', 'Holy Swordsman', '4C', 'orlandu', ['sword', 'knight-sword'])
special('temple-knight', 'Temple Knight', '4C', 'wiegraf', ['sword', 'knight-sword'])
special('dragoner', 'Dragoner', '57', 'reis', ['spear'], { shield: false })
special('soldier', 'Soldier', '4A', 'algus', ['sword', 'knife'])
special('squire-ramza', 'Squire', '01', 'ramza', ['knife', 'sword', 'flail'], {
  shield: false, head: ['hat'], body: ['clothes', 'robe'], cev: 10, move: 4,
})

function monster(id: string, name: string, classIndex: string, move = 3, jump = 3, cev = 10): void {
  job({
    id, name, classIndex, prereq: [], monster: true,
    move, jump, cev, weapons: [], shield: false, head: [], body: [],
  })
}
monster('chocobo', 'Chocobo', '5E', 6, 5, 15)
monster('goblin', 'Goblin', '61', 3, 3, 18)
monster('red-panther', 'Red Panther', '64', 5, 4, 15)
monster('bomb', 'Bomb', '64', 3, 3, 10)
monster('skeleton', 'Skeleton', '61', 3, 3, 10)
monster('ghoul', 'Ghoul', '61', 4, 3, 12)
monster('ahriman', 'Ahriman', '64', 4, 3, 8)
monster('pisco-demon', 'Pisco Demon', '64', 3, 3, 8)
monster('juravis', 'Juravis', '5E', 5, 4, 12)
monster('bull-demon', 'Bull Demon', '64', 4, 3, 8)
monster('morbol', 'Morbol', '64', 3, 3, 5)
monster('woodman', 'Woodman', '64', 3, 3, 8)
monster('dragon', 'Dragon', '64', 5, 4, 10)
monster('behemoth', 'Behemoth', '64', 4, 3, 8)
monster('hyudra', 'Hyudra', '64', 4, 3, 8)
monster('uribo', 'Uribo', '61', 4, 3, 10)
monster('lucavi', 'Lucavi', '64', 4, 3, 5)

act('squire', 'Accumulate', 300, 'pa+1', { range: 0 })
act('squire', 'Dash', 80, 'dash', { range: 1, vert: 1 })
act('squire', 'Throw Stone', 90, 'stone', { range: 4, vert: 3 })
act('squire', 'Heal', 150, 'cancel', { range: 1, vert: 2, status: 'darkness,silence,poison' })
passive('squire', 'reaction', 'Counter Tackle', 180, 'reaction:counter')
passive('squire', 'support', 'Equip Axe', 170, 'flag:equip-axe')
passive('squire', 'support', 'Monster Skill', 200, 'flag:monster-skill')
passive('squire', 'support', 'Defend', 50, 'flag:defend')
passive('squire', 'support', 'Gained JP UP', 200, 'flag:jp-up')
passive('squire', 'movement', 'Move +1', 200, 'move:+1')

act('squire-ramza', 'Accumulate', 300, 'pa+1', { range: 0 })
act('squire-ramza', 'Dash', 80, 'dash', { range: 1, vert: 1 })
act('squire-ramza', 'Throw Stone', 90, 'stone', { range: 4 })
act('squire-ramza', 'Yell', 200, 'sp+1', { range: 1, vert: 3 })
act('squire-ramza', 'Cheer Up', 200, 'brave+4', { range: 1, vert: 3 })
act('squire-ramza', 'Wish', 400, 'heal:pct', { range: 0, power: 25 })
passive('squire-ramza', 'reaction', 'Counter Tackle', 180, 'reaction:counter')
passive('squire-ramza', 'support', 'Gained JP UP', 200, 'flag:jp-up')
passive('squire-ramza', 'movement', 'Move +1', 200, 'move:+1')

for (const [name, jp, slot] of [
  ['Head Break', 300, 'head'],
  ['Armor Break', 400, 'body'],
  ['Shield Break', 300, 'shield'],
  ['Weapon Break', 400, 'weapon'],
] as const) {
  act('knight', name, jp, `break:${slot}`, { range: 1, vert: 2 })
}
act('knight', 'Magic Break', 250, 'down:mp', { range: 1, power: 20 })
act('knight', 'Speed Break', 250, 'down:sp', { range: 1, power: 2 })
act('knight', 'Power Break', 250, 'down:pa', { range: 1, power: 3 })
act('knight', 'Mind Break', 250, 'down:ma', { range: 1, power: 3 })
passive('knight', 'reaction', 'Weapon Guard', 200, 'flag:weapon-guard')
passive('knight', 'support', 'Equip Armor', 500, 'flag:equip-armor')
passive('knight', 'support', 'Equip Shield', 250, 'flag:equip-shield')
passive('knight', 'support', 'Equip Sword', 400, 'flag:equip-sword')

const chargeCtr: Record<number, number> = { 1: 4, 2: 5, 3: 6, 4: 8, 5: 10, 7: 14, 10: 20, 20: 35 }
for (const [k, jp] of [[1, 100], [2, 150], [3, 200], [4, 250], [5, 300], [7, 400], [10, 500], [20, 700]] as const) {
  act('archer', `Charge +${k}`, jp, `charge:${k}`, { ctr: chargeCtr[k], range: 8, vert: 8, power: k })
}
passive('archer', 'reaction', 'Arrow Guard', 400, 'flag:arrow-guard')
passive('archer', 'support', 'Concentrate', 400, 'flag:concentrate')
passive('archer', 'support', 'Equip Crossbow', 350, 'flag:equip-crossbow')

act('monk', 'Spin Fist', 300, 'punch', { range: 1, power: 1 })
act('monk', 'Repeating Fist', 400, 'punch', { range: 1, power: 2 })
act('monk', 'Wave Fist', 300, 'punch', { range: 3, power: 1 })
act('monk', 'Earth Slash', 500, 'punch', { range: 4, power: 2, element: 'earth' })
act('monk', 'Secret Fist', 300, 'add', { range: 1, status: 'doom' })
act('monk', 'Chakra', 350, 'heal:pct', { range: 0, power: 33 })
act('monk', 'Revive', 500, 'revive:half', { range: 1, vert: 2 })
act('monk', 'Stigma Magic', 200, 'purge', { range: 1 })
passive('monk', 'reaction', 'Hamedo', 1200, 'reaction:counter')
passive('monk', 'reaction', 'Counter', 300, 'reaction:counter')
passive('monk', 'support', 'Martial Arts', 200, 'flag:martial-arts')
passive('monk', 'support', 'HP Restore', 400, 'flag:hp-restore')
passive('monk', 'movement', 'Move-HP Up', 300, 'move:hp')

for (const [name, jp, slot] of [
  ['Steal Gil', 100, 'gil'],
  ['Steal Heart', 200, 'heart'],
  ['Steal Helmet', 300, 'head'],
  ['Steal Armor', 400, 'body'],
  ['Steal Shield', 300, 'shield'],
  ['Steal Weapon', 500, 'weapon'],
  ['Steal Accessory', 400, 'accessory'],
] as const) {
  act('thief', name, jp, `steal:${slot}`, { range: 1, vert: 2 })
}
passive('thief', 'reaction', 'Caution', 200, 'flag:caution')
passive('thief', 'reaction', 'Catch', 200, 'reaction:catch')
passive('thief', 'support', 'Secret Hunt', 200, 'flag:secret-hunt')
passive('thief', 'support', 'Maintenance', 250, 'flag:maintenance')
passive('thief', 'movement', 'Move +2', 400, 'move:+2')
passive('thief', 'movement', 'Jump +2', 400, 'move:jump+2')

act('geomancer', 'Geomancy', 0, 'geomancy', { range: 4, vert: 3, aoe: 1, jp: 0 })
// Geomancy is the primary command and is known when the job is entered.
ABILITIES['geomancer-geomancy'].jp = 0
passive('geomancer', 'support', 'Attack UP', 400, 'flag:attack-up')
passive('geomancer', 'support', 'Magic Attack UP', 400, 'flag:magic-attack-up')
passive('geomancer', 'movement', 'Any Ground', 200, 'move:any-ground')
passive('geomancer', 'movement', 'Ignore Height', 700, 'move:ignore-height')

act('lancer', 'Jump', 0, 'jump', { range: 1, vert: 1, ctr: 4 })
passive('lancer', 'support', 'Equip Spear', 400, 'flag:equip-spear')
passive('lancer', 'movement', 'Jump +1', 200, 'move:jump+1')
for (const n of [2, 3, 4, 5, 8]) {
  act('lancer', `Level Jump ${n}`, 150 * (n - 1), 'jump-range', { range: 0, power: n })
}

for (const [name, status] of [
  ['Witch Hunt', 'silence'],
  ['Slow Dance', 'slow'],
  ['Polka Polka', 'haste'],
  ['Disillusion', 'sleep'],
  ['Nameless Dance', 'doom'],
] as const) {
  act('dancer', name, 100, 'add', { range: 0, aoe: 3, status, jp: 100 })
}
act('dancer', 'Last Dance', 400, 'add', { range: 0, aoe: 3, status: 'stop' })
passive('dancer', 'reaction', 'Brave Up', 500, 'reaction:brave-up')
passive('dancer', 'movement', 'Fly', 900, 'move:fly')

const items: [string, number, string, number][] = [
  ['Potion', 30, 'heal:flat', 30],
  ['Hi-Potion', 200, 'heal:flat', 70],
  ['X-Potion', 300, 'heal:flat', 150],
  ['Ether', 200, 'mp:flat', 20],
  ['Hi-Ether', 300, 'mp:flat', 50],
  ['Elixir', 500, 'elixir', 0],
  ['Antidote', 80, 'cancel', 0],
  ['Eye Drop', 80, 'cancel', 0],
  ['Echo Grass', 80, 'cancel', 0],
  ["Maiden's Kiss", 150, 'cancel', 0],
  ['Soft', 150, 'cancel', 0],
  ['Holy Water', 400, 'cancel', 0],
  ['Remedy', 700, 'cancel', 0],
  ['Phoenix Down', 90, 'revive:phoenix', 0],
]
const itemStatus: Record<string, string> = {
  Antidote: 'poison',
  'Eye Drop': 'darkness',
  'Echo Grass': 'silence',
  "Maiden's Kiss": 'frog',
  Soft: 'petrify',
  'Holy Water': 'undead,blood-suck',
  Remedy: 'petrify,darkness,confusion,silence,frog,poison,sleep',
}
for (const [name, jp, effect, power] of items) {
  act('chemist', name, jp, effect, {
    range: 1, vert: 2, power,
    status: itemStatus[name],
  })
}
passive('chemist', 'reaction', 'Auto Potion', 400, 'reaction:auto-potion')
passive('chemist', 'support', 'Throw Item', 200, 'flag:throw-item')
passive('chemist', 'support', 'Maintenance', 250, 'flag:maintenance')
passive('chemist', 'movement', 'Move-Find Item', 250, 'move:find')

const white: [string, number, number, number, string, number, string?][] = [
  ['Cure', 50, 6, 3, 'magic-heal', 14],
  ['Cure 2', 150, 12, 4, 'magic-heal', 18],
  ['Cure 3', 300, 20, 5, 'magic-heal', 24],
  ['Cure 4', 500, 30, 6, 'magic-heal', 32],
  ['Raise', 180, 10, 4, 'revive:half', 0],
  ['Raise 2', 500, 20, 10, 'revive:full', 0],
  ['Reraise', 400, 16, 7, 'add', 0, 'reraise'],
  ['Regen', 300, 8, 4, 'add', 0, 'regen'],
  ['Protect', 200, 6, 4, 'add', 0, 'protect'],
  ['Protect 2', 400, 24, 7, 'add', 0, 'protect'],
  ['Shell', 200, 6, 4, 'add', 0, 'shell'],
  ['Shell 2', 400, 20, 7, 'add', 0, 'shell'],
  ['Wall', 400, 24, 4, 'add', 0, 'protect'],
  ['Esuna', 300, 18, 3, 'purge', 0],
  ['Holy', 600, 40, 6, 'magic', 50, 'holy'],
]
for (const row of white) {
  const [name, jp, mp, ctr, effect, power, element] = row
  act('priest', name, jp, effect, { mp, ctr, range: 4, vert: 3, power, element, aoe: name.endsWith('2') || name === 'Holy' ? 0 : 1 })
}
passive('priest', 'support', 'Magic Defend UP', 400, 'flag:magic-defend-up')
passive('priest', 'movement', 'Move-MP Up', 300, 'move:mp')

const black: [string, number, number, number, number, string][] = [
  ['Fire', 50, 6, 4, 14, 'fire'],
  ['Fire 2', 200, 12, 5, 18, 'fire'],
  ['Fire 3', 400, 24, 7, 24, 'fire'],
  ['Fire 4', 700, 48, 10, 32, 'fire'],
  ['Ice', 50, 6, 4, 14, 'ice'],
  ['Ice 2', 200, 12, 5, 18, 'ice'],
  ['Ice 3', 400, 24, 7, 24, 'ice'],
  ['Ice 4', 700, 48, 10, 32, 'ice'],
  ['Bolt', 50, 6, 4, 14, 'lightning'],
  ['Bolt 2', 200, 12, 5, 18, 'lightning'],
  ['Bolt 3', 400, 24, 7, 24, 'lightning'],
  ['Bolt 4', 700, 48, 10, 32, 'lightning'],
  ['Poison', 150, 6, 3, 0, 'poison'],
  ['Frog', 300, 12, 5, 0, 'frog'],
  ['Death', 600, 24, 10, 0, 'dead'],
  ['Flare', 900, 60, 7, 46, ''],
]
for (const [name, jp, mp, ctr, q, element] of black) {
  const effect = q > 0 ? 'magic' : 'add'
  act('wizard', name, jp, effect, {
    mp, ctr, range: 4, vert: 3, power: q || 160, element: element || undefined,
    status: q > 0 ? undefined : element, aoe: 1,
  })
}
passive('wizard', 'reaction', 'Counter Magic', 800, 'reaction:counter-magic')
passive('wizard', 'support', 'Magic Attack UP', 400, 'flag:magic-attack-up')
passive('wizard', 'movement', 'Teleport', 500, 'move:teleport')

const mystic: [string, number, string, number][] = [
  ['Blind', 100, 'darkness', 200],
  ['Silence', 150, 'silence', 200],
  ['Confuse', 300, 'confusion', 190],
  ['Sleep', 250, 'sleep', 170],
  ['Petrify', 400, 'petrify', 120],
  ['Paralyze', 200, 'dont-act', 185],
  ['Zombie', 400, 'undead', 100],
  ['Dispel Magic', 350, 'purge', 200],
  ['Spell Absorb', 200, 'drain-mp', 160],
  ['Life Drain', 350, 'drain-hp', 160],
]
for (const [name, jp, status, y] of mystic) {
  const effect = status === 'purge' ? 'purge' : status.startsWith('drain') ? status : 'faith-status'
  act('oracle', name, jp, effect, { mp: 12, ctr: status === 'petrify' ? 9 : 4, range: 4, power: y, status, aoe: 0 })
}
passive('oracle', 'support', 'Defense UP', 400, 'flag:defense-up')
passive('oracle', 'movement', 'Move-Get Exp', 400, 'move:exp')

const time: [string, number, number, number, string, string?][] = [
  ['Haste', 200, 8, 2, 'add', 'haste'],
  ['Haste 2', 500, 30, 7, 'add', 'haste'],
  ['Slow', 150, 8, 2, 'faith-status', 'slow'],
  ['Slow 2', 400, 30, 7, 'faith-status', 'slow'],
  ['Stop', 400, 14, 7, 'faith-status', 'stop'],
  ["Don't Move", 200, 10, 3, 'faith-status', 'dont-move'],
  ['Float', 200, 8, 2, 'add', 'float'],
  ['Reflect', 300, 12, 2, 'add', 'reflect'],
  ['Quick', 800, 24, 4, 'quick'],
  ['Demi', 250, 24, 6, 'pct-hp'],
  ['Demi 2', 500, 50, 9, 'pct-hp'],
  ['Meteor', 900, 70, 15, 'magic'],
]
for (const [name, jp, mp, ctr, effect, status] of time) {
  act('time-mage', name, jp, effect, {
    mp, ctr, range: 4, vert: 3, status, aoe: name.endsWith('2') ? 2 : 1,
    power: name === 'Meteor' ? 60 : name === 'Demi' ? 25 : name === 'Demi 2' ? 50 : 180,
  })
}
passive('time-mage', 'support', 'Short Charge', 800, 'flag:short-charge')
passive('time-mage', 'movement', 'Teleport', 500, 'move:teleport')

for (const [name, jp, effect, power] of [
  ['Invitation', 100, 'invite', 0],
  ['Persuade', 200, 'invite', 0],
  ['Praise', 200, 'brave+4', 4],
  ['Threaten', 200, 'brave-20', 20],
  ['Preach', 300, 'faith+4', 4],
  ['Solution', 300, 'faith-20', 20],
  ['Death Sentence', 500, 'faith-status', 100],
  ['Mimic Daravon', 300, 'faith-status', 150],
  ['Insult', 200, 'faith-status', 180],
] as const) {
  act('mediator', name, jp, effect, {
    range: 3, vert: 2, power,
    status: name === 'Death Sentence' ? 'doom' : name === 'Mimic Daravon' ? 'sleep' : name === 'Insult' ? 'berserk' : undefined,
    mp: 0, ctr: 0,
  })
}
passive('mediator', 'support', 'Equip Gun', 400, 'flag:equip-gun')
passive('mediator', 'support', 'Monster Talk', 300, 'flag:monster-talk')
passive('mediator', 'support', 'Train', 500, 'flag:train')
passive('mediator', 'reaction', 'Finger Guard', 400, 'flag:finger-guard')

const summons: [string, number, number, number, number, string][] = [
  ['Moogle', 100, 8, 2, 12, ''],
  ['Shiva', 200, 24, 4, 24, 'ice'],
  ['Ramuh', 200, 24, 4, 24, 'lightning'],
  ['Ifrit', 200, 24, 4, 24, 'fire'],
  ['Titan', 250, 30, 5, 28, 'earth'],
  ['Golem', 500, 40, 3, 0, ''],
  ['Carbunkle', 350, 30, 4, 0, ''],
  ['Bahamut', 800, 60, 8, 46, ''],
  ['Odin', 700, 50, 9, 40, ''],
  ['Leviathan', 700, 48, 9, 38, 'water'],
  ['Salamander', 700, 48, 9, 38, 'fire'],
  ['Fairy', 200, 24, 4, 0, ''],
  ['Lich', 600, 40, 9, 0, 'dark'],
  ['Cyclops', 600, 40, 7, 36, 'earth'],
  ['Zodiac', 0, 99, 10, 96, ''],
]
for (const [name, jp, mp, ctr, q, element] of summons) {
  const effect = name === 'Lich' ? 'lich' : name === 'Zodiac' ? 'zodiac-spell' : name === 'Golem' ? 'golem' : name === 'Carbunkle' ? 'add' : name === 'Fairy' || name === 'Moogle' ? 'magic-heal' : 'magic'
  act('summoner', name, jp, effect, {
    mp, ctr, range: 4, vert: 3, aoe: 2, power: q || (name === 'Lich' ? 50 : 12),
    element: element || undefined,
    status: name === 'Carbunkle' ? 'reflect' : undefined,
  })
}
passive('summoner', 'support', 'Half of MP', 400, 'flag:half-mp')

for (const name of ['Angel Song', 'Life Song', 'Cheer Song', 'Battle Song', 'Magic Song', 'Nameless Song', 'Last Song']) {
  const effect = name === 'Life Song' ? 'heal:pct' : name === 'Cheer Song' ? 'brave+4' : name === 'Battle Song' ? 'pa+1' : name === 'Magic Song' ? 'add' : name === 'Nameless Song' ? 'purge' : 'heal:flat'
  act('bard', name, 100, effect, { range: 0, aoe: 3, power: name === 'Life Song' ? 20 : 10, status: name === 'Magic Song' ? 'regen' : undefined })
}
passive('bard', 'movement', 'Move +3', 500, 'move:+3')
passive('bard', 'movement', 'Fly', 900, 'move:fly')

for (const name of ['Ashura', 'Kotetsu', 'Osafune', 'Murasame', 'Kiyomori', 'Muramasa', 'Kikuichimonji', 'Masamune', 'Chirijiraden']) {
  const heal = name === 'Murasame' || name === 'Kiyomori'
  act('samurai', name, 200, heal ? 'draw-heal' : 'draw', { range: 4, vert: 3, aoe: name === 'Kikuichimonji' ? 3 : 1, mp: 0 })
}
passive('samurai', 'support', 'Two Hands', 400, 'flag:two-hands')
passive('samurai', 'support', 'Equip Katana', 400, 'flag:equip-katana')
passive('samurai', 'reaction', 'Shirahadori', 700, 'flag:blade-grasp')

for (const name of ['Shuriken', 'Ball', 'Knife', 'Sword', 'Hammer', 'Katana', 'Ninja Sword', 'Axe', 'Spear']) {
  act('ninja', `Throw ${name}`, 100, 'throw', { range: 4, vert: 4, power: 0 })
}
passive('ninja', 'support', 'Two Swords', 400, 'flag:two-swords')
passive('ninja', 'support', 'Abandon', 400, 'flag:abandon')
passive('ninja', 'movement', 'Move +2', 400, 'move:+2')
passive('ninja', 'reaction', 'Vanish', 500, 'reaction:vanish')

act('calculator', 'Math Skill', 0, 'math', { range: 0, ctr: 1, aoe: 8 })
passive('calculator', 'support', 'Exp UP', 400, 'flag:exp-up')

act('mime', 'Mimic', 0, 'mimic', { range: 4 })

const holy = ['Stasis Sword', 'Split Punch', 'Crush Punch', 'Lightning Stab']
for (const name of holy) act('holy-knight', name, 0, name === 'Crush Punch' ? 'add' : 'holy-sword', { range: 1, vert: 2, status: name === 'Crush Punch' ? 'dead' : name === 'Stasis Sword' ? 'stop' : undefined, power: 2 })
act('dark-knight', 'Night Sword', 0, 'drain-hp', { range: 1, power: 50 })
act('dark-knight', 'Shadowbind', 0, 'add', { range: 3, status: 'dont-move' })
act('engineer', 'Leg Aim', 0, 'add', { range: 8, status: 'dont-move' })
act('engineer', 'Arm Aim', 0, 'add', { range: 8, status: 'dont-act' })
act('engineer', 'Seal Evil', 0, 'add', { range: 8, status: 'petrify' })
act('heaven-knight', 'Heaven Bolt', 0, 'magic', { range: 4, power: 24, element: 'holy', mp: 0 })
act('hell-knight', 'Nether Blast', 0, 'magic', { range: 4, power: 24, element: 'dark', mp: 0 })
act('divine-knight', 'Shellbust Stab', 0, 'holy-sword', { range: 1, power: 3 })
act('divine-knight', 'Blastar Punch', 0, 'holy-sword', { range: 1, power: 3 })
for (const name of ['Night Sword', 'Hallowed Bolt', 'Divine Ruination', 'Crush Punch']) {
  act('holy-swordsman', name, 0, 'holy-sword', { range: name === 'Hallowed Bolt' ? 4 : 2, power: 4, element: 'holy' })
}
act('temple-knight', 'Night Sword', 0, 'drain-hp', { range: 1, power: 40 })
act('temple-knight', 'Hallowed Bolt', 0, 'magic', { range: 3, power: 28, element: 'holy' })
act('dragoner', 'Dragon Breath', 0, 'magic', { range: 3, aoe: 2, power: 30, element: 'fire' })
act('dragoner', 'Dragon Care', 0, 'heal:pct', { range: 3, power: 40 })
act('soldier', 'Dash', 0, 'dash', { range: 1 })

act('chocobo', 'Choco Ball', 0, 'punch', { range: 3, power: 1 })
act('chocobo', 'Choco Cure', 0, 'heal:flat', { range: 3, power: 40 })
act('chocobo', 'Choco Esuna', 0, 'purge', { range: 3 })
act('goblin', 'Goblin Punch', 0, 'punch', { range: 1, power: 1 })
act('goblin', 'Eye Gouge', 0, 'add', { range: 1, status: 'darkness' })
act('goblin', 'Turn Punch', 0, 'punch', { range: 1, power: 1 })
act('red-panther', 'Claw', 0, 'punch', { range: 1, power: 2 })
act('bomb', 'Flame Attack', 0, 'magic', { range: 2, power: 18, element: 'fire' })
act('bomb', 'Self Destruct', 0, 'self-destruct', { range: 1, aoe: 1 })
act('skeleton', 'Knife Hand', 0, 'punch', { range: 1, power: 1 })
act('ghoul', 'Bite', 0, 'drain-hp', { range: 1, power: 25 })
act('ahriman', 'Gaze', 0, 'faith-status', { range: 3, status: 'sleep', power: 140 })
act('pisco-demon', 'Mind Blast', 0, 'faith-status', { range: 3, status: 'confusion', power: 140 })
act('juravis', 'Beak', 0, 'punch', { range: 1, power: 2 })
act('bull-demon', 'Axe Swing', 0, 'punch', { range: 1, power: 2 })
act('morbol', 'Bad Breath', 0, 'add', { range: 2, aoe: 2, status: 'poison' })
act('woodman', 'Branch', 0, 'punch', { range: 1, power: 2 })
act('dragon', 'Breath', 0, 'magic', { range: 3, aoe: 1, power: 28, element: 'fire' })
act('behemoth', 'Horn', 0, 'punch', { range: 1, power: 3 })
act('hyudra', 'Triple Flame', 0, 'magic', { range: 3, aoe: 1, power: 24, element: 'fire' })
act('uribo', 'Oink', 0, 'heal:flat', { range: 1, power: 20 })
act('lucavi', 'Dark Holy', 0, 'magic', { range: 4, aoe: 2, power: 37, element: 'dark', mp: 0 })
act('lucavi', 'Ultima', 0, 'magic', { range: 4, aoe: 2, power: 32 })

/** Geomancy is known the moment the job is usable; mime and specials likewise. */
export function innateAbilityIds(jobId: string): string[] {
  return (ABILITIES_BY_JOB[jobId] ?? []).filter((a) => a.jp === 0).map((a) => a.id)
}

export function jobById(id: string): JobDef {
  const found = JOBS[id]
  if (!found) throw new Error(`Unknown job ${id}`)
  return found
}
