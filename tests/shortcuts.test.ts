import { describe, expect, it } from 'vitest'

import {
  formatAcceleratorDisplay,
  getEffectiveBinding,
  parseAccelerator,
  findCommandForKeyEvent,
  DEFAULT_KEYBOARD_SHORTCUTS_STATE,
} from '@/core/commands'
import { parseChromeShortcut } from '@/core/commands/accelerator'
import { buildManifestCommands, MANIFEST_COMMAND_IDS } from '@/core/commands/manifest'
import { TOOLBOX_COMMANDS, GLOBAL_TOOLBOX_COMMANDS } from '@/core/commands/registry'

describe('parseChromeShortcut', () => {
  it('reads the shortcut Chrome reports on Windows and macOS', () => {
    const windows = parseChromeShortcut('Ctrl+Shift+F')
    const mac = parseChromeShortcut('\u21E7\u2318F')
    expect(windows).toEqual({ key: 'F', ctrl: true, alt: false, shift: true, meta: false })
    expect(mac).toEqual({ key: 'F', ctrl: false, alt: false, shift: true, meta: true })
    expect(parseChromeShortcut('')).toBeNull()
  })

  it('maps a stale Chrome binding back to the command the app binds to that key', () => {
    const pressed = parseChromeShortcut('Ctrl+Shift+F')!
    expect(findCommandForKeyEvent(pressed, DEFAULT_KEYBOARD_SHORTCUTS_STATE, 'global', false)).toBe('form-fill')
    const mac = parseChromeShortcut('\u21E7\u2318C')!
    expect(findCommandForKeyEvent(mac, DEFAULT_KEYBOARD_SHORTCUTS_STATE, 'global', true)).toBe('form-clear')
  })
})

describe('accelerator', () => {
  it('parses Ctrl+Shift+Space', () => {
    expect(parseAccelerator('Ctrl+Shift+Space')).toEqual({
      ctrl: true,
      alt: false,
      shift: true,
      meta: false,
      key: 'Space',
    })
  })

  it('formats display for mac Command+K', () => {
    expect(formatAcceleratorDisplay('Command+K', true)).toContain('⌘')
  })
})

describe('shortcut bindings', () => {
  it('uses defaults when no overrides', () => {
    const binding = getEffectiveBinding('toggle-pip', DEFAULT_KEYBOARD_SHORTCUTS_STATE, false)
    expect(binding).toBe('Alt+P')
  })

  it('resolves panel search from key event', () => {
    const command = findCommandForKeyEvent(
      { key: 'K', ctrl: true, alt: false, shift: false, meta: false },
      DEFAULT_KEYBOARD_SHORTCUTS_STATE,
      'panel',
      false,
    )
    expect(command).toBe('panel-search')
  })
})

describe('command registry', () => {
  it('lists global manifest commands without baked-in Chrome keys', () => {
    const manifest = buildManifestCommands()
    expect(manifest['open-command-palette']?.description).toBe('__MSG_commandPaletteDescription__')
    expect(manifest['open-command-palette']).not.toHaveProperty('suggested_key')
    expect(GLOBAL_TOOLBOX_COMMANDS.map((c) => c.id)).toEqual([
      'open-command-palette',
      'pick-element',
      'capture-screenshot',
      'capture-entire',
      'capture-visible',
      'capture-selection',
      'capture-element',
      'capture-menu',
      'pick-color',
      'toggle-pip',
      'toggle-recording',
      'add-page-task',
      'form-fill',
      'form-clear',
    ])
    expect([...MANIFEST_COMMAND_IDS]).toEqual([
      'open-command-palette',
      'pick-element',
      'capture-screenshot',
      'toggle-pip',
      'toggle-recording',
      'add-page-task',
      'pick-color',
      'form-fill',
      'form-clear',
    ])
    expect(manifest['form-fill']?.suggested_key).toEqual({ default: 'Ctrl+Shift+F', mac: 'Command+Shift+F' })
    expect(manifest['form-clear']?.suggested_key).toEqual({ default: 'Ctrl+Shift+C', mac: 'Command+Shift+C' })
    expect(TOOLBOX_COMMANDS.length).toBeGreaterThanOrEqual(5)
  })
})
