import { describe, expect, it } from 'vitest'

import { formatStatusDisplay, networkOutcome } from '@/features/interceptor/networkStatus'

describe('networkStatus', () => {
  it('labels aborted and blocked like DevTools', () => {
    expect(networkOutcome('net::ERR_ABORTED')).toBe('aborted')
    expect(formatStatusDisplay({ error: 'net::ERR_ABORTED' }).text).toBe('(canceled)')
    expect(formatStatusDisplay({ error: 'net::ERR_BLOCKED_BY_CLIENT' }).text).toBe('(blocked)')
  })

  it('shows HTTP status when no error', () => {
    expect(formatStatusDisplay({ status: 200 }).text).toBe('200')
  })
})
