import { describe, expect, it } from 'vitest'

import { detectContent } from '@/core/engines/detection'

describe('detection engine', () => {
  it('detects JSON payloads', () => {
    const detections = detectContent('{ "ok": true }')
    expect(detections.some((entry) => entry.kind === 'json')).toBe(true)
  })

  it('detects JWT-shaped strings', () => {
    const token =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    expect(detectContent(token).some((entry) => entry.kind === 'jwt')).toBe(true)
  })

  it('returns empty for blank input', () => {
    expect(detectContent('   ')).toEqual([])
  })
})
