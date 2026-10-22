import { describe, expect, it } from 'vitest'

import { TOOLBOX_COMMANDS } from '@/core/commands/registry'

describe('screenshot shortcut registry', () => {
  it('registers capture commands without duplicate bindings', () => {
    const capture = TOOLBOX_COMMANDS.filter((c) => c.id.startsWith('capture-'))
    expect(capture.map((c) => c.id)).toContain('capture-screenshot')
    expect(capture.every((c) => c.opensPanel === false)).toBe(true)
    const bindings = capture.map((c) => c.binding.default)
    expect(new Set(bindings).size).toBe(bindings.length)
  })
})
