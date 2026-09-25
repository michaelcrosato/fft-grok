import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const assetDir = path.join(dist, 'assets')
const files = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : []
for (const file of files) {
  const text = fs.readFileSync(path.join(assetDir, file), 'utf8')
  if (file.endsWith('.css')) {
    html = html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, () => `<style>\n${text}\n</style>`)
  }
  if (file.endsWith('.js')) {
    html = html.replace(/<script[^>]+src="[^"]+\.js"[^>]*><\/script>/, () => `<script type="module">\n${text}\n</script>`)
  }
}
if (!html.includes('2026-09-25')) {
  html = html.replace('<head>', '<head>\n<meta name="date" content="2026-09-25" />')
}
if (!html.includes('Grok 4.7')) {
  html = html.replace('<head>', '<head>\n<meta name="generator" content="Grok 4.7" />')
}
const out = path.resolve('the-zodiac-standard.html')
fs.writeFileSync(out, html)
const sibling = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]).filter((url) => !url.startsWith('data:') && !url.startsWith('#') && !url.startsWith('http'))
console.log(JSON.stringify({ bytes: fs.statSync(out).size, siblingRefs: sibling }))
