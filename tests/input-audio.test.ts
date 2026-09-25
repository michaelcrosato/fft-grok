import { describe, expect, it } from 'vitest'
import { AudioBus } from '../src/core/mixer'
import { commandFromGamepad, commandFromKey, commandFromPointer, commandFromTouchZone } from '../src/core/inputmap'

describe('shared commands and audio gain', () => {
  it('maps keyboard, pointer, touch, and gamepad onto the same commands', () => {
    expect(commandFromKey('KeyK')).toBe('wait')
    expect(commandFromTouchZone('wait')).toBe('wait')
    expect(commandFromPointer('wait')).toBe('wait')
    expect(commandFromGamepad({ buttons: [{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: true }], axes: [0, 0] })).toBe('wait')

    expect(commandFromKey('KeyJ')).toBe('act')
    expect(commandFromPointer('act')).toBe('act')
    expect(commandFromGamepad({ buttons: [{ pressed: false }, { pressed: false }, { pressed: true }], axes: [0, 0] })).toBe('act')

    expect(commandFromKey('Escape')).toBe('cancel')
    expect(commandFromPointer('cancel')).toBe('cancel')
    expect(commandFromGamepad({ buttons: [{ pressed: false }, { pressed: true }], axes: [0, 0] })).toBe('cancel')

    expect(commandFromKey('ArrowRight')).toBe('right')
    expect(commandFromTouchZone('pad-right')).toBe('right')
    expect(commandFromGamepad({ buttons: [], axes: [0.8, 0] })).toBe('right')
    expect(commandFromPointer('tile')).toBe('confirm')
  })

  it('changes the bound gain when volume or mute changes', () => {
    const node = { gain: { value: 1 } }
    const bus = new AudioBus()
    bus.bind(node)
    bus.setVolume(0.35)
    expect(node.gain.value).toBeCloseTo(0.35)
    bus.setMuted(true)
    expect(node.gain.value).toBe(0)
    bus.setMuted(false)
    expect(node.gain.value).toBeCloseTo(0.35)
  })
})
