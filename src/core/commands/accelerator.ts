import type { KeyModifiers } from './types'

const NAMED_KEYS: Record<string, string> = {
  ' ': 'Space',
  spacebar: 'Space',
  space: 'Space',
  arrowup: 'Up',
  arrowdown: 'Down',
  arrowleft: 'Left',
  arrowright: 'Right',
  escape: 'Esc',
  esc: 'Esc',
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent)
}

/** Parse Chrome-style accelerator (e.g. Ctrl+Shift+Space) into modifiers. */
export function parseAccelerator(accelerator: string): KeyModifiers | null {
  const parts = accelerator.split('+').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return null
  const keyPart = parts[parts.length - 1]
  const mods = parts.slice(0, -1).map((p) => p.toLowerCase())
  const key = normalizeKeyToken(keyPart)
  if (!key) return null
  return {
    key,
    ctrl: mods.includes('ctrl') || mods.includes('control'),
    alt: mods.includes('alt') || mods.includes('option'),
    shift: mods.includes('shift'),
    meta: mods.includes('command') || mods.includes('cmd') || mods.includes('meta'),
  }
}

function normalizeKeyToken(token: string): string {
  const lower = token.toLowerCase()
  if (NAMED_KEYS[lower]) return NAMED_KEYS[lower]
  if (token.length === 1) return token.toUpperCase()
  if (/^f\d+$/i.test(token)) return token.toUpperCase()
  return token.length ? token[0].toUpperCase() + token.slice(1).toLowerCase() : ''
}

export function keyModifiersFromKeyboardEvent(event: KeyboardEvent): KeyModifiers {
  const key = normalizeKeyToken(event.key)
  return {
    key,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  }
}

export function modifiersMatch(a: KeyModifiers, b: KeyModifiers): boolean {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta
  )
}

export function matchesAccelerator(event: KeyboardEvent, accelerator: string): boolean {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) return false
  const fromEvent = keyModifiersFromKeyboardEvent(event)
  return modifiersMatch(parsed, fromEvent)
}

export function formatAcceleratorDisplay(accelerator: string, mac = isMacPlatform()): string {
  const parts = accelerator.split('+').map((p) => p.trim())
  return parts
    .map((part) => {
      const lower = part.toLowerCase()
      if (mac && (lower === 'command' || lower === 'cmd' || lower === 'meta')) return '⌘'
      if (!mac && (lower === 'ctrl' || lower === 'control')) return 'Ctrl'
      if (lower === 'alt' || lower === 'option') return mac ? '⌥' : 'Alt'
      if (lower === 'shift') return mac ? '⇧' : 'Shift'
      if (lower === 'space') return 'Space'
      if (part.length === 1) return part.toUpperCase()
      return part
    })
    .join(mac ? '' : '+')
    .replace(/\+\+/g, '+')
}

export function acceleratorFromKeyboardEvent(event: KeyboardEvent, mac = isMacPlatform()): string | null {
  if (event.repeat) return null
  const key = event.key
  if (!key || key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null
  const normalized = normalizeKeyToken(key)
  if (!normalized) return null
  const parts: string[] = []
  if (mac) {
    if (event.metaKey) parts.push('Command')
    if (event.ctrlKey) parts.push('Ctrl')
  } else {
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.metaKey) parts.push('Command')
  }
  if (event.altKey) parts.push(mac ? 'Option' : 'Alt')
  if (event.shiftKey) parts.push('Shift')
  parts.push(normalized === 'Space' ? 'Space' : normalized)
  return parts.join('+')
}
