import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { findCommandForKeyEvent, keyModifiersFromKeyboardEvent } from '@/core/commands'
import { TOOLBOX_COMMANDS } from '@/core/commands/registry'

const NO_OVERRIDES = { bindings: {} }

function keyEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, ...init })
}

describe('screenshot shortcut registry', () => {
  it('registers capture commands without duplicate bindings', () => {
    const capture = TOOLBOX_COMMANDS.filter((c) => c.id.startsWith('capture-'))
    expect(capture.map((c) => c.id)).toContain('capture-screenshot')
    expect(capture.every((c) => c.opensPanel === false)).toBe(true)
    const bindings = capture.map((c) => c.binding.default)
    expect(new Set(bindings).size).toBe(bindings.length)
  })

  it.each([
    [{ key: '!', code: 'Digit1', altKey: true, shiftKey: true }, 'capture-entire'],
    [{ key: '#', code: 'Digit3', altKey: true, shiftKey: true }, 'capture-visible'],
    [{ key: '$', code: 'Digit4', altKey: true, shiftKey: true }, 'capture-selection'],
    [{ key: '%', code: 'Digit5', altKey: true, shiftKey: true }, 'capture-element'],
    [{ key: 'S', code: 'KeyS', altKey: true, shiftKey: true }, 'capture-menu'],
    [{ key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true }, 'capture-screenshot'],
    [{ key: 'E', code: 'KeyE', ctrlKey: true, shiftKey: true }, 'pick-element'],
    [{ key: ' ', code: 'Space', ctrlKey: true, shiftKey: true }, 'open-command-palette'],
    [{ key: 'π', code: 'KeyP', altKey: true }, 'toggle-pip'],
  ])('matches %o to %s', (init, commandId) => {
    const modifiers = keyModifiersFromKeyboardEvent(keyEvent(init))
    expect(findCommandForKeyEvent(modifiers, NO_OVERRIDES, 'global', false)).toBe(commandId)
  })
})

describe('page shortcut dispatcher', () => {
  it('reports the physical digit for Alt+Shift+1', () => {
    const sendMessage = vi.fn(() => Promise.resolve({ ok: true, data: { handled: true } }))
    vi.stubGlobal('chrome', { runtime: { id: 'test', sendMessage } })
    const source = readFileSync(
      join(process.cwd(), 'public/sites/scripts/shortcut-dispatcher.js'),
      'utf8',
    )
    new Function(source)()

    document.body.dispatchEvent(keyEvent({ key: '!', code: 'Digit1', altKey: true, shiftKey: true }))

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'SHORTCUT_KEY_EVENT',
      modifiers: { key: '1', ctrl: false, alt: true, shift: true, meta: false },
    })
    vi.unstubAllGlobals()
  })
})
