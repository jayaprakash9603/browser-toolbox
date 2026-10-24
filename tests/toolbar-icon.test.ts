import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/core/constants'
import { paletteIconPaths } from '@/shared/lib/theme/palettes'

import { resetChromeMockStorage } from './setup'

type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void

async function setup(palette: string) {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: { palette } })
  vi.resetModules()
  const listeners: StorageListener[] = []
  vi.spyOn(chrome.storage.onChanged, 'addListener').mockImplementation((fn) => {
    listeners.push(fn as unknown as StorageListener)
  })
  const mod = await import('@/chrome/background/toolbarIcon')
  mod.registerToolbarIcon()
  await mod.showToolbarStatus(null)
  return { mod, emit: (change: chrome.storage.StorageChange) => listeners.forEach((fn) => fn({ [STORAGE_KEYS.settings]: change }, 'local')) }
}

const lastIcon = () => vi.mocked(chrome.action.setIcon).mock.calls.at(-1)?.[0]

describe('toolbar icon', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.restoreAllMocks()
    Object.assign(chrome.action, { setIcon: vi.fn(async () => undefined) })
  })

  it('uses the icon set of the stored palette', async () => {
    await setup('ocean')
    expect(lastIcon()).toEqual({ path: paletteIconPaths('ocean') })
  })

  it('switches icon set when the palette changes and ignores unrelated settings writes', async () => {
    const { mod, emit } = await setup('ocean')
    emit({ newValue: { palette: 'emerald' } })
    await mod.showToolbarStatus(null)
    expect(lastIcon()).toEqual({ path: paletteIconPaths('emerald') })

    const calls = vi.mocked(chrome.action.setIcon).mock.calls.length
    emit({ newValue: { palette: 'emerald', density: 'compact' } })
    await mod.showToolbarStatus(null)
    expect(vi.mocked(chrome.action.setIcon).mock.calls.length).toBe(calls)
  })

  it('falls back to the default palette for unknown values', async () => {
    const { mod, emit } = await setup('ocean')
    emit({ newValue: { palette: 'neon' } })
    await mod.showToolbarStatus(null)
    expect(lastIcon()).toEqual({ path: paletteIconPaths('indigo') })
  })
})
