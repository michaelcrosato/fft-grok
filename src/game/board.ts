import Phaser from 'phaser'
import { onTile, stage } from './stage'

const INK = 0x12151c
const STONE = 0x3c4658
const STONE_LIT = 0x5c6b84
const GOLD = 0xe2b15a
const CRIMSON = 0x8c2f39
const BLUE = 0x2f5f8a
const PARCHMENT = 0xc8bfb0

export class BoardScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics

  constructor() {
    super('board')
  }

  create(): void {
    this.gfx = this.add.graphics()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hit = this.pick(pointer.x, pointer.y)
      if (hit) onTile(hit.x, hit.y)
    })
  }

  update(): void {
    const w = this.scale.width
    const h = this.scale.height
    this.gfx.clear()
    this.gfx.fillStyle(INK, 1)
    this.gfx.fillRect(0, 0, w, h)
    if (stage.paint === 'battle' && stage.battle) this.drawBattle(w, h)
    else if (stage.paint === 'map') this.drawMap(w, h)
    else this.drawTitle(w, h)
  }

  private drawTitle(w: number, h: number): void {
    const cols = 8
    const rows = 6
    const tw = Math.min(64, Math.floor(w / 9))
    const th = Math.round(tw * 0.52)
    const originX = w / 2
    const originY = h * 0.22
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const height = ((x + y) % 4) * 8
        const color = (x + y) % 5 === 0 ? 0x2a3350 : STONE
        this.diamond(x, y, height, originX, originY, tw, th, color)
      }
    }
    this.person(originX - tw, originY + th * 3, GOLD)
    this.person(originX + tw * 1.4, originY + th * 3.4, 0xd7d2c8)
    if (stage.effects === 'high') {
      this.gfx.fillStyle(CRIMSON, 0.9)
      this.gfx.fillRect(w * 0.08, h * 0.18, 10, h * 0.28)
      this.gfx.fillTriangle(w * 0.08 + 10, h * 0.18, w * 0.08 + 46, h * 0.24, w * 0.08 + 10, h * 0.3)
    }
  }

  private drawMap(w: number, h: number): void {
    this.gfx.fillStyle(0x1a2433, 1)
    this.gfx.fillRect(0, 0, w, h)
    this.gfx.fillStyle(0x243044, 0.9)
    this.gfx.fillEllipse(w * 0.5, h * 0.48, w * 0.72, h * 0.62)
    const dots = [
      [0.28, 0.38], [0.36, 0.46], [0.48, 0.42], [0.62, 0.5], [0.7, 0.36], [0.42, 0.62],
    ]
    dots.forEach(([x, y], index) => {
      this.gfx.fillStyle(index === 0 ? GOLD : CRIMSON, 1)
      this.gfx.fillCircle(w * x, h * y, index === 0 ? 7 : 5)
    })
  }

  private drawBattle(w: number, h: number): void {
    const battle = stage.battle!
    const fit = this.metrics(w, h, battle.w, battle.h)
    const { tw, th, originX, originY } = fit
    const tiles = battle.tiles.slice().sort((a, b) => a.x + a.y - (b.x + b.y))
    for (const tile of tiles) {
      if (tile.blocked) continue
      const inRange = stage.range.some((spot) => spot.x === tile.x && spot.y === tile.y)
      const aimed = stage.threat.some((spot) => spot.x === tile.x && spot.y === tile.y)
      const selected = stage.cursor.x === tile.x && stage.cursor.y === tile.y
      let color = 0x2c3548 + ((tile.h / 10) % 4) * 0x101010
      if (tile.terrain === 'woods') color = 0x243828
      if (tile.terrain === 'water' || tile.terrain === 'swamp' || tile.terrain === 'lake' || tile.terrain === 'falls') color = 0x1d3c55
      if (tile.terrain === 'desert') color = 0x6a5436
      if (inRange) color = BLUE
      if (aimed) color = 0x6e2430
      if (stage.effects === 'high' && !battle.dark) {
        this.diamond(tile.x, tile.y, tile.h, originX, originY + 3, tw, th, 0x0c1018, 0.45)
      }
      const shown = battle.dark ? 0x161b26 : color
      this.diamond(tile.x, tile.y, tile.h, originX, originY, tw, th, shown)
      if (selected) this.strokeDiamond(tile.x, tile.y, tile.h, originX, originY, tw, th, GOLD)
    }
    const units = battle.units.filter((unit) => !unit.crystal).sort((a, b) => a.x + a.y - (b.x + b.y))
    for (const unit of units) {
      const tile = battle.tiles.find((candidate) => candidate.x === unit.x && candidate.y === unit.y)
      const p = this.project(unit.x, unit.y, tile?.h ?? 0, originX, originY, tw, th)
      const color = unit.side === 'enemy' ? CRIMSON : unit.side === 'guest' ? 0x7f9a6a : GOLD
      if (!battle.dark || unit.side !== 'enemy' || !unit.dead) this.person(p.sx, p.sy + th * 0.55, unit.dead ? 0x555555 : color)
    }
  }

  private project(x: number, y: number, height: number, ox: number, oy: number, tw: number, th: number) {
    return {
      sx: ox + (x - y) * (tw / 2),
      sy: oy + (x + y) * (th / 2) - height * 0.28,
    }
  }

  private diamond(x: number, y: number, height: number, ox: number, oy: number, tw: number, th: number, color: number, alpha = 1): void {
    const p = this.project(x, y, height, ox, oy, tw, th)
    this.gfx.fillStyle(color, alpha)
    this.gfx.beginPath()
    this.gfx.moveTo(p.sx, p.sy)
    this.gfx.lineTo(p.sx + tw / 2, p.sy + th / 2)
    this.gfx.lineTo(p.sx, p.sy + th)
    this.gfx.lineTo(p.sx - tw / 2, p.sy + th / 2)
    this.gfx.closePath()
    this.gfx.fillPath()
    this.gfx.lineStyle(1, 0x0e1320, 0.65)
    this.gfx.strokePath()
  }

  private strokeDiamond(x: number, y: number, height: number, ox: number, oy: number, tw: number, th: number, color: number): void {
    const p = this.project(x, y, height, ox, oy, tw, th)
    this.gfx.lineStyle(2, color, 1)
    this.gfx.beginPath()
    this.gfx.moveTo(p.sx, p.sy - 2)
    this.gfx.lineTo(p.sx + tw / 2, p.sy + th / 2)
    this.gfx.lineTo(p.sx, p.sy + th + 2)
    this.gfx.lineTo(p.sx - tw / 2, p.sy + th / 2)
    this.gfx.closePath()
    this.gfx.strokePath()
  }

  private person(sx: number, sy: number, color: number): void {
    this.gfx.fillStyle(0x1a120c, 1)
    this.gfx.fillRect(sx - 7, sy - 2, 14, 5)
    this.gfx.fillStyle(color, 1)
    this.gfx.fillRect(sx - 5, sy - 18, 10, 16)
    this.gfx.fillStyle(PARCHMENT, 1)
    this.gfx.fillRect(sx - 4, sy - 26, 8, 8)
  }

  private pick(px: number, py: number): { x: number; y: number } | null {
    if (stage.paint !== 'battle' || !stage.battle) return null
    const battle = stage.battle
    const w = this.scale.width
    const h = this.scale.height
    const { tw, th, originX, originY } = this.metrics(w, h, battle.w, battle.h)
    let best: { x: number; y: number; d: number } | null = null
    for (const tile of battle.tiles) {
      if (tile.blocked) continue
      const p = this.project(tile.x, tile.y, tile.h, originX, originY, tw, th)
      const dx = Math.abs(px - p.sx)
      const dy = Math.abs(py - (p.sy + th / 2))
      if (dx / (tw / 2) + dy / (th / 2) <= 1) {
        const d = dx + dy
        if (!best || d < best.d) best = { x: tile.x, y: tile.y, d }
      }
    }
    return best ? { x: best.x, y: best.y } : null
  }

  private metrics(w: number, h: number, cols: number, rows: number) {
    const span = Math.max(4, cols + rows)
    const availH = Math.max(120, h - 168)
    const tw = Math.max(28, Math.min(100, Math.floor(Math.min(w * 0.92, availH * 1.8) / span * 2)))
    const th = Math.max(12, Math.round(tw * 0.52))
    return {
      tw,
      th,
      originX: w * 0.52,
      originY: Math.max(28, (availH - span * th * 0.45) / 2),
    }
  }
}
