import { afterEach, describe, expect, it } from 'vitest'

import { persistWorkspaceTab, readPdfWorkspaceMeta } from '@/tools/files/pdf-toolkit/workspace'

const META_KEY = 'pdf-toolkit.workspace'

describe('pdf toolkit workspace', () => {
  afterEach(() => {
    localStorage.removeItem(META_KEY)
  })

  it('persists the active tool tab for cross-tab restore', async () => {
    await persistWorkspaceTab('merge')
    expect(await readPdfWorkspaceMeta()).toMatchObject({ version: 1, tab: 'merge' })
  })

})