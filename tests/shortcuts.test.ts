import { describe, expect, it } from 'vitest'

import {
  formatAcceleratorDisplay,
  getEffectiveBinding,
  parseAccelerator,
  findCommandForKeyEvent,
  DEFAULT_KEYBOARD_SHORTCUTS_STATE,
} from '@/core/commands'
import { MANIFEST_COMMAND_IDS } from '@/core/commands/manifest'
import { TOOLBOX_COMMANDS, GLOBAL_TOOLBOX_COMMANDS } from '@/core/commands/registry'

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
  it('lists global manifest commands without suggested keys in code', () => {
    expect(GLOBAL_TOOLBOX_COMMANDS.map((c) => c.id)).toEqual([
      'open-command-palette',
      'pick-element',
      'capture-screenshot',
      'capture-entire',
      'capture-visible',
      'capture-selection',
      'capture-element',
      'capture-menu',
      'toggle-pip',
      'toggle-recording',
    ])
    expect([...MANIFEST_COMMAND_IDS]).toEqual([
      'open-command-palette',
      'pick-element',
      'capture-screenshot',
      'toggle-pip',
      'toggle-recording',
    ])
    expect(TOOLBOX_COMMANDS.length).toBeGreaterThanOrEqual(5)
  })
})
