export interface Line {
  speaker: string
  text: string
}

export interface SpawnSpec {
  name: string
  job: string
  sex?: 'male' | 'female' | 'monster'
  level: number
  unique?: string
  required?: boolean
  objective?: boolean
  beast?: boolean
  weapon?: string
  brave?: number
  faith?: number
}

export interface StoryBattleDef {
  id: string
  name: string
  chapter: 1 | 2 | 3 | 4
  chapterTitle: string
  place: string
  objectiveText: string
  objectiveType: 'defeat-all' | 'defeat-one' | 'protect'
  objectiveName?: string
  noRetreat: boolean
  deploy: number
  terrain: string
  before: Line[]
  after: Line[]
  enemies: SpawnSpec[]
  guests: SpawnSpec[]
  gil: number
  /** Permanent recruits added when this battle is won, if their flag allows it. */
  joins: string[]
  /** Story flag set on victory. */
  flag?: string
}

const T = {
  1: 'The Meager',
  2: 'The Manipulator and the Subservient',
  3: 'The Valiant',
  4: 'Somebody to Love',
} as const

function foe(name: string, job: string, level: number, extra: Partial<SpawnSpec> = {}): SpawnSpec {
  return { name, job, level, sex: extra.sex ?? (job === 'dancer' ? 'female' : 'male'), ...extra }
}

function mon(name: string, job: string, level: number, extra: Partial<SpawnSpec> = {}): SpawnSpec {
  return { name, job, level, sex: 'monster', ...extra }
}

function lines(before: [string, string][], after: [string, string][]): { before: Line[]; after: Line[] } {
  return {
    before: before.map(([speaker, text]) => ({ speaker, text })),
    after: after.map(([speaker, text]) => ({ speaker, text })),
  }
}

interface Seed {
  id: string
  name: string
  chapter: 1 | 2 | 3 | 4
  place: string
  objectiveText: string
  objectiveType?: 'defeat-all' | 'defeat-one' | 'protect'
  objectiveName?: string
  noRetreat?: boolean
  deploy?: number
  terrain: string
  before: [string, string][]
  after: [string, string][]
  enemies: SpawnSpec[]
  guests?: SpawnSpec[]
  gil: number
  joins?: string[]
  flag?: string
}

function build(seed: Seed): StoryBattleDef {
  const spoken = lines(seed.before, seed.after)
  return {
    id: seed.id,
    name: seed.name,
    chapter: seed.chapter,
    chapterTitle: T[seed.chapter],
    place: seed.place,
    objectiveText: seed.objectiveText,
    objectiveType: seed.objectiveType ?? 'defeat-all',
    objectiveName: seed.objectiveName,
    noRetreat: seed.noRetreat ?? false,
    deploy: seed.deploy ?? 4,
    terrain: seed.terrain,
    before: spoken.before,
    after: spoken.after,
    enemies: seed.enemies,
    guests: seed.guests ?? [],
    gil: seed.gil,
    joins: seed.joins ?? [],
    flag: seed.flag,
  }
}

const g = (name: string, job: string, level: number, extra: Partial<SpawnSpec> = {}): SpawnSpec =>
  ({ name, job, level, sex: 'male', side: 'guest', ...extra } as SpawnSpec)

export const STORY: StoryBattleDef[] = [
  build({
    id: 'prologue-orbonne', name: 'Orbonne Monastery', chapter: 1, place: 'orbonne',
    objectiveText: 'Drive off the knights in the cloister. Learn how far you can move, who acts next, and that a back or side costs an enemy their guard.',
    deploy: 3, terrain: 'cloister', gil: 0,
    guests: [g('Delita', 'squire', 5, { unique: 'delita' }), g('Algus', 'squire', 4, { unique: 'algus' })],
    enemies: [foe('Cloister Knight', 'knight', 4), foe('Cloister Knight', 'knight', 4), foe('Banner Squire', 'squire', 3)],
    before: [
      ['Narrator', 'A mercenary company holds a monastery while a princess prays inside. The chronicle has not yet admitted who paid them.'],
      ['Delita', 'Ramza, the blue tiles are your feet. The ribbon above is the order of the clock. Strike from the side if you can.'],
    ],
    after: [
      ['Algus', 'Too easy. Common steel, common men.'],
      ['Narrator', 'The cloister was a memory told out of order. A year earlier, the same boy was still a cadet.'],
    ],
  }),
  build({
    id: '2.1a', name: 'Gariland', chapter: 1, place: 'gariland',
    objectiveText: 'Defeat the opposing cadets. When a unit falls, a count begins; revive them before it ends or they are gone.',
    terrain: 'academy', gil: 300,
    guests: [g('Delita', 'squire', 2, { unique: 'delita' })],
    enemies: [foe('Cadet Chemist', 'chemist', 1, { sex: 'female' }), foe('Cadet Squire', 'squire', 1), foe('Cadet Squire', 'squire', 1), foe('Cadet Squire', 'squire', 2)],
    before: [
      ['Instructor', 'Gariland splits you into squads. This is a lesson with live steel and a short count for the fallen.'],
      ['Delita', 'I have your flank. Do not waste the turn staring at the roof.'],
    ],
    after: [
      ['Ramza', 'They got back up. Out there, the count will not be so kind.'],
      ['Delita', 'Then we learn the count before the war does.'],
    ],
  }),
  build({
    id: '2.1b', name: 'Mandalia Plains', chapter: 1, place: 'mandalia',
    objectiveText: 'Defeat the Death Corps on the plains.',
    terrain: 'plains', gil: 400, flag: 'mandalia',
    guests: [g('Delita', 'squire', 2, { unique: 'delita' }), g('Algus', 'knight', 2, { unique: 'algus' })],
    enemies: [foe('Corps Squire', 'squire', 3), foe('Corps Squire', 'squire', 3), foe('Corps Chemist', 'chemist', 3, { sex: 'female' }), foe('Corps Thief', 'thief', 2)],
    before: [
      ['Algus', 'Brigands calling themselves a corps. Break them and the Order notices.'],
      ['Ramza', 'They were soldiers before they were hungry. Remember which fact you are fighting.'],
    ],
    after: [
      ['Delita', 'A banner is a cheap reason to die on grass.'],
      ['Narrator', 'Ramza\'s answer on this field settles a little of his nerve, for good or ill.'],
    ],
  }),
  build({
    id: '2.1c', name: 'Sweegy Woods', chapter: 1, place: 'sweegy',
    objectiveText: 'Defeat the brigands and the beasts they stirred up.',
    terrain: 'woods', gil: 450,
    guests: [g('Delita', 'squire', 3, { unique: 'delita' }), g('Algus', 'knight', 3, { unique: 'algus' })],
    enemies: [foe('Corps Archer', 'archer', 4), foe('Corps Squire', 'squire', 3), mon('Red Panther', 'red-panther', 4), mon('Red Panther', 'red-panther', 3)],
    before: [
      ['Delita', 'The wood is already hunting. Do not chase the first pair of eyes.'],
      ['Algus', 'Beasts and deserters. Neither deserves a speech.'],
    ],
    after: [
      ['Ramza', 'The Corps is falling back toward the trade road.'],
      ['Delita', 'Then Dorter will be loud tonight.'],
    ],
  }),
  build({
    id: '2.1d', name: 'Dorter Trade City', chapter: 1, place: 'dorter',
    objectiveText: 'Defeat the Death Corps holding the trade streets.',
    terrain: 'city', gil: 500,
    guests: [g('Delita', 'knight', 4, { unique: 'delita' }), g('Algus', 'knight', 4, { unique: 'algus' })],
    enemies: [foe('Corps Knight', 'knight', 5), foe('Corps Archer', 'archer', 5), foe('Corps Knight', 'knight', 4), foe('Corps Chemist', 'chemist', 4, { sex: 'female' })],
    before: [
      ['Algus', 'They are in the alleys because the gate was polite. We will not be.'],
      ['Delita', 'Watch the roofs. Archers like a crowd beneath them.'],
    ],
    after: [
      ['Ramza', 'The city is open. The cellar under the market is not.'],
      ['Narrator', 'A name travels with the survivors: Wiegraf, and a sister who still holds a fort.'],
    ],
  }),
  build({
    id: '2.1e', name: 'Sand Rat Cellar', chapter: 1, place: 'dorter',
    objectiveText: 'Defeat the Sand Rats in the cellar.',
    terrain: 'cellar', gil: 500,
    guests: [g('Delita', 'knight', 4, { unique: 'delita' }), g('Algus', 'knight', 4, { unique: 'algus' })],
    enemies: [foe('Sand Rat', 'thief', 6), foe('Sand Rat', 'thief', 5), foe('Sand Rat', 'archer', 5), foe('Cellar Chemist', 'chemist', 5)],
    before: [
      ['Delita', 'Low ceiling, short swings. Do not let them circle.'],
      ['Ramza', 'If Teta is not here, she is further in. Keep moving.'],
    ],
    after: [
      ['Algus', 'Thieves with a hostage are still thieves.'],
      ['Delita', 'Say that again when it is your sister.'],
    ],
  }),
  build({
    id: '2.1f', name: 'Thieves Fort', chapter: 1, place: 'ziekden',
    objectiveText: 'Defeat Miluda. Her fall decides the fort.',
    objectiveType: 'defeat-one', objectiveName: 'Miluda',
    terrain: 'fort', gil: 700,
    guests: [g('Delita', 'knight', 5, { unique: 'delita' }), g('Algus', 'knight', 5, { unique: 'algus' })],
    enemies: [
      foe('Miluda', 'knight', 8, { sex: 'female', unique: 'miluda', objective: true, brave: 75 }),
      foe('Fort Knight', 'knight', 6), foe('Fort Archer', 'archer', 6), foe('Fort Thief', 'thief', 5),
    ],
    before: [
      ['Miluda', 'You wear a lord\'s name into a thief\'s house. My brother will hear how you leave it.'],
      ['Ramza', 'Hand Teta over and this ends on the wall, not under it.'],
    ],
    after: [
      ['Delita', 'She would not yield. Wiegraf will not forgive the difference.'],
      ['Narrator', 'Miluda dies a knight of a broken corps. The fort is taken. The grudge is not.'],
    ],
  }),
  build({
    id: '2.1g', name: 'Lenalia Plateau', chapter: 1, place: 'lenalia',
    objectiveText: 'Defeat the Death Corps on the plateau.',
    terrain: 'plateau', gil: 600,
    guests: [g('Delita', 'knight', 6, { unique: 'delita' }), g('Algus', 'knight', 6, { unique: 'algus' })],
    enemies: [foe('Corps Knight', 'knight', 7), foe('Corps Archer', 'archer', 7), foe('Corps Monk', 'monk', 6), foe('Corps Squire', 'squire', 6)],
    before: [
      ['Algus', 'High ground and a clean wind. Try not to embarrass the house.'],
      ['Delita', 'Wiegraf is not on this ridge. That should worry you.'],
    ],
    after: [
      ['Ramza', 'They broke toward the plains. The windmill road is next.'],
      ['Delita', 'Teta is still ahead of us. That is the only map I trust.'],
    ],
  }),
  build({
    id: '2.1h', name: 'Fovoham Plains', chapter: 1, place: 'fovoham',
    objectiveText: 'Defeat the soldiers holding the windmill road.',
    terrain: 'plains', gil: 650,
    guests: [g('Delita', 'knight', 6, { unique: 'delita' }), g('Algus', 'knight', 6, { unique: 'algus' })],
    enemies: [foe('Order Knight', 'knight', 7), foe('Order Archer', 'archer', 7), mon('Chocobo', 'chocobo', 6), foe('Order Squire', 'squire', 6)],
    before: [
      ['Ramza', 'The mill is a landmark, not a shelter. Spread out before the arrows find a line.'],
      ['Algus', 'A chocobo in a war party. How pastoral.'],
    ],
    after: [
      ['Delita', 'Zeakden is the fort they still hold. If Teta is alive, she is there.'],
      ['Narrator', 'Algus rides ahead already composing the report his house will prefer.'],
    ],
  }),
  build({
    id: '2.1i', name: 'Fort Zeakden', chapter: 1, place: 'zeakden',
    objectiveText: 'Defeat Algus and the fort garrison.',
    objectiveType: 'defeat-one', objectiveName: 'Algus',
    noRetreat: true, terrain: 'fort', gil: 800,
    guests: [g('Delita', 'knight', 7, { unique: 'delita' })],
    enemies: [
      foe('Algus', 'knight', 9, { unique: 'algus', objective: true, brave: 72 }),
      foe('Fort Knight', 'knight', 7), foe('Fort Archer', 'archer', 7), foe('Fort Knight', 'knight', 6),
    ],
    before: [
      ['Algus', 'Your sister was a common lever, Delita. I used her. The fort is still the Order\'s.'],
      ['Delita', 'Then the Order can bury you with the excuse.'],
    ],
    after: [
      ['Narrator', 'Teta is dead on the stones. Algus falls with the garrison. Delita walks into the smoke and does not come back.'],
      ['Ramza', 'I will not wear that name the way my brothers do. Not after this.'],
    ],
  }),
  build({
    id: '2.2a', name: 'Dorter Trade City II', chapter: 2, place: 'dorter',
    objectiveText: 'Defeat the sellswords blocking the trade city.',
    terrain: 'city', gil: 900,
    guests: [g('Gafgarion', 'dark-knight', 12, { unique: 'gafgarion', brave: 68 })],
    enemies: [foe('Sellsword Knight', 'knight', 10), foe('Sellsword Archer', 'archer', 10), foe('Sellsword Thief', 'thief', 9), foe('Sellsword Mage', 'wizard', 9)],
    before: [
      ['Gafgarion', 'You hired a blade, not a conscience. Point me at the purse.'],
      ['Ramza', 'We are escorting a woman out of a lie. Try to look like a guard.'],
    ],
    after: [
      ['Gafgarion', 'Coin spends the same if the client lies. Remember that before you love a contract.'],
      ['Narrator', 'The road north belongs to whoever reaches the woods first.'],
    ],
  }),
  build({
    id: '2.2b', name: 'Araguay Woods', chapter: 2, place: 'araguay',
    objectiveText: 'Save the wounded chocobo and defeat the poachers.',
    objectiveType: 'protect', objectiveName: 'Boco',
    terrain: 'woods', gil: 800, joins: ['boco'], flag: 'araguay',
    guests: [g('Boco', 'chocobo', 8, { unique: 'boco', sex: 'monster', required: true })],
    enemies: [foe('Poacher', 'thief', 11), foe('Poacher', 'archer', 11), mon('Goblin', 'goblin', 10), mon('Goblin', 'goblin', 9)],
    before: [
      ['Gafgarion', 'A bird. We could leave it and keep the schedule.'],
      ['Ramza', 'He is bleeding because someone wanted a mount, not a meal. We hold this clearing.'],
    ],
    after: [
      ['Ramza', 'If he still wants a rider after this, he can choose one.'],
      ['Narrator', 'Boco stays. The woods remember a smaller mercy than the war will.'],
    ],
  }),
  build({
    id: '2.2c', name: 'Zirekile Falls', chapter: 2, place: 'zirekile',
    objectiveText: 'Protect Ovelia and defeat the ambush.',
    objectiveType: 'protect', objectiveName: 'Ovelia',
    noRetreat: true, terrain: 'falls', gil: 1000,
    guests: [
      g('Agrias', 'holy-knight', 14, { unique: 'agrias', sex: 'female', brave: 75 }),
      g('Ovelia', 'chemist', 8, { unique: 'ovelia', sex: 'female', required: true, faith: 72 }),
    ],
    enemies: [
      foe('Gafgarion', 'dark-knight', 16, { unique: 'gafgarion', brave: 70 }),
      foe('Ambush Knight', 'knight', 12), foe('Ambush Archer', 'archer', 12), foe('Ambush Knight', 'knight', 11),
    ],
    before: [
      ['Gafgarion', 'The better contract arrived, boy. The princess does not leave this water.'],
      ['Agrias', 'Then you die wet. Ovelia, stay behind the steel.'],
    ],
    after: [
      ['Ovelia', 'I was a banner before I was a person. I heard the price.'],
      ['Agrias', 'Gafgarion slipped the falls. We will see his sword again, and I will not miss twice.'],
    ],
  }),
  build({
    id: '2.2d', name: 'Zaland Fort City', chapter: 2, place: 'zaland',
    objectiveText: 'Save Mustadio and defeat the hunters.',
    objectiveType: 'protect', objectiveName: 'Mustadio',
    terrain: 'city', gil: 1100, joins: ['mustadio'], flag: 'zaland',
    guests: [g('Mustadio', 'engineer', 15, { unique: 'mustadio', required: true })],
    enemies: [foe('Hunter Knight', 'knight', 13), foe('Hunter Gunner', 'engineer', 14, { unique: 'balk-man' }), foe('Hunter Archer', 'archer', 13), foe('Hunter Thief', 'thief', 12)],
    before: [
      ['Mustadio', 'They want the stone in my gun more than they want me. I would rather keep both.'],
      ['Ramza', 'Then stand where we can see you, and shoot anything that is not us.'],
    ],
    after: [
      ['Mustadio', 'Goug still has my father, and a machine he should not have finished.'],
      ['Agrias', 'We are collecting the war\'s loose heirs. Try not to become one.'],
    ],
  }),
  build({
    id: '2.2e', name: 'Bariaus Hill', chapter: 2, place: 'bariaus',
    objectiveText: 'Defeat the church party on the hill.',
    terrain: 'hill', gil: 1000,
    guests: [g('Agrias', 'holy-knight', 15, { unique: 'agrias', sex: 'female' })],
    enemies: [foe('Church Knight', 'knight', 14), foe('Church Priest', 'priest', 14, { sex: 'female', faith: 80 }), foe('Church Archer', 'archer', 13), mon('Bomb', 'bomb', 13)],
    before: [
      ['Agrias', 'The hill is a sermon with archers. Do not let the priest finish a thought.'],
      ['Ramza', 'Ovelia is the thought they want finished. Keep the road behind us clear.'],
    ],
    after: [
      ['Mustadio', 'Swamp next. My powder will hate it.'],
      ['Narrator', 'The church already knows the name Beoulve is traveling without its banner.'],
    ],
  }),
  build({
    id: '2.2f', name: 'Zigolis Swamp', chapter: 2, place: 'zigolis',
    objectiveText: 'Defeat the things that live in the swamp.',
    terrain: 'swamp', gil: 1100,
    enemies: [mon('Morbol', 'morbol', 15), mon('Ghoul', 'ghoul', 14), mon('Ghoul', 'ghoul', 13), foe('Lost Knight', 'knight', 14)],
    before: [
      ['Agrias', 'If it rises out of the water, it is not negotiating.'],
      ['Ramza', 'Feet on the dry tussocks. The rest is a grave.'],
    ],
    after: [
      ['Mustadio', 'Goug is past the smell. My father will pretend the smell is progress.'],
      ['Ovelia', 'Every road we take is already on someone else\'s map.'],
    ],
  }),
  build({
    id: '2.2g', name: 'Goug Machine City', chapter: 2, place: 'goug',
    objectiveText: 'Defeat the thieves in the machine city and reach Besrodio.',
    terrain: 'machine', gil: 1200,
    enemies: [foe('Gear Thief', 'thief', 15), foe('Gear Knight', 'knight', 15), foe('Gear Chemist', 'chemist', 14), mon('Bomb', 'bomb', 15)],
    before: [
      ['Mustadio', 'They followed the stone here. Father locks doors with riddles and calls it safety.'],
      ['Ramza', 'Then we open the street first.'],
    ],
    after: [
      ['Besrodio', 'The stone is older than my machines. I wish I had been a worse scholar.'],
      ['Mustadio', 'We are leaving, father. Bring the notes that do not explode.'],
    ],
  }),
  build({
    id: '2.2h', name: 'Bariaus Valley', chapter: 2, place: 'bariaus',
    objectiveText: 'Defeat the knights sent to take Ovelia.',
    terrain: 'valley', gil: 1300, joins: ['agrias'],
    guests: [
      g('Agrias', 'holy-knight', 16, { unique: 'agrias', sex: 'female' }),
      g('Ovelia', 'chemist', 10, { unique: 'ovelia', sex: 'female', required: true }),
    ],
    enemies: [foe('Valley Knight', 'knight', 16), foe('Valley Knight', 'knight', 15), foe('Valley Archer', 'archer', 15), foe('Valley Priest', 'priest', 15, { faith: 78 })],
    before: [
      ['Agrias', 'This valley is the last honest ground before Lionel. I am done lending my sword by the day.'],
      ['Ovelia', 'Then swear it to me, not to the men who auctioned my name.'],
    ],
    after: [
      ['Agrias', 'I stay. If the church wants a holy knight, it can meet one who answers to her.'],
      ['Ramza', 'Lionel is a cardinal\'s mouth. We will hear what it has been eating.'],
    ],
  }),
  build({
    id: '2.2i', name: 'Golgorand Execution Site', chapter: 2, place: 'golgorand',
    objectiveText: 'Defeat Gafgarion.',
    objectiveType: 'defeat-one', objectiveName: 'Gafgarion',
    noRetreat: true, terrain: 'execution', gil: 1500,
    enemies: [
      foe('Gafgarion', 'dark-knight', 22, { unique: 'gafgarion', objective: true, brave: 74, weapon: 'blood-sword' }),
      foe('Headsman', 'knight', 16), foe('Headsman', 'knight', 16), foe('Archer', 'archer', 15),
    ],
    before: [
      ['Gafgarion', 'An execution yard suits you, Beoulve. Kneel and the crowd gets a short play.'],
      ['Ramza', 'You sold the same girl twice. The yard can have you.'],
    ],
    after: [
      ['Delita', 'You still swing like a cadet who wants the world to be fair.'],
      ['Narrator', 'Gafgarion is dead. Delita is not, and he is no longer anyone\'s squire. He leaves Ramza the warning and takes the road to a crown.'],
    ],
  }),
  build({
    id: '2.2j', name: 'Lionel Castle', chapter: 2, place: 'lionel',
    objectiveText: 'Defeat the cardinal\'s guard.',
    noRetreat: true, terrain: 'castle', gil: 1600,
    enemies: [foe('Temple Knight', 'knight', 18), foe('Temple Priest', 'priest', 18, { faith: 84 }), foe('Temple Knight', 'knight', 17), foe('Temple Wizard', 'wizard', 17, { faith: 80 })],
    before: [
      ['Agrias', 'Cardinal Draclau smiles like a locked reliquary. Cut the smile\'s escort.'],
      ['Ovelia', 'If he calls me daughter, do not believe the theology.'],
    ],
    after: [
      ['Draclau', 'The stone was never a jewel. It was a door, and you have been so helpful.'],
      ['Narrator', 'The cardinal\'s body is a poor fit for what stands up in his place.'],
    ],
  }),
  build({
    id: '2.2k', name: 'Queklain', chapter: 2, place: 'lionel',
    objectiveText: 'Defeat Queklain, the Lucavi in the cardinal\'s skin.',
    objectiveType: 'defeat-one', objectiveName: 'Queklain',
    noRetreat: true, terrain: 'chapel', gil: 2000,
    enemies: [foe('Queklain', 'lucavi', 24, { unique: 'queklain', objective: true, beast: true, faith: 90, sex: 'monster' }), foe('Acolyte', 'wizard', 16, { faith: 82 }), foe('Acolyte', 'priest', 16, { faith: 82 })],
    before: [
      ['Queklain', 'A lion\'s astrology, written in a man. Kneel, or be punctuation.'],
      ['Ramza', 'I have buried enough punctuation. Come down.'],
    ],
    after: [
      ['Agrias', 'That was not a man at the end. Remember the shape.'],
      ['Narrator', 'The church will call it heresy. The stone calls it a successful opening. Chapter two closes on a demon\'s name: Queklain.'],
    ],
  }),
  build({
    id: '2.3a', name: 'Goland Coal City', chapter: 3, place: 'goland',
    objectiveText: 'Defeat the company holding the coal city.',
    terrain: 'city', gil: 1800,
    enemies: [foe('Coal Knight', 'knight', 20), foe('Coal Thief', 'thief', 19), foe('Coal Archer', 'archer', 19), foe('Coal Monk', 'monk', 20)],
    before: [
      ['Ramza', 'Alma wrote from home. If the church is collecting sisters, we are already late.'],
      ['Mustadio', 'Coal dust hides a gunshot. Use the streets, not the square.'],
    ],
    after: [
      ['Agrias', 'Lesalia next. The capital will pretend it is shocked.'],
      ['Narrator', 'Ramza is a heretic by proclamation before he reaches the gate.'],
    ],
  }),
  build({
    id: '2.3b', name: 'Lesalia Imperial Capital', chapter: 3, place: 'lesalia',
    objectiveText: 'Defeat Confessor Zalmo.',
    objectiveType: 'defeat-one', objectiveName: 'Zalmo',
    terrain: 'capital', gil: 2000, flag: 'zalmo',
    enemies: [
      foe('Zalmo', 'priest', 26, { unique: 'zalmo', objective: true, faith: 88 }),
      foe('Inquisitor', 'knight', 21), foe('Inquisitor', 'wizard', 21, { faith: 80 }), foe('Inquisitor', 'archer', 20),
    ],
    before: [
      ['Zalmo', 'The scripture names you unclean, Beoulve. I am only the voice that arrives on time.'],
      ['Ramza', 'Then the scripture can watch you miss.'],
    ],
    after: [
      ['Alma', 'They took the stones toward Orbonne. I am not staying in a capital that claps for this.'],
      ['Ramza', 'Stay near me. I have already lost one girl to a fort.'],
    ],
  }),
  build({
    id: '2.3c', name: 'Orbonne Monastery I', chapter: 3, place: 'orbonne',
    objectiveText: 'Break the knights in the outer cloister.',
    noRetreat: true, terrain: 'cloister', gil: 1900,
    guests: [g('Alma', 'priest', 18, { unique: 'alma', sex: 'female', faith: 74 })],
    enemies: [foe('Temple Knight', 'knight', 22), foe('Temple Knight', 'knight', 21), foe('Temple Archer', 'archer', 21), foe('Temple Priest', 'priest', 20, { faith: 80 })],
    before: [
      ['Alma', 'Simon hid the scripture under the floor, not in a sermon. They are tearing the floor up.'],
      ['Ramza', 'Then we tear a path. No one gets behind you.'],
    ],
    after: [
      ['Agrias', 'Deeper. The singing is not monks.'],
      ['Narrator', 'Orbonne keeps its second door for people who survived the first.'],
    ],
  }),
  build({
    id: '2.3d', name: 'Orbonne Monastery II', chapter: 3, place: 'orbonne',
    objectiveText: 'Defeat Izlude\'s escort in the library vault.',
    noRetreat: true, terrain: 'library', gil: 2000,
    guests: [g('Alma', 'priest', 18, { unique: 'alma', sex: 'female' })],
    enemies: [foe('Izlude', 'priest', 24, { unique: 'izlude', faith: 86 }), foe('Vault Knight', 'knight', 22), foe('Vault Wizard', 'wizard', 22), foe('Vault Knight', 'knight', 21)],
    before: [
      ['Izlude', 'Alma walks out with the scripture, or she walks out as a lesson. Your choice is decorative.'],
      ['Alma', 'Ramza, he knew our house at table. Do not let that slow the sword.'],
    ],
    after: [
      ['Izlude', 'Father will finish the reading. I only had to open the book.'],
      ['Ramza', 'He ran. The vault still has one more stair.'],
    ],
  }),
  build({
    id: '2.3e', name: 'Orbonne Monastery III', chapter: 3, place: 'orbonne',
    objectiveText: 'Defeat the guardian of the scripture vault.',
    noRetreat: true, terrain: 'vault', gil: 2200,
    guests: [g('Alma', 'priest', 19, { unique: 'alma', sex: 'female', required: true })],
    enemies: [foe('Vault Guardian', 'lucavi', 28, { beast: true, sex: 'monster' }), foe('Templar', 'knight', 23), foe('Templar', 'time-mage', 22)],
    before: [
      ['Alma', 'The book is warm. That is not how paper works.'],
      ['Ramza', 'Stay on the stair. If it looks like a man, it is already late.'],
    ],
    after: [
      ['Narrator', 'Alma is taken in the confusion, scripture and all. Wiegraf\'s grief has found a darker employer.'],
      ['Ramza', 'Riovanes. If the church has a throat, it is that castle.'],
    ],
  }),
  build({
    id: '2.3f', name: 'Grog Hill', chapter: 3, place: 'grog',
    objectiveText: 'Defeat the monsters on Grog Hill.',
    terrain: 'hill', gil: 1800,
    enemies: [mon('Behemoth', 'behemoth', 24), mon('Dragon', 'dragon', 23), mon('Red Panther', 'red-panther', 22), mon('Juravis', 'juravis', 22)],
    before: [
      ['Agrias', 'The hill grows teeth. We are the interruption.'],
      ['Mustadio', 'Aim for the eyes. Everything else is armor that breathes.'],
    ],
    after: [
      ['Ramza', 'Yardow is buying soldiers by the company. We will spend them back.'],
      ['Narrator', 'The road to Riovanes is a list of forts that picked a side too early.'],
    ],
  }),
  build({
    id: '2.3g', name: 'Yardow Fort City', chapter: 3, place: 'yardow',
    objectiveText: 'Defeat the garrison at Yardow.',
    terrain: 'fort', gil: 2000,
    enemies: [foe('Yardow Knight', 'knight', 24), foe('Yardow Archer', 'archer', 23), foe('Yardow Knight', 'lancer', 24), foe('Yardow Mage', 'time-mage', 22)],
    before: [
      ['Agrias', 'A fort that sells passage is still a fort. Treat the gate as a lie.'],
      ['Ramza', 'We do not need the city. We need the road through it.'],
    ],
    after: [
      ['Mustadio', 'Yugou Woods will be assassins, not garrisons. Different silence.'],
      ['Ramza', 'Then we stop talking on the trail.'],
    ],
  }),
  build({
    id: '2.3h', name: 'Yugou Woods', chapter: 3, place: 'yugou',
    objectiveText: 'Defeat the assassins in Yugou Woods.',
    terrain: 'woods', gil: 2100,
    enemies: [foe('Assassin', 'ninja', 25), foe('Assassin', 'ninja', 24), foe('Assassin', 'archer', 23), mon('Ahriman', 'ahriman', 23)],
    before: [
      ['Agrias', 'If you see the knife, it is the second one.'],
      ['Ramza', 'Riovanes is through the trees. So is Wiegraf.'],
    ],
    after: [
      ['Narrator', 'Wiegraf waits in a castle he no longer serves, holding a stone and a dead sister\'s name.'],
      ['Ramza', 'I will meet him alone if the door demands it. The rest of you take the hall after.'],
    ],
  }),
  build({
    id: '2.3i', name: 'Riovanes Castle I', chapter: 3, place: 'riovanes',
    objectiveText: 'Ramza must defeat Wiegraf alone. No one else enters this room.',
    objectiveType: 'defeat-one', objectiveName: 'Wiegraf',
    noRetreat: true, deploy: 1, terrain: 'chapel', gil: 0,
    enemies: [foe('Wiegraf', 'temple-knight', 28, { unique: 'wiegraf', objective: true, brave: 80, faith: 70, weapon: 'blood-sword' })],
    before: [
      ['Wiegraf', 'Miluda died in your lesson, cadet. This room is the examination.'],
      ['Ramza', 'I cannot give her back. I can refuse the thing you are about to become.'],
    ],
    after: [
      ['Wiegraf', 'Then the stone can have the rest of me. Velius, if you are listening—'],
      ['Narrator', 'The man ends. The Lucavi answers in his shape. This duel is meant to be lost if you are unprepared.'],
    ],
  }),
  build({
    id: '2.3j', name: 'Riovanes Castle II', chapter: 3, place: 'riovanes',
    objectiveText: 'Defeat Velius.',
    objectiveType: 'defeat-one', objectiveName: 'Velius',
    noRetreat: true, terrain: 'chapel', gil: 2500,
    enemies: [
      foe('Velius', 'lucavi', 32, { unique: 'velius', objective: true, beast: true, sex: 'monster', faith: 92 }),
      foe('Demon', 'lucavi', 24, { beast: true, sex: 'monster' }),
      foe('Demon', 'lucavi', 24, { beast: true, sex: 'monster' }),
    ],
    before: [
      ['Velius', 'A brave corpse makes a better door than a living heretic.'],
      ['Agrias', 'We have the door. Ramza, on your feet. The rest of us are late and angry.'],
    ],
    after: [
      ['Ramza', 'Wiegraf is gone. What used him is not done hiring.'],
      ['Narrator', 'Alma is still in the castle. So are two children the church taught to burn.'],
    ],
  }),
  build({
    id: '2.3k', name: 'Riovanes Castle III', chapter: 3, place: 'riovanes',
    objectiveText: 'Defeat Marquis Elmdor\'s assassins and keep Rafa and Malak alive.',
    objectiveType: 'protect', objectiveName: 'Rafa',
    noRetreat: true, terrain: 'roof', gil: 2600, joins: ['rafa', 'malak'],
    guests: [
      g('Rafa', 'heaven-knight', 22, { unique: 'rafa', sex: 'female', required: true, faith: 76 }),
      g('Malak', 'hell-knight', 22, { unique: 'malak', required: true, faith: 60 }),
    ],
    enemies: [foe('Elmdor', 'ninja', 30, { unique: 'elmdor', brave: 78 }), foe('Assassin', 'ninja', 26), foe('Assassin', 'samurai', 26), foe('Assassin', 'ninja', 25)],
    before: [
      ['Elmdor', 'Children make excellent triggers. Watch them try to save each other.'],
      ['Rafa', 'We are not triggers. Malak, with me—not in front of me.'],
    ],
    after: [
      ['Malak', 'He left the roof like a rumor. I hate rumors that bleed.'],
      ['Narrator', 'Alma is carried toward the church\'s inner sky. Rafa and Malak leave with Ramza. Chapter three ends on a castle that ate its owner.'],
    ],
  }),
  build({
    id: '2.4a', name: 'Doguola Pass', chapter: 4, place: 'doguola',
    objectiveText: 'Defeat the forces holding Doguola Pass.',
    terrain: 'pass', gil: 2400,
    enemies: [foe('Pass Lancer', 'lancer', 28), foe('Pass Knight', 'knight', 27), mon('Dragon', 'dragon', 27), foe('Pass Archer', 'archer', 26)],
    before: [
      ['Agrias', 'The pass is a funnel. Be the cork or be the wine.'],
      ['Ramza', 'Delita is raising a standard somewhere ahead. I want to see whose dead are on it.'],
    ],
    after: [
      ['Mustadio', 'Bervenia buys foreign steel. We will meet some.'],
      ['Narrator', 'The war of succession has a new candidate who learned politics from a corpse.'],
    ],
  }),
  build({
    id: '2.4b', name: 'Bervenia Free City', chapter: 4, place: 'bervenia',
    objectiveText: 'Defeat Meliadoul\'s company. She is Dycedarg\'s daughter and not yet your enemy forever.',
    objectiveType: 'defeat-one', objectiveName: 'Meliadoul',
    terrain: 'city', gil: 2600,
    enemies: [
      foe('Meliadoul', 'divine-knight', 30, { unique: 'meliadoul', sex: 'female', objective: true, brave: 76 }),
      foe('Church Knight', 'knight', 27), foe('Church Knight', 'knight', 27), foe('Church Priest', 'priest', 26, { faith: 80 }),
    ],
    before: [
      ['Meliadoul', 'My father says you murdered a brother and a faith. I brought a sword to check his arithmetic.'],
      ['Ramza', 'Your father fed a brother to a stone. Ask him about Zalbag before you finish the sum.'],
    ],
    after: [
      ['Meliadoul', 'I will verify you, heretic. Do not die before I decide.'],
      ['Ramza', 'The volcano road has a cache if anyone still hunts relics. Cloud\'s blade is a rumor with a height.'],
    ],
  }),
  build({
    id: '2.4c', name: 'Finath River', chapter: 4, place: 'finath',
    objectiveText: 'Defeat the river ambush.',
    terrain: 'river', gil: 2500,
    enemies: [foe('River Knight', 'knight', 29), foe('River Archer', 'archer', 28), mon('Pisco Demon', 'pisco-demon', 28), foe('River Mage', 'wizard', 28)],
    before: [
      ['Rafa', 'Water lies about depth. So do knights.'],
      ['Malak', 'I can burn a ford. I would rather not burn us.'],
    ],
    after: [
      ['Agrias', 'Zeltennia. Delita has a castle and a princess and a story that flatters him.'],
      ['Ramza', 'I want the part of the story he will not say in public.'],
    ],
  }),
  build({
    id: '2.4d', name: 'Zeltennia Castle', chapter: 4, place: 'zeltennia',
    objectiveText: 'Defeat the knights between you and the audience hall.',
    terrain: 'castle', gil: 2800, joins: ['meliadoul'],
    enemies: [foe('Royal Knight', 'knight', 30), foe('Royal Knight', 'samurai', 30), foe('Royal Archer', 'archer', 29), foe('Royal Priest', 'priest', 28, { faith: 74 })],
    before: [
      ['Delita', 'You came to scold a king before he is finished becoming one. How like you.'],
      ['Ovelia', 'He saved my life and spent it. Both sentences are true. Stand where I can see your hands, all of you.'],
    ],
    after: [
      ['Delita', 'Dycedarg wants the throne without the kneeling. I want the kneeling. We are not the same mistake.'],
      ['Narrator', 'Ovelia remains in Zeltennia, crown-shaped and unconvinced. Meliadoul, having heard enough, rides with Ramza.'],
    ],
  }),
  build({
    id: '2.4e', name: 'Bed Desert', chapter: 4, place: 'bed-desert',
    objectiveText: 'Cross the desert and defeat Balk\'s guns.',
    objectiveType: 'defeat-one', objectiveName: 'Balk',
    terrain: 'desert', gil: 2700,
    enemies: [foe('Balk', 'engineer', 32, { unique: 'balk', objective: true }), foe('Gunner', 'engineer', 28), foe('Desert Knight', 'knight', 29), foe('Desert Archer', 'archer', 28)],
    before: [
      ['Balk', 'Mustadio aims like a poet. I aim like a payroll.'],
      ['Mustadio', 'Then the payroll can dodge.'],
    ],
    after: [
      ['Mustadio', 'He will not stop working for the highest roof. Remember the shot pattern, not the man.'],
      ['Ramza', 'Bethla gates the river and the war. We open it.'],
    ],
  }),
  build({
    id: '2.4f', name: 'Bethla Garrison', chapter: 4, place: 'bethla',
    objectiveText: 'Defeat the garrison holding Bethla\'s walls.',
    noRetreat: true, terrain: 'fort', gil: 3000,
    enemies: [foe('Garrison Knight', 'knight', 31), foe('Garrison Lancer', 'lancer', 31), foe('Garrison Archer', 'archer', 30), foe('Garrison Knight', 'knight', 30), foe('Garrison Mage', 'time-mage', 29)],
    before: [
      ['Meliadoul', 'My father\'s war needs this sluice. Breaking it is a family conversation.'],
      ['Orlandu', 'I am late, which is a habit of men the church tried to erase. The gate is still a gate.'],
    ],
    after: [
      ['Orlandu', 'The sluice is the real wall. Men are only the mortar.'],
      ['Ramza', 'Then we cut mortar until the water decides.'],
    ],
  }),
  build({
    id: '2.4g', name: 'Bethla Sluice', chapter: 4, place: 'bethla',
    objectiveText: 'Open the sluice by defeating its keepers.',
    noRetreat: true, terrain: 'sluice', gil: 3200, joins: ['orlandu'],
    enemies: [foe('Sluice Knight', 'knight', 32), foe('Sluice Knight', 'monk', 32), foe('Engineer', 'engineer', 30), mon('Bomb', 'bomb', 30)],
    before: [
      ['Orlandu', 'Thunder God is a nickname for a man who refused a quiet death. The lever is over there.'],
      ['Ramza', 'Hold the platform. I want the river on our side for once.'],
    ],
    after: [
      ['Narrator', 'Bethla opens. Orlandu stays with the heretic, which will annoy several altars.'],
      ['Agrias', 'Germinas next, and a church that still thinks height is holiness.'],
    ],
  }),
  build({
    id: '2.4h', name: 'Germinas Peak', chapter: 4, place: 'germinas',
    objectiveText: 'Defeat the church force on Germinas Peak.',
    terrain: 'peak', gil: 3000,
    enemies: [foe('Peak Knight', 'lancer', 33), foe('Peak Priest', 'summoner', 32, { faith: 84 }), foe('Peak Knight', 'knight', 32), mon('Juravis', 'juravis', 31)],
    before: [
      ['Orlandu', 'Thin air makes brave men honest. It also makes them slow.'],
      ['Rafa', 'I can see Zeltennia from here. I do not like how small the princess looks.'],
    ],
    after: [
      ['Malak', 'A flower girl in Zarghidas is part of this. Do not laugh. The strange jobs always start with a flower.'],
      ['Narrator', 'Past Germinas, the optional roads wake up: a trade city, a cursed island, a machine that wants a pilot.'],
    ],
  }),
  build({
    id: '2.4i', name: 'Poeskas Lake', chapter: 4, place: 'poeskas',
    objectiveText: 'Defeat the force camped on the frozen lake.',
    terrain: 'lake', gil: 3100,
    enemies: [foe('Lake Knight', 'knight', 33), foe('Lake Mage', 'wizard', 32), mon('Hyudra', 'hyudra', 33), foe('Lake Archer', 'archer', 31)],
    before: [
      ['Meliadoul', 'Ice is a floor until it is a door. Spread your weight and your grudges.'],
      ['Orlandu', 'The hydra is not the theology. Kill it anyway.'],
    ],
    after: [
      ['Ramza', 'Limberry stinks of the marquis. Elmdor has had long enough to finish dying.'],
      ['Agrias', 'Assassins first. The thing inside him second.'],
    ],
  }),
  build({
    id: '2.4j', name: 'Limberry Castle I', chapter: 4, place: 'limberry',
    objectiveText: 'Defeat the assassins in the lower castle.',
    noRetreat: true, terrain: 'castle', gil: 3200,
    enemies: [foe('Assassin', 'ninja', 34), foe('Assassin', 'ninja', 33), foe('Assassin', 'samurai', 33), foe('Assassin', 'thief', 32)],
    before: [
      ['Agrias', 'Limberry does not post guards. It posts apologies that cut.'],
      ['Ramza', 'Elmdor is upstairs, or whatever still uses his face.'],
    ],
    after: [
      ['Orlandu', 'The stairs are a throat. Climb before it swallows.'],
      ['Narrator', 'The marquis has been a Lucavi\'s coat for longer than the court admitted.'],
    ],
  }),
  build({
    id: '2.4k', name: 'Limberry Castle II', chapter: 4, place: 'limberry',
    objectiveText: 'Defeat Marquis Elmdor.',
    objectiveType: 'defeat-one', objectiveName: 'Elmdor',
    noRetreat: true, terrain: 'castle', gil: 3400,
    enemies: [foe('Elmdor', 'samurai', 36, { unique: 'elmdor', objective: true, brave: 82 }), foe('Assassin', 'ninja', 33), foe('Assassin', 'ninja', 33)],
    before: [
      ['Elmdor', 'A marquis is a title you wear to dinner. I have been hungry since Riovanes.'],
      ['Ramza', 'Then this is the last sitting.'],
    ],
    after: [
      ['Narrator', 'Elmdor\'s body gives up the pretense. Zalera unfolds in the chapel he kept for best.'],
      ['Meliadoul', 'I am getting very tired of relatives who turn into scripture.'],
    ],
  }),
  build({
    id: '2.4l', name: 'Limberry Castle III', chapter: 4, place: 'limberry',
    objectiveText: 'Defeat Zalera.',
    objectiveType: 'defeat-one', objectiveName: 'Zalera',
    noRetreat: true, terrain: 'chapel', gil: 3600,
    enemies: [foe('Zalera', 'lucavi', 38, { unique: 'zalera', objective: true, beast: true, sex: 'male', faith: 90 }), foe('Shade', 'skeleton', 30, { sex: 'monster' }), foe('Shade', 'ghoul', 30, { sex: 'monster' })],
    before: [
      ['Zalera', 'Death is a parish. You have been tithing since Zeakden.'],
      ['Orlandu', 'Then we skip the collection plate.'],
    ],
    after: [
      ['Agrias', 'One less angel with a knife. Dycedarg remains, and he is family, which is worse.'],
      ['Ramza', 'Igros. I will hear my brother say it in his own hall.'],
    ],
  }),
  build({
    id: '2.4m', name: 'Igros Castle', chapter: 4, place: 'igros',
    objectiveText: 'Defeat Dycedarg. When he falls, Adrammelech finishes the fight.',
    objectiveType: 'defeat-one', objectiveName: 'Adrammelech',
    noRetreat: true, terrain: 'castle', gil: 4000,
    enemies: [foe('Adrammelech', 'lucavi', 40, { unique: 'dycedarg', objective: true, beast: true, sex: 'monster', faith: 88 }), foe('House Knight', 'knight', 34), foe('House Knight', 'knight', 33)],
    before: [
      ['Dycedarg', 'Zalbag believed in a clean house. I believe in a standing one. You were always the sentimental expense.'],
      ['Ramza', 'You killed him to keep the expense small. The stone can have your title.'],
    ],
    after: [
      ['Narrator', 'Dycedarg becomes Adrammelech and dies as both. Zalbag is dead by his brother\'s hand, and the house of Beoulve is a hallway of ghosts.'],
      ['Orlandu', 'The church\'s inner city is next. Folmarv has been holding the door open with other people\'s sons.'],
    ],
  }),
  build({
    id: '2.4n', name: 'Murond Holy Place I', chapter: 4, place: 'murond',
    objectiveText: 'Enter Murond and defeat the templars.',
    noRetreat: true, terrain: 'holy', gil: 3800, flag: 'murond-open',
    enemies: [foe('Templar', 'knight', 36), foe('Templar', 'priest', 35, { faith: 86 }), foe('Templar', 'wizard', 35), foe('Templar', 'knight', 34)],
    before: [
      ['Orlandu', 'Holy ground that requires this many swords is a warehouse.'],
      ['Ramza', 'Alma is in the warehouse. That is the whole theology I have left.'],
    ],
    after: [
      ['Meliadoul', 'They retreat deeper and call it ascension.'],
      ['Narrator', 'After this gate, Warjilis can open the Deep Dungeon for those who still want a spell named Zodiac.'],
    ],
  }),
  build({
    id: '2.4o', name: 'Murond Holy Place II', chapter: 4, place: 'murond',
    objectiveText: 'Defeat the second ring of Murond.',
    noRetreat: true, terrain: 'holy', gil: 4000,
    enemies: [foe('High Priest', 'summoner', 37, { faith: 90 }), foe('Templar', 'samurai', 36), foe('Templar', 'time-mage', 35), mon('Ahriman', 'ahriman', 34)],
    before: [
      ['Rafa', 'The candles lean toward one man. I do not want to meet him.'],
      ['Orlandu', 'Folmarv. Meet him anyway.'],
    ],
    after: [
      ['Agrias', 'He watched like a patron. The next room will be the performance.'],
      ['Ramza', 'Then we ruin the ending he paid for.'],
    ],
  }),
  build({
    id: '2.4p', name: 'Murond Holy Place III', chapter: 4, place: 'murond',
    objectiveText: 'Defeat Hashmal.',
    objectiveType: 'defeat-one', objectiveName: 'Hashmal',
    noRetreat: true, terrain: 'sanctum', gil: 4200,
    enemies: [foe('Hashmal', 'lucavi', 42, { unique: 'hashmal', objective: true, beast: true, sex: 'male', faith: 90 }), foe('Templar', 'knight', 34), foe('Templar', 'priest', 34, { faith: 84 })],
    before: [
      ['Folmarv', 'Hashmal keeps the threshold. I keep your sister. Try to feel chosen.'],
      ['Ramza', 'I feel armed. That has been enough.'],
    ],
    after: [
      ['Narrator', 'Folmarv slips toward Orbonne with Alma. The holy place is a shell. The real door is back under the monastery.'],
      ['Orlandu', 'We have walked this cloister in the wrong year before. This time we finish it.'],
    ],
  }),
  build({
    id: '2.4q', name: 'Orbonne Monastery I', chapter: 4, place: 'orbonne',
    objectiveText: 'Retake the outer monastery.',
    noRetreat: true, terrain: 'cloister', gil: 4000,
    enemies: [foe('Templar', 'knight', 38), foe('Templar', 'archer', 37), foe('Templar', 'wizard', 37), foe('Templar', 'monk', 36)],
    before: [
      ['Ramza', 'I fought here when it was only a job. The dead are less polite now.'],
      ['Agrias', 'Ovelia prayed in that chapel. Folmarv is using the same stones to end a world.'],
    ],
    after: [
      ['Meliadoul', 'Down. The air is wrong in the way Father liked.'],
      ['Narrator', 'The second descent is shorter and crueler.'],
    ],
  }),
  build({
    id: '2.4r', name: 'Orbonne Monastery II', chapter: 4, place: 'orbonne',
    objectiveText: 'Reach Alma and defeat the guard around the inner vault.',
    noRetreat: true, terrain: 'vault', gil: 4200,
    guests: [g('Alma', 'priest', 30, { unique: 'alma', sex: 'female', required: true, faith: 78 })],
    enemies: [foe('Folmarv', 'holy-knight', 40, { unique: 'folmarv', brave: 80, faith: 86 }), foe('Templar', 'summoner', 36), foe('Templar', 'knight', 36)],
    before: [
      ['Alma', 'Ramza, do not look at me as if I am already gone. I can still hear you.'],
      ['Folmarv', 'She can hear because the vessel must be awake. How merciful of the spell.'],
    ],
    after: [
      ['Narrator', 'Folmarv does not die cleanly. He takes Alma\'s voice with him into a body that is no longer hers: Altima, waiting for a sky.'],
      ['Ramza', 'I am not burying another girl and calling it providence.'],
    ],
  }),
  build({
    id: '2.4s', name: 'Murond Death City', chapter: 4, place: 'murond',
    objectiveText: 'Defeat the dead, including what remains of Zalbag.',
    objectiveType: 'defeat-one', objectiveName: 'Zalbag',
    noRetreat: true, terrain: 'necropolis', gil: 4400,
    enemies: [
      foe('Zalbag', 'knight', 40, { unique: 'zalbag', objective: true, brave: 70 }),
      mon('Skeleton', 'skeleton', 34), mon('Ghoul', 'ghoul', 34), foe('Wraith Priest', 'oracle', 35),
    ],
    before: [
      ['Zalbag', 'Brother. He made me a tool after he made me a grave. Stop the tool.'],
      ['Ramza', 'I will. I am sorry the order is that way around.'],
    ],
    after: [
      ['Ramza', 'Rest, if the stone allows it.'],
      ['Orlandu', 'The precincts under the dead city are the last human lock. Then the airship.'],
    ],
  }),
  build({
    id: '2.4t', name: 'Lost Sacred Precincts', chapter: 4, place: 'murond',
    objectiveText: 'Defeat Rofel, Kletian, and Balk in the precincts.',
    noRetreat: true, terrain: 'precinct', gil: 4500,
    enemies: [
      foe('Rofel', 'summoner', 38, { unique: 'rofel', faith: 86 }),
      foe('Kletian', 'wizard', 38, { unique: 'kletian', faith: 84 }),
      foe('Balk', 'engineer', 36, { unique: 'balk' }),
    ],
    before: [
      ['Rofel', 'Three locks, one heretic. The arithmetic favors heaven.'],
      ['Orlandu', 'Heaven has been outsourcing. We brought our own arithmetic.'],
    ],
    after: [
      ['Mustadio', 'Balk finally ran out of roof. The graveyard of airships is open above us.'],
      ['Narrator', 'Folmarv\'s last stage is a wreck that still remembers how to fly.'],
    ],
  }),
  build({
    id: '2.4u', name: 'Airship Graveyard', chapter: 4, place: 'graveyard',
    objectiveText: 'Defeat Hashmal\'s second watch on the wrecks.',
    objectiveType: 'defeat-one', objectiveName: 'Hashmal',
    noRetreat: true, terrain: 'airship', gil: 4800,
    enemies: [foe('Hashmal', 'lucavi', 44, { unique: 'hashmal', objective: true, beast: true, sex: 'male' }), foe('Templar', 'knight', 36), foe('Templar', 'ninja', 36)],
    before: [
      ['Hashmal', 'You broke my threshold. This hull is the replacement.'],
      ['Ramza', 'Then it can sink with the sermon.'],
    ],
    after: [
      ['Agrias', 'One more deck. I can hear Alma and something using her mouth.'],
      ['Ramza', 'When we go up, no one waits for a cleaner ending.'],
    ],
  }),
  build({
    id: '2.4v', name: 'Airship Graveyard II', chapter: 4, place: 'graveyard',
    objectiveText: 'Defeat Altima.',
    objectiveType: 'defeat-one', objectiveName: 'Altima',
    noRetreat: true, terrain: 'airship', gil: 0,
    guests: [g('Alma', 'priest', 32, { unique: 'alma', sex: 'female', required: true, faith: 80 })],
    enemies: [foe('Altima', 'lucavi', 50, { unique: 'altima', objective: true, beast: true, sex: 'monster', faith: 94 })],
    before: [
      ['Altima', 'The brave were always fuel. Your sister burns brighter than the rest.'],
      ['Alma', 'Ramza—if I go quiet, it is not consent. Pull me out or put the thing down.'],
    ],
    after: [
      ['Narrator', 'Altima falls through a ship that was already a grave. Alma comes back in her own voice. The official history will prefer Delita\'s crown to either fact.'],
      ['Ramza', 'Let them write the king. We are leaving by the road that does not get a statue.'],
    ],
  }),
]

export const STORY_IDS = STORY.map((battle) => battle.id)

export function storyById(id: string): StoryBattleDef | undefined {
  return STORY.find((battle) => battle.id === id)
}

export function nextStoryId(id: string): string | 'ending' | null {
  const index = STORY.findIndex((battle) => battle.id === id)
  if (index < 0) return null
  if (index === STORY.length - 1) return 'ending'
  return STORY[index + 1].id
}

export const REQUIRED_STORY_IDS = STORY_IDS.filter((id) => id !== 'prologue-orbonne')
