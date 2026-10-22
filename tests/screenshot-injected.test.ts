import { describe, expect, it } from 'vitest'

import {
  collectPageMeta,
  disableSmoothScroll,
  hideFixedStickyAfterFirst,
  prepareEntireCaptureScrollTarget,
  restoreCapturePageState,
  scrollCaptureTo,
} from '@/core/engines/capture/pageCaptureScript'
import { planSliceDraw } from '@/core/screenshot/export/canvas'

/** Rebuilds a function from its source, as chrome.scripting.executeScript does. */
function serialized<T extends (...args: never[]) => unknown>(fn: T): T {
  return new Function(`return (${fn.toString()})`)() as T
}

describe('injected capture functions', () => {
  it('run without module-scope references', () => {
    window.scrollTo = () => undefined
    const metrics = serialized(prepareEntireCaptureScrollTarget)()
    expect(metrics.scrollTarget).toBe('window')
    expect(() => serialized(scrollCaptureTo)(0)).not.toThrow()
    expect(() => serialized(disableSmoothScroll)()).not.toThrow()
    expect(() => serialized(hideFixedStickyAfterFirst)()).not.toThrow()
    expect(() => serialized(restoreCapturePageState)(0)).not.toThrow()
    expect(serialized(collectPageMeta)().links).toEqual([])
  })
})

describe('planSliceDraw', () => {
  const image = { width: 1000, height: 800 }

  it('places a later slice by the scroll offset actually reached', () => {
    const draw = planSliceDraw(
      { dataUrl: '', scrollY: 1200 },
      { x: 0, y: 0, width: 1000, height: 2000 },
      image,
      2,
    )
    expect(draw).toEqual({ sx: 0, sy: 0, width: 2000, height: 1600, dx: 0, dy: 2400 })
  })

  it('crops a selection out of the viewport', () => {
    const draw = planSliceDraw(
      { dataUrl: '', scrollY: 500, scrollX: 0 },
      { x: 100, y: 600, width: 200, height: 100 },
      image,
      1,
    )
    expect(draw).toEqual({ sx: 100, sy: 100, width: 200, height: 100, dx: 0, dy: 0 })
  })

  it('offsets an inner scroller by its viewport position', () => {
    const draw = planSliceDraw(
      { dataUrl: '', scrollY: 0, view: { x: 250, y: 60, width: 500, height: 700 } },
      { x: 0, y: 0, width: 500, height: 3000 },
      image,
      1,
    )
    expect(draw).toEqual({ sx: 250, sy: 60, width: 500, height: 700, dx: 0, dy: 0 })
  })
})
