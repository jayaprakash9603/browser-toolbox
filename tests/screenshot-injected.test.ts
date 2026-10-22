import { describe, expect, it } from 'vitest'

import {
  collectPageMeta,
  disableSmoothScroll,
  hideFixedStickyAfterFirst,
  hideToolboxUi,
  prepareEntireCaptureScrollTarget,
  restoreCapturePageState,
  restoreToolboxUi,
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

  it('hides toolbox overlays during capture and restores them', async () => {
    const menu = document.createElement('div')
    menu.id = 'tbx-screenshot-menu-host'
    const toast = document.createElement('div')
    toast.id = 'tbx-interceptor-toasts'
    toast.style.visibility = 'visible'
    const style = document.createElement('style')
    style.id = 'toolbox-adblock-cosmetic'
    const pageContent = document.createElement('p')
    document.body.append(menu, toast, style, pageContent)

    const hidden = await serialized(hideToolboxUi)()

    expect(hidden).toBe(2)
    expect(menu.style.visibility).toBe('hidden')
    expect(toast.style.visibility).toBe('hidden')
    expect(style.style.visibility).toBe('')
    expect(pageContent.style.visibility).toBe('')

    serialized(restoreToolboxUi)()
    expect(menu.style.visibility).toBe('')
    expect(toast.style.visibility).toBe('visible')
    menu.remove()
    toast.remove()
    style.remove()
    pageContent.remove()
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
