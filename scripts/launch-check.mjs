import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const scratch = process.env.SCRATCH || '/tmp/grok-goal-cd1adf58bf59/implementer'
fs.mkdirSync(scratch, { recursive: true })
const htmlPath = path.resolve('the-zodiac-standard.html')
const url = 'file://' + htmlPath

const log = []
const note = (line) => { log.push(line); console.log(line) }

async function shot(page, file) {
  await page.screenshot({ path: file })
}

async function run(name, viewport, out) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport })
  const errors = []
  const failed = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('requestfailed', (req) => failed.push(req.url() + ' ' + req.failure()?.errorText))
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.status() + ' ' + res.url())
  })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector('h1')
  const title = await page.locator('h1').innerText()
  note(`${name} title: ${title}`)
  await page.waitForTimeout(400)
  const canvas = page.locator('#board canvas')
  const box = await canvas.boundingBox()
  const dims = await canvas.evaluate((node) => ({
    w: node.width,
    h: node.height,
    cw: node.clientWidth,
    ch: node.clientHeight,
  }))
  note(`${name} canvas ${JSON.stringify(dims)} box ${JSON.stringify(box)} viewport ${viewport.width}x${viewport.height}`)
  const paint = await canvas.evaluate((node) => {
    const c = node
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { mode: 'webgl' }
    const data = ctx.getImageData(0, 0, Math.min(c.width, 80), Math.min(c.height, 80)).data
    let colored = 0
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] + data[i + 1] + data[i + 2] > 0) colored += 1
    }
    return { mode: '2d', colored, samples: data.length / 16 }
  })
  note(`${name} paint ${JSON.stringify(paint)}`)
  const titleShot = path.join(scratch, `${name}-title.png`)
  await shot(page, titleShot)
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByRole('button', { name: 'Begin the chronicle' }).click()
  const cont = page.getByRole('button', { name: 'Continue' })
  if (await cont.count()) await cont.click()
  await page.getByRole('button', { name: 'To the field' }).click()
  await page.waitForSelector('.readout')
  await page.waitForTimeout(1200)
  const readoutBefore = await page.locator('.readout').innerText()
  const battleShot = path.join(scratch, `${name}-battle.png`)
  await shot(page, battleShot)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(250)
  const readoutAfter = await page.locator('.readout').innerText()
  note(`${name} cursor ${readoutBefore} -> ${readoutAfter}`)
  const movedShot = path.join(scratch, `${name}-moved.png`)
  await shot(page, movedShot)
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Fullscreen lock' }).click()
  await page.waitForTimeout(200)
  note(`${name} errors ${errors.length} failed ${failed.length}`)
  if (errors.length) note(errors.join('\n'))
  if (failed.length) note(failed.join('\n'))
  await browser.close()
  return { title, readoutBefore, readoutAfter, errors, failed, dims, titleShot, battleShot, movedShot }
}

const phone = await run('phone', { width: 844, height: 390 }, 'launch-1')
const desktop = await run('desktop', { width: 1280, height: 800 }, 'launch-2')

async function stitch(a, b, dest) {
  const { chromium: browserType } = await import('playwright')
  const browser = await browserType.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } })
  const a64 = fs.readFileSync(a).toString('base64')
  const b64 = fs.readFileSync(b).toString('base64')
  await page.setContent(`<body style="margin:0;background:#111">
    <img src="data:image/png;base64,${a64}" style="width:100%;display:block" />
    <img src="data:image/png;base64,${b64}" style="width:100%;display:block" />
  </body>`)
  await page.screenshot({ path: dest, fullPage: true })
  await browser.close()
}

await stitch(phone.titleShot, phone.battleShot, path.join(scratch, 'launch-1.png'))
await stitch(desktop.titleShot, desktop.movedShot, path.join(scratch, 'launch-2.png'))
fs.copyFileSync(phone.movedShot, path.join(scratch, 'launch-phone-moved.png'))
fs.writeFileSync(path.join(scratch, 'launch.log'), log.join('\n'))
const bad = phone.errors.length || desktop.errors.length || phone.failed.length || desktop.failed.length
  || phone.readoutBefore === phone.readoutAfter || desktop.readoutBefore === desktop.readoutAfter
  || !phone.title.includes('The Zodiac Standard')
if (bad) {
  note('LAUNCH FAILED')
  process.exit(1)
}
note('LAUNCH OK')
