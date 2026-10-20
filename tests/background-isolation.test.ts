import { describe, expect, it, vi } from 'vitest'

import { safeRegister } from '@/chrome/background/safeInit'

describe('safeRegister', () => {
  it('runs later registrations when an earlier one throws', () => {
    const order: string[] = []
    safeRegister('first', () => {
      order.push('first')
      throw new Error('boom')
    })
    safeRegister('second', () => {
      order.push('second')
    })
    expect(order).toEqual(['first', 'second'])
  })

  it('logs async registration failures without throwing', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    safeRegister('async', () => Promise.reject(new Error('async fail')))
    await new Promise((r) => setTimeout(r, 10))
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
