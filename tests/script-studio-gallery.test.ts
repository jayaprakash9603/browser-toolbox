import { describe, expect, it } from 'vitest'

import { GALLERY_CATEGORIES, GALLERY_SCRIPTS } from '@/core/script-studio/gallery'
import { parseMetadata } from '@/core/script-studio/metadata'

describe('script-studio gallery', () => {
  it('ships around 30 scripts with unique ids', () => {
    expect(GALLERY_SCRIPTS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(GALLERY_SCRIPTS.map((s) => s.id)).size).toBe(GALLERY_SCRIPTS.length)
  })

  it('covers every category', () => {
    for (const category of GALLERY_CATEGORIES) {
      expect(GALLERY_SCRIPTS.some((s) => s.category === category)).toBe(true)
    }
  })

  it.each(GALLERY_SCRIPTS.map((s) => [s.id, s] as const))('%s has valid metadata and JavaScript', (_, script) => {
    const meta = parseMetadata(script.code)
    expect(meta?.name.default ?? Object.values(meta?.name ?? {})[0]).toBe(script.name)
    expect(meta?.matches.length).toBeGreaterThan(0)
    expect(() => new Function(script.code)).not.toThrow()
  })
})
