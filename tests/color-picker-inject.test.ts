import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const PICKER_JS = resolve(process.cwd(), 'public/inject/color-picker.js')
const source = readFileSync(PICKER_JS, 'utf8')

const text = {
  copied: 'Copied',
  copyFailed: 'Copy failed',
  hintPick: 'copy',
  hintZoom: 'zoom',
  hintFormat: 'format',
  hintKeep: 'keep picking',
  hintExit: 'exit',
  resultTitle: 'Picked color',
  copyHex: 'Copy HEX',
  copyRgb: 'Copy RGB',
  copyHsl: 'Copy HSL',
  copyHsv: 'Copy HSV',
  close: 'Close',
  shadesLabel: 'Shades',
  generatePalette: 'Generate palette',
  copyAgain: 'Copy again',
  pickPageAgain: 'Pick from page again',
  pickScreenAgain: 'Pick from screen again',
  clickToPick: 'Click to pick a color',
  clickToCancel: 'Esc to cancel',
}

function runPicker(
  opts: Record<string, unknown>,
  Eye?: { new (): { open(): Promise<{ sRGBHex: string }> } } | null,
) {
  const sendMessage = vi.fn(() => Promise.resolve({ ok: true }))
  vi.stubGlobal('chrome', { runtime: { sendMessage } })
  if (Eye) vi.stubGlobal('EyeDropper', Eye)
  else Reflect.deleteProperty(window, 'EyeDropper')
  ;(window as Window & { __TBX_COLOR_PICK__?: unknown }).__TBX_COLOR_PICK__ = { text, format: 'hex', ...opts }
  window.eval(source)
  return { sendMessage }
}

describe('color picker inject', () => {
  afterEach(() => {
    document.getElementById('tbx-color-picker-host')?.remove()
    document.getElementById('tbx-color-result-host')?.remove()
    Reflect.deleteProperty(window, 'EyeDropper')
    Reflect.deleteProperty(window, '__TBX_COLOR_PICK__')
    vi.unstubAllGlobals()
  })

  it('captures a tab screenshot for page pick when EyeDropper cannot start', () => {
    expect(source).toMatch(/forceLoupe/)
    expect(source).toMatch(/COLOR_PICK_LOUPE/)
    expect(source).toMatch(/userActivation/)
    expect(source).toMatch(/data-tbx-color-arm/)
  })

  it('asks the background for a loupe when EyeDropper is missing', () => {
    const { sendMessage } = runPicker({ mode: 'screen' }, null)
    expect(sendMessage).toHaveBeenCalledWith({ type: 'COLOR_PICK_LOUPE' })
    expect(document.querySelector('[data-tbx-color-arm]')).toBeNull()
  })

  it('arms a click-to-pick overlay when EyeDropper exists but the page has no user gesture', async () => {
    const open = vi.fn(() => Promise.resolve({ sRGBHex: '#0d0d0d' }))
    class EyeDropper {
      open() {
        return open()
      }
    }
    const { sendMessage } = runPicker({ mode: 'screen' }, EyeDropper)
    const host = document.querySelector('[data-tbx-color-arm]')
    const root = host?.shadowRoot?.querySelector('.root')
    expect(host).toBeTruthy()
    expect(open).not.toHaveBeenCalled()
    expect(sendMessage).not.toHaveBeenCalledWith({ type: 'COLOR_PICK_LOUPE' })

    root?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('does not fall back to the loupe when the user cancels EyeDropper', async () => {
    class EyeDropper {
      open() {
        return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      }
    }
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: true, hasBeenActive: true },
    })
    const { sendMessage } = runPicker({ mode: 'screen' }, EyeDropper)
    await Promise.resolve()
    await Promise.resolve()
    expect(sendMessage).not.toHaveBeenCalledWith({ type: 'COLOR_PICK_LOUPE' })
    expect(document.querySelector('[data-tbx-color-arm]')).toBeNull()
  })
})
