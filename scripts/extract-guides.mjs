/**
 * Pull structured rows out of the local guides. The game treats the JSON as
 * data, not as quoted FAQ prose.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'src/data/generated')
fs.mkdirSync(outDir, { recursive: true })

const itemText = fs.readFileSync(path.join(root, 'sup-item-list.txt'), 'utf8')
const mechText = fs.readFileSync(path.join(root, 'sup-battle-mechanics.txt'), 'utf8')
const walkText = fs.readFileSync(path.join(root, 'main-guide-walkthrough.txt'), 'utf8')
const jobsText = fs.readFileSync(path.join(root, 'sup-jobs.txt'), 'utf8')

const CATEGORY_MAP = [
  ['KNIVES', 'knife'],
  ['NINJA SWORDS', 'ninja-sword'],
  ['KNIGHT SWORDS', 'knight-sword'],
  ['SWORDS', 'sword'],
  ['KATANAS', 'katana'],
  ['AXES', 'axe'],
  ['RODS', 'rod'],
  ['STAVES', 'staff'],
  ['HAMMER', 'flail'],
  ['HAMMERS', 'flail'],
  ['GUNS', 'gun'],
  ['CROSS BOWS', 'crossbow'],
  ['CROSSBOWS', 'crossbow'],
  ['BOWS', 'bow'],
  ['MUSICAL INSTRUMENT', 'instrument'],
  ['MUSICAL INSTRUMENTS', 'instrument'],
  ['DICTIONARY', 'dictionary'],
  ['DICTIONARIES', 'dictionary'],
  ['SPEARS', 'spear'],
  ['STICKS', 'stick'],
  ["WOMEN'S BAG", 'bag'],
  ["WOMEN'S BAGS", 'bag'],
  ['CLOTHS', 'cloth'],
  ['SHIELDS', 'shield'],
  ['HELMS', 'helmet'],
  ['HELMETS', 'helmet'],
  ['HATS', 'hat'],
  ["WOMEN'S RIBBON", 'ribbon'],
  ['RIBBONS', 'ribbon'],
  ['ARMOR', 'armor'],
  ['CLOTHES', 'clothes'],
  ['ROBES', 'robe'],
  ['SHOES', 'shoes'],
  ['GAUNTLETS', 'gauntlet'],
  ['RINGS', 'ring'],
  ['ARMLET', 'armlet'],
  ['ARMLETS', 'armlet'],
  ['MANTLES', 'mantle'],
  ["WOMEN'S PERFUME", 'perfume'],
  ["WOMEN'S PERFUMES", 'perfume'],
  ['NINJA STARS', 'throwing'],
  ['THROWING BALLS', 'throwing'],
  ['RECOVERY ITEMS', 'consumable'],
]

function normHeader(line) {
  return line.replace(/[^A-Za-z']/g, '').toUpperCase()
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const items = []
let category = null
let equippedBy = []
const lines = itemText.split(/\r?\n/)
for (let i = 0; i < lines.length; i++) {
  const raw = lines[i]
  const header = normHeader(raw)
  if (header.length > 3 && header.length < 28 && !raw.includes('"') && !raw.includes(':')) {
    for (const [label, id] of CATEGORY_MAP) {
      if (header === label.replace(/[^A-Z']/g, '')) {
        category = id
        equippedBy = []
      }
    }
  }
  const eq = raw.match(/EQUIPPED BY:\s*(.+)/i)
  if (eq) {
    equippedBy = eq[1].split(',').map((s) => s.trim()).filter(Boolean)
  }
  const nameMatch = raw.match(/^\s*"([^"]+)"\s*[-\u2013\u2014]+\s*(.*)$/) || raw.match(/^\s*"([^"]+)"\s+--\s*(.*)$/)
  if (!nameMatch || !category) continue
  if (category === null) continue
  const name = nameMatch[1].trim()
  if (!name || name.length > 40) continue
  let blob = nameMatch[2] || ''
  const statLines = []
  for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
    const nxt = lines[j]
    if (/^\s*"/.test(nxt) || /^-{5,}/.test(nxt) || /^\s*$/.test(nxt) && statLines.length) break
    if (/ATTACK POWER|HP\+|MP\+|EVADE|CANCEL|ADD:|Speed\+|PHYSICAL|MAGIC|elemental|restore/i.test(nxt) || statLines.length) {
      statLines.push(nxt.trim())
    } else if (nxt.trim() && !nxt.includes('EQUIPPED') && statLines.length === 0 && nxt.trim().length < 120) {
      blob += ' ' + nxt.trim()
    } else break
  }
  const stats = statLines.join(' ')
  const wp = /ATTACK POWER:\s*(\d+)/i.exec(stats)
  const ev = /EVADE\s*%:\s*(\d+)/i.exec(stats)
  const physEv = /Physical\s*(\d+)\s*%/i.exec(stats)
  const magEv = /Magic\s*(\d+)\s*%/i.exec(stats)
  const hp = /HP\+\s*(\d+)/i.exec(stats)
  const mp = /MP\+\s*(\d+)/i.exec(stats) || /MP restore\s*(\d+)/i.exec(stats)
  const sp = /Speed\+\s*(\d+)/i.exec(stats)
  const pa = /AT Physical\+\s*(\d+)/i.exec(stats) || /PA\+\s*(\d+)/i.exec(stats)
  const ma = /AT Magic\+\s*(\d+)/i.exec(stats) || /MA\+\s*(\d+)/i.exec(stats)
  const element = /(Wind|Fire|Ice|Lightning|Water|Earth|Dark|Holy)\s+elemental/i.exec(stats + ' ' + blob)
  const adds = []
  const addRe = /ADD:\s*([A-Za-z][A-Za-z' -]*)/gi
  let m
  const addSrc = stats + ' ' + blob
  while ((m = addRe.exec(addSrc))) adds.push(m[1].trim())
  items.push({
    id: slug(name),
    name,
    category,
    equippedBy,
    wp: wp ? Number(wp[1]) : 0,
    evade: ev ? Number(ev[1]) : physEv ? Number(physEv[1]) : 0,
    magicEvade: magEv ? Number(magEv[1]) : 0,
    hp: hp ? Number(hp[1]) : 0,
    mp: mp ? Number(mp[1]) : 0,
    speed: sp ? Number(sp[1]) : 0,
    pa: pa ? Number(pa[1]) : 0,
    ma: ma ? Number(ma[1]) : 0,
    element: element ? element[1].toLowerCase() : null,
    adds,
    twoHands: /2 hands/i.test(stats),
    twoSwords: /2-swords/i.test(stats),
    price: null,
  })
}

const seen = new Set()
const uniqueItems = []
for (const it of items) {
  if (seen.has(it.id)) continue
  seen.add(it.id)
  uniqueItems.push(it)
}

const rareBlock = itemText.split('RARE  ITEM  LOCATION')[1] || ''
const rareLines = rareBlock.split(/\r?\n/)
const sources = {}
for (const line of rareLines) {
  const mm = line.match(/"([^"]+)"\s*-+\s*\(1\)\s*(.+)/)
  if (!mm) continue
  const id = slug(mm[1])
  const how = mm[2]
  let kind = 'treasure'
  if (/poach/i.test(how)) kind = 'poach'
  else if (/move-find|find \(/i.test(how)) kind = 'move-find'
  else if (/steal/i.test(how)) kind = 'steal'
  else if (/buy|shop|purchase/i.test(how)) kind = 'shop'
  else if (/battle|deep dungeon|catch/i.test(how)) kind = 'battle'
  sources[id] = { kind, note: how.replace(/\s+/g, ' ').slice(0, 140) }
}

// Prices stated on chemist items in the mechanics guide, plus a tier for the rest.
const knownPrices = {
  potion: 50,
  'hi-potion': 200,
  'x-potion': 700,
  'phoenix-down': 300,
  'holy-water': 1000,
  ether: 200,
  'hi-ether': 600,
  elixir: 8000,
  antidote: 50,
  'eye-drop': 50,
  'echo-grass': 50,
  'maiden-s-kiss': 50,
  soft: 100,
  remedy: 400,
}
for (const it of uniqueItems) {
  if (knownPrices[it.id] != null) it.price = knownPrices[it.id]
  else if (it.category === 'consumable' || it.category === 'throwing') it.price = 100 + it.wp * 20 + it.hp
  else it.price = 200 + it.wp * 400 + it.hp * 40 + it.mp * 30
  it.rare = sources[it.id] || null
}

fs.writeFileSync(path.join(outDir, 'items.json'), JSON.stringify(uniqueItems, null, 2))

// Class compendium
const classes = []
const mechLines = mechText.split(/\r?\n/)
for (let i = 0; i < mechLines.length; i++) {
  const hm = mechLines[i].match(/^([0-9A-F]{2})\s+\[(.+?)\]/)
  if (!hm) continue
  let hpm = null
  let hpc = null
  let eq = ''
  let innate = ''
  let move = 3
  let jump = 3
  let cev = 5
  let type = ''
  for (let j = i + 1; j < Math.min(i + 30, mechLines.length); j++) {
    const l = mechLines[j]
    if (/^[0-9A-F]{2}\s+\[/.test(l)) break
    const mul = l.match(/HPM:\s*(\d+)\s*\|\s*MPM:\s*(\d+)\s*\|\s*SpM:\s*(\d+)\s*\|\s*PAM:\s*(\d+)\s*\|\s*MAM:\s*(\d+)\s*\|\s*Move:\s*(\d+)\s*\|\s*C\.Ev:\s*(\d+)/i)
    if (mul) {
      hpm = {
        hp: Number(mul[1]), mp: Number(mul[2]), sp: Number(mul[3]),
        pa: Number(mul[4]), ma: Number(mul[5]),
      }
      move = Number(mul[6])
      cev = Number(mul[7])
    }
    const gro = l.match(/HPC:\s*(\d+)\s*\|\s*MPC:\s*(\d+)\s*\|\s*SpC:\s*(\d+)\s*\|\s*PAC:\s*(\d+)\s*\|\s*MAC:\s*(\d+)\s*\|\s*Jump:\s*(\d+)\s*\|\s*TYPE:\s*(\w+)/i)
    if (gro) {
      hpc = {
        hp: Number(gro[1]), mp: Number(gro[2]), sp: Number(gro[3]),
        pa: Number(gro[4]), ma: Number(gro[5]),
      }
      jump = Number(gro[6])
      type = gro[7]
    }
    if (l.startsWith('EQ:')) eq = l.slice(3).trim()
    if (l.startsWith('INNATE:')) innate = l.slice(7).trim()
  }
  if (!hpm || !hpc) continue
  classes.push({
    index: hm[1],
    name: hm[2].trim(),
    id: slug(hm[2].trim()) + '-' + hm[1].toLowerCase(),
    mul: hpm,
    c: hpc,
    move,
    jump,
    cev,
    type,
    eq,
    innate,
  })
}
fs.writeFileSync(path.join(outDir, 'classes.json'), JSON.stringify(classes, null, 2))

// Height maps keyed by the nearest preceding story tag.
const battleIds = []
const walkLines = walkText.split(/\r?\n/)
const maps = {}
let currentId = null
let currentAt = -1
for (let i = 0; i < walkLines.length; i++) {
  const line = walkLines[i]
  const tag = line.match(/^\[(2\.\d[a-z])\]/)
  if (tag) {
    currentId = tag[1]
    currentAt = i
    continue
  }
  if (/Orbonne Monastery/.test(line) && currentId == null) {
    currentId = 'prologue-orbonne'
    currentAt = i
  }
  if (!/Height Map|\/\/\s*Height\s*\\/.test(line)) continue
  if (!currentId || i - currentAt > 160) continue
  if (maps[currentId]) continue
  const rows = []
  for (let j = i + 1; j < Math.min(i + 40, walkLines.length); j++) {
    const row = walkLines[j].match(/^\s*(\d+)\s*\]\s+(.+)$/)
    if (!row) {
      if (/_{5,}|Terrain|Starting Grid|Move-Find/.test(walkLines[j]) && rows.length) break
      continue
    }
    const cells = row[2].trim().split(/\s+/)
    if (cells.length < 4) continue
    rows.push(cells.map((c) => (c.toLowerCase() === 'xxx' ? null : Number(c))))
  }
  if (rows.length >= 4) {
    maps[currentId] = { rows, cols: rows[0].length }
    battleIds.push(currentId)
  }
}
fs.writeFileSync(path.join(outDir, 'maps.json'), JSON.stringify(maps))

// Poach chart from the walkthrough (monster || common || rare)
const poach = []
const poachAt = walkText.indexOf('Goblin         || Potion')
const slice = walkText.slice(Math.max(0, poachAt - 200), poachAt + 6000)
for (const line of slice.split(/\r?\n/)) {
  const pm = line.match(/^([A-Za-z][A-Za-z' -]+?)\s+\|\|\s+([^|]+?)\s+\|\|\s+(.+?)\s*$/)
  if (!pm) continue
  const monster = pm[1].trim()
  const common = pm[2].replace(/\(.*\)/, '').trim()
  const rare = pm[3].replace(/\(.*\)/, '').trim()
  if (!common || !rare || monster.length > 30) continue
  poach.push({ monster, id: slug(monster), common, rare, commonId: slug(common), rareId: slug(rare) })
}
fs.writeFileSync(path.join(outDir, 'poach.json'), JSON.stringify(poach, null, 2))

// Ability name + JP pairs, best-effort, for the checklist cross-check.
const abilityHits = []
for (const line of jobsText.split(/\r?\n/)) {
  const am = line.match(/^([A-Z][A-Za-z0-9'+. -]{2,28}?)\s{2,}.*?\b(\d{2,4})\b/)
  if (!am) continue
  const name = am[1].trim()
  if (/^(Name|Comments|Prerequisite|Weapons|Helmet|Armor|Move|Jump|Range|Effect)$/i.test(name)) continue
  abilityHits.push({ name, jp: Number(am[2]) })
}
fs.writeFileSync(path.join(outDir, 'ability-scan.json'), JSON.stringify(abilityHits.slice(0, 800), null, 2))

console.log(JSON.stringify({
  items: uniqueItems.length,
  classes: classes.length,
  maps: Object.keys(maps).length,
  mapIds: Object.keys(maps),
  poach: poach.length,
  abilityScan: abilityHits.length,
  sampleItem: uniqueItems.find((i) => i.id === 'dagger'),
  squire4a: classes.find((c) => c.index === '4A'),
}, null, 2))
