import { describe, expect, it } from 'vitest'

import { applyFilenameTemplate, sanitizeFilenamePart } from '@/core/screenshot/filename'

describe('filename template', () => {
  it('substitutes tokens', () => {
    const name = applyFilenameTemplate('{title}-{date}-{time}.{ext}', {
      title: 'Hello World',
      date: '2026-01-01',
      time: '12-00-00',
      domain: 'example.com',
      ext: 'png',
    })
    expect(name).toBe('Hello World-2026-01-01-12-00-00.png')
  })

  it('sanitizes illegal characters', () => {
    expect(sanitizeFilenamePart('bad/name:test')).toBe('badnametest')
  })
})
