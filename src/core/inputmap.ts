export type Command =
  | 'up' | 'down' | 'left' | 'right'
  | 'confirm' | 'cancel' | 'act' | 'wait' | 'undo'
  | 'forecast' | 'menu' | 'speed'

export function commandFromKey(code: string): Command | null {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      return 'up'
    case 'ArrowDown':
    case 'KeyS':
      return 'down'
    case 'ArrowLeft':
    case 'KeyA':
      return 'left'
    case 'ArrowRight':
    case 'KeyD':
      return 'right'
    case 'Enter':
    case 'Space':
      return 'confirm'
    case 'Escape':
    case 'Backspace':
    case 'KeyX':
      return 'cancel'
    case 'KeyJ':
    case 'KeyF':
      return 'act'
    case 'KeyK':
      return 'wait'
    case 'KeyU':
    case 'KeyZ':
      return 'undo'
    case 'KeyT':
      return 'forecast'
    case 'KeyO':
      return 'menu'
    case 'KeyP':
      return 'speed'
    default:
      return null
  }
}

export interface PadLike {
  buttons: readonly { pressed: boolean }[]
  axes: readonly number[]
}

/** Standard gamepad: A confirm, B cancel, X act, Y wait, d-pad or stick to move. */
export function commandFromGamepad(pad: PadLike): Command | null {
  const pressed = (index: number) => !!pad.buttons[index]?.pressed
  if (pressed(0)) return 'confirm'
  if (pressed(1)) return 'cancel'
  if (pressed(2)) return 'act'
  if (pressed(3)) return 'wait'
  if (pressed(4)) return 'undo'
  if (pressed(9)) return 'menu'
  if (pressed(12)) return 'up'
  if (pressed(13)) return 'down'
  if (pressed(14)) return 'left'
  if (pressed(15)) return 'right'
  const x = pad.axes[0] ?? 0
  const y = pad.axes[1] ?? 0
  if (y < -0.55) return 'up'
  if (y > 0.55) return 'down'
  if (x < -0.55) return 'left'
  if (x > 0.55) return 'right'
  return null
}

const ZONES: Record<string, Command> = {
  'pad-up': 'up',
  'pad-down': 'down',
  'pad-left': 'left',
  'pad-right': 'right',
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  confirm: 'confirm',
  cancel: 'cancel',
  act: 'act',
  wait: 'wait',
  undo: 'undo',
  forecast: 'forecast',
  menu: 'menu',
  speed: 'speed',
}

export function commandFromTouchZone(zone: string): Command | null {
  return ZONES[zone] ?? null
}

/** Mouse and touch buttons share the zone map. A tile click is a confirm on that tile. */
export function commandFromPointer(target: string): Command | null {
  if (target === 'tile') return 'confirm'
  return commandFromTouchZone(target)
}
