import { beforeAll, describe, expect, it, vi } from 'vitest'

const nativeOpen = vi.fn(() => ({ native: true }) as unknown as Window)
const listeners = new Map<string, (event: unknown) => void>()

/** jsdom marks every dispatched event untrusted, so drive the captured listener directly. */
function userClick(target: Element, isTrusted = true): void {
  listeners.get('click')?.({
    isTrusted,
    target,
    composedPath: () => [target],
    preventDefault() {},
    stopImmediatePropagation() {},
  })
}

describe('pop-up blocker (page world)', () => {
  beforeAll(async () => {
    window.open = nativeOpen as unknown as typeof window.open
    const original = window.addEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, handler: never, opts: never) => {
      if (type === 'pointerdown' || type === 'click') {
        // the recorder and the overlay guard both listen for click; keep the recorder (registered first)
        if (!listeners.has(type)) listeners.set(type, handler)
      }
      return original(type, handler, opts)
    }) as typeof window.addEventListener)
    await import('@/chrome/content/adblock/popups-main')
  })

  it('blocks window.open that is not tied to a click and returns a harmless stub', () => {
    const popup = window.open('https://ads.example.net/landing')
    expect(nativeOpen).not.toHaveBeenCalled()
    expect(popup).toBeTruthy()
    expect(() => {
      popup?.focus()
      popup?.close()
    }).not.toThrow()
  })

  it('allows one window per real click on a real control', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    userClick(button)
    window.open('https://example.org/share')
    expect(nativeOpen).toHaveBeenCalledTimes(1)
    window.open('https://ads.example.net/second-window-from-same-click')
    expect(nativeOpen).toHaveBeenCalledTimes(1)
  })

  it('ignores scripted clicks that are not trusted', async () => {
    nativeOpen.mockClear()
    await new Promise((resolve) => setTimeout(resolve, 1300))
    const button = document.createElement('button')
    document.body.appendChild(button)
    userClick(button, false)
    window.open('https://ads.example.net/fake-click')
    expect(nativeOpen).not.toHaveBeenCalled()
  })

  it('ignores clicks on the bare page background', async () => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    userClick(document.body)
    window.open('https://ads.example.net/click-anywhere')
    expect(nativeOpen).not.toHaveBeenCalled()
  })

  it('lets the page open its own site a while after an interaction, once', async () => {
    nativeOpen.mockClear()
    await new Promise((resolve) => setTimeout(resolve, 800))
    userClick(document.body)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    window.open(`${location.origin}/report`)
    expect(nativeOpen).toHaveBeenCalledTimes(1)
    window.open(`${location.origin}/second`)
    expect(nativeOpen).toHaveBeenCalledTimes(1)
  })

  it('always lets sign-in providers open', () => {
    window.open('https://accounts.google.com/o/oauth2/auth')
    expect(nativeOpen).toHaveBeenCalledTimes(1)
  })

  it('blocks hidden target=_blank anchors that scripts click', () => {
    const anchor = document.createElement('a')
    anchor.href = 'https://ads.example.net/pop'
    anchor.target = '_blank'
    const click = vi.fn()
    anchor.addEventListener('click', click)
    anchor.click()
    expect(click).not.toHaveBeenCalled()
  })
})
