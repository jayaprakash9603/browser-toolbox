import { describe, expect, it } from 'vitest'

import { isSkipElementClickable } from '@/chrome/content/adblock/youtube/skipAd'

describe('YouTube auto skip', () => {
  it('rejects disabled skip controls', () => {
    const el = document.createElement('button')
    el.className = 'ytp-ad-skip-button ytp-ad-skip-button-disabled'
    document.body.appendChild(el)
    expect(isSkipElementClickable(el)).toBe(false)
    el.remove()
  })

  it('accepts visible skip buttons', () => {
    const el = document.createElement('button')
    el.className = 'ytp-skip-ad-button'
    el.textContent = 'Skip ad'
    el.getBoundingClientRect = () =>
      ({ width: 80, height: 32, top: 0, left: 0, right: 80, bottom: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    document.body.appendChild(el)
    expect(isSkipElementClickable(el)).toBe(true)
    el.remove()
  })
})
