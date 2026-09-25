import Phaser from 'phaser'
import { BoardScene } from './game/board'
import { bootShell } from './game/shell'
import './style.css'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'board',
  backgroundColor: '#12151c',
  banner: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [BoardScene],
  audio: { noAudio: true },
  input: { activePointers: 2 },
})

bootShell()

document.documentElement.dataset.game = 'the-zodiac-standard'
void game
