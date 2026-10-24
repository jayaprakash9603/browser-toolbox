import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/core/constants'
import { paletteIconPaths } from '@/shared/lib/theme/palettes'

import { resetChromeMockStorage } from './setup'

type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void

async function setup(palette: string, uiDark?: boolean) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: { palette },
    ...(uiDark === undefined ? {} : { [STORAGE_KEYS.uiDark]: uiDark }),
  })
  vi.resetModules()
  const listeners: StorageListener[] = []
  vi.spyOn(chrome.storage.onChanged, 'addListener').mockImplementation((fn) => {
    listeners.push(fn as unknown as StorageListener)
  })
  const mod = await import('@/chrome/background/toolbarIcon')
  mod.registerToolbarIcon()
  await mod.showToolbarStatus(null)
  const emit = async (key: string, newValue: unknown) => {
    listeners.forEach((fn) => fn({ [key]: { newValue } }, 'local'))
    await mod.showToolbarStatus(null)
  }
  return { emit }
}

const setIconCalls = () => vi.mocked(chrome.action.setIcon).mock.calls
const lastIcon = () => setIconCalls().at(-1)?.[0]

describe('toolbar icon', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.restoreAllMocks()
    Object.assign(chrome.action, { setIcon: vi.fn(async () => undefined) })
  })

  it('uses the light icon set of the stored palette by default', async () => {
    await setup('ocean')
    expect(lastIcon()).toEqual({ path: paletteIconPaths('ocean') })
  })

  it('uses the dark icon set when the UI is dark', async () => {
    await setup('ocean', true)
    expect(lastIcon()).toEqual({ path: paletteIconPaths('ocean', true) })
  })

  it('switches icon set when the palette changes and ignores unrelated settings writes', async () => {
    const { emit } = await setup('ocean')
    await emit(STORAGE_KEYS.settings, { palette: 'emerald' })
    expect(lastIcon()).toEqual({ path: paletteIconPaths('emerald') })

    const calls = setIconCalls().length
    await emit(STORAGE_KEYS.settings, { palette: 'emerald', density: 'compact' })
    expect(setIconCalls().length).toBe(calls)
  })

  it('switches between light and dark variants when the UI theme flips', async () => {
    const { emit } = await setup('sunset')
    await emit(STORAGE_KEYS.uiDark, true)
    expect(lastIcon()).toEqual({ path: paletteIconPaths('sunset', true) })
    await emit(STORAGE_KEYS.uiDark, false)
    expect(lastIcon()).toEqual({ path: paletteIconPaths('sunset') })
  })

  it('falls back to the default palette for unknown values', async () => {
    const { emit } = await setup('ocean')
    await emit(STORAGE_KEYS.settings, { palette: 'neon' })
    expect(lastIcon()).toEqual({ path: paletteIconPaths('indigo') })
  })
})
