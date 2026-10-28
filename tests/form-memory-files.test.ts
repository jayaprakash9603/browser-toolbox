import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FORM_FILE_PREFIX, loadFormFiles, pruneFormFiles, storeCapturedFiles } from '@/core/form-memory/files'
import { DEFAULT_FORM_MEMORY_STATE, type CapturedField, type MemoryField } from '@/core/form-memory/model'
import { resetChromeMockStorage } from './setup'

const local = chrome.storage.local as unknown as Record<string, unknown>

beforeEach(async () => {
  resetChromeMockStorage()
  const all = () => chrome.storage.local.get(null) as Promise<Record<string, unknown>>
  local.getKeys = vi.fn(async () => Object.keys(await all()))
  local.getBytesInUse = vi.fn(async () => 0)
})

const picked = (data: string, size = 5): CapturedField => ({
  key: 'file:cv',
  label: 'Resume',
  kind: 'file',
  value: ['cv.txt'],
  files: [{ name: 'cv.txt', type: 'text/plain', size, data }],
})

describe('form memory files', () => {
  it('stores picked files under their own keys and loads them back for a fill', async () => {
    const [field] = await storeCapturedFiles([picked(btoa('hello'))])
    expect(field.files).toBeUndefined()
    expect(field.display).toBe('cv.txt')
    const ids = field.value as string[]
    expect(ids).toHaveLength(1)
    const files = await loadFormFiles([{ ...field, updatedAt: 1 } as MemoryField])
    expect(files[ids[0]]).toEqual({ name: 'cv.txt', type: 'text/plain', data: btoa('hello') })
  })

  it('drops a capture whose files were all too large to keep', async () => {
    expect(await storeCapturedFiles([picked('x', 5 * 1024 * 1024)])).toEqual([])
  })

  it('prunes files nothing points at once they are no longer fresh', async () => {
    await storeCapturedFiles([picked(btoa('hello'))])
    await pruneFormFiles(DEFAULT_FORM_MEMORY_STATE)
    expect((await chrome.storage.local.getKeys()).some((key) => key.startsWith(FORM_FILE_PREFIX))).toBe(true)
    await pruneFormFiles(DEFAULT_FORM_MEMORY_STATE, Date.now() + 120_000)
    expect((await chrome.storage.local.getKeys()).some((key) => key.startsWith(FORM_FILE_PREFIX))).toBe(false)
  })
})
