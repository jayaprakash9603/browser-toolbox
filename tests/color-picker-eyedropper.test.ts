import { afterEach, describe, expect, it, vi } from 'vitest'

import { canUseEyeDropper, pickWithEyeDropper } from '@/tools/design/color-picker/eyedropper'

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window, 'EyeDropper')
})

describe('pickWithEyeDropper', () => {
  it('reports unavailable when the API is missing', async () => {
    expect(canUseEyeDropper()).toBe(false)
    expect(await pickWithEyeDropper()).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('returns the picked hex', async () => {
    class EyeDropper {
      open() {
        return Promise.resolve({ sRGBHex: '#3B82F6' })
      }
    }
    vi.stubGlobal('EyeDropper', EyeDropper)
    expect(canUseEyeDropper()).toBe(true)
    expect(await pickWithEyeDropper()).toEqual({ ok: true, hex: '#3B82F6' })
  })

  it('treats Escape as cancel, not a hard failure', async () => {
    class EyeDropper {
      open() {
        return Promise.reject(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' }))
      }
    }
    vi.stubGlobal('EyeDropper', EyeDropper)
    expect(await pickWithEyeDropper()).toEqual({ ok: false, reason: 'cancelled' })
  })
})
