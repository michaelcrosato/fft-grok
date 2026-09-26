import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const scratch = process.env.SCRATCH || '/tmp/grok-goal-cd1adf58bf59/implementer'
fs.mkdirSync(scratch, { recursive: true })
const url = 'file://' + path.resolve('the-zodiac-standard.html')
const log = []
const note = (line) => { log.push(line); console.log(line) }

async function state(page) {
  return page.locator('#battle-state').evaluate((node) => ({ ...node.dataset }))
}

async function nudge(page, x, y) {
  for (let guard = 0; guard < 40; guard++) {
    const now = (await state(page)).cursor.split(',').map(Number)
    if (now[0] === x && now[1] === y) return
    if (now[0] < x) await page.keyboard.press('ArrowRight')
    else if (now[0] > x) await page.keyboard.press('ArrowLeft')
    else if (now[1] < y) await page.keyboard.press('ArrowDown')
    else await page.keyboard.press('ArrowUp')
  }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 844, height: 390 } })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
const failed = []
page.on('requestfailed', (req) => failed.push(req.url()))

await page.goto(url, { waitUntil: 'load' })
await page.waitForSelector('h1')
note('title ' + await page.locator('h1').innerText())
await page.screenshot({ path: path.join(scratch, 'proof-title.png') })
await page.getByRole('button', { name: 'New Game' }).click()
await page.getByRole('button', { name: 'Begin the chronicle' }).click()
if (await page.getByRole('button', { name: 'Continue' }).count()) await page.getByRole('button', { name: 'Continue' }).click()
await page.getByRole('button', { name: 'To the field' }).click()
await page.waitForFunction(() => {
  const node = document.querySelector('#battle-state')
  return node && node.dataset.phase === 'input' && node.dataset.range
})
const before = await state(page)
note('turn ' + before.active + ' at ' + before.pos + ' range ' + before.range)
const tiles = before.range.split(' ').filter(Boolean).map((pair) => pair.split(',').map(Number))
const foes = (before.foes || '').split('|').filter(Boolean).map((row) => {
  const [name, xy, hp] = row.split(':')
  const [x, y] = xy.split(',').map(Number)
  return { name, x, y, hp: Number(hp) }
})
let step = tiles[0]
for (const tile of tiles) {
  if (foes.some((foe) => Math.abs(foe.x - tile[0]) + Math.abs(foe.y - tile[1]) === 1)) {
    step = tile
    break
  }
}
await nudge(page, step[0], step[1])
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
const moved = await state(page)
const movedLog = await page.locator('#battle-log').innerText()
note('after move pos ' + moved.pos + ' log ' + movedLog)
if (!movedLog.includes('moved')) throw new Error('move did not register')
await page.screenshot({ path: path.join(scratch, 'proof-moved.png') })

await page.getByRole('button', { name: 'Act' }).click()
await page.getByRole('button', { name: 'Attack', exact: true }).click()
const aimed = await state(page)
const live = (aimed.foes || '').split('|').filter((row) => row && !row.endsWith(':1'))
let acted = false
if (live.length) {
  const [name, xy] = live[0].split(':')
  const [x, y] = xy.split(',').map(Number)
  await nudge(page, x, y)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  const logText = await page.locator('#battle-log').innerText()
  note('after act ' + logText)
  acted = logText.includes('acts on')
}
if (!acted) {
  await page.getByRole('button', { name: 'Wait' }).click()
  await page.waitForTimeout(200)
  const logText = await page.locator('#battle-log').innerText()
  note('after wait ' + logText)
  if (!logText.includes('waits')) throw new Error('wait did not register')
}
await page.screenshot({ path: path.join(scratch, 'proof-acted.png') })

await page.getByRole('button', { name: 'Auto', exact: true }).click()
await page.getByRole('button', { name: 'Take the field' }).waitFor({ timeout: 90000 })
note('story advanced to world')
await page.screenshot({ path: path.join(scratch, 'proof-world.png') })

await page.getByRole('button', { name: 'Shop' }).click()
note('shop ' + await page.locator('h1').innerText())
await page.screenshot({ path: path.join(scratch, 'proof-shop.png') })
await page.getByRole('button', { name: 'Back' }).click()
await page.getByRole('button', { name: 'Jobs' }).click()
const jobs = await page.locator('body').innerText()
if (!jobs.includes('Squire 2') && !jobs.includes('Knight')) throw new Error('job requirements missing')
note('jobs open')
await page.getByRole('button', { name: 'Back' }).click()
await page.getByRole('button', { name: 'Save' }).click()
await page.getByRole('button', { name: 'Save', exact: true }).first().click()
const saved = await page.locator('body').innerText()
if (!saved.includes('Ramza')) throw new Error('save slot did not show the party')
note('saved')
await page.screenshot({ path: path.join(scratch, 'proof-save.png') })
await page.getByRole('button', { name: 'Back' }).click()
await page.getByRole('button', { name: 'Options' }).click()
await page.getByRole('button', { name: 'Mute' }).click()
await page.getByRole('button', { name: 'Animation: 1' }).click()
await page.getByRole('button', { name: 'Animation: 2' }).click()
await page.getByRole('button', { name: 'Animation: 3' }).click()
note('options ' + await page.locator('body').innerText())
await page.getByRole('button', { name: 'Back' }).click()

let lastNext = ''
let repeats = 0
for (let i = 0; i < 450; i++) {
  if (await page.getByRole('heading', { name: 'Somebody to Love' }).count()) break
  const autoBtn = page.getByRole('button', { name: 'Auto', exact: true })
  if (await autoBtn.count()) {
    await autoBtn.click()
    await page.waitForFunction(() => {
      const node = document.querySelector('#battle-state')
      const heading = document.querySelector('h1')?.textContent ?? ''
      if (heading.includes('Somebody')) return true
      if (node?.dataset?.result) return true
      if (!node && (heading.includes('Chapter') || heading.includes('No retreat'))) return true
      return false
    }, null, { timeout: 180000 })
    const body = await page.locator('body').innerText()
    const next = (body.match(/Next: [^\n]+/) || ['ending'])[0]
    note('resolved ' + next.slice(0, 80))
    if (next === lastNext) repeats += 1
    else { repeats = 0; lastNext = next }
    if (repeats >= 2) throw new Error('same battle twice: ' + next)
    continue
  }
  if (await page.getByRole('button', { name: 'Enter anyway' }).count()) {
    await page.getByRole('button', { name: 'Enter anyway' }).click()
    continue
  }
  if (await page.getByRole('button', { name: 'To the field' }).count()) {
    await page.getByRole('button', { name: 'To the field' }).click()
    await page.waitForTimeout(100)
    continue
  }
  if (await page.getByRole('button', { name: 'Continue' }).count()) {
    await page.getByRole('button', { name: 'Continue' }).click()
    continue
  }
  if (await page.getByRole('button', { name: 'Take the field' }).count()) {
    const body = await page.locator('body').innerText()
    const next = (body.match(/Next: [^\n]+/) || [''])[0]
    note('field ' + next.slice(0, 80))
    await page.getByRole('button', { name: 'Take the field' }).click()
    continue
  }
  await page.waitForTimeout(200)
}
const endHeading = await page.locator('h1').innerText()
note('landing ' + endHeading)
await page.screenshot({ path: path.join(scratch, 'proof-ending.png') })
if (!endHeading.includes('Somebody to Love')) throw new Error('ending not reached: ' + endHeading)
if (errors.length || failed.length) {
  note('errors ' + errors.join(' | '))
  note('failed ' + failed.join(' | '))
  throw new Error('page errors')
}
await browser.close()
fs.writeFileSync(path.join(scratch, 'playthrough.log'), log.join('\n'))
note('PLAYTHROUGH OK')
