import { afterEach, describe, expect, it, vi } from 'vitest'

import { FORM_MEMORY_PAGE_JS, runInTab } from '@/chrome/background/formMemory/inject'

type ExecuteScript = (injection: chrome.scripting.ScriptInjection<unknown[], unknown>) => Promise<unknown[]>

const scripting = chrome.scripting as unknown as { executeScript?: ExecuteScript }

function stubExecuteScript(run: ExecuteScript) {
  const executeScript = vi.fn(run)
  scripting.executeScript = executeScript
  return executeScript
}

const frame = (frameId: number, result: unknown) => ({ frameId, documentId: String(frameId), result })
const counts = { ok: true, filled: 1, cleared: 0, total: 2, populated: 1, matched: 1 }

describe('form memory injection', () => {
  afterEach(() => {
    delete scripting.executeScript
  })

  it('loads the page script before calling it and adds up every frame', async () => {
    const executeScript = stubExecuteScript(async (injection) =>
      injection.files ? [] : [frame(0, counts), frame(1, counts), frame(2, null)],
    )
    const result = await runInTab(7, { action: 'fill' })
    expect(executeScript.mock.calls[0][0]).toMatchObject({ target: { tabId: 7, allFrames: true }, files: [FORM_MEMORY_PAGE_JS] })
    expect(executeScript.mock.calls[1][0]).toMatchObject({ target: { tabId: 7, allFrames: true }, args: [{ action: 'fill' }] })
    expect(result).toMatchObject({ filled: 2, total: 4, populated: 2, matched: 2 })
  })

  it('falls back to the top frame when a child frame refuses', async () => {
    stubExecuteScript(async (injection) => {
      if ('allFrames' in injection.target) throw new Error('Cannot access contents of the page')
      return injection.files ? [] : [frame(0, counts)]
    })
    expect(await runInTab(7, { action: 'inspect' })).toMatchObject({ filled: 1, total: 2 })
  })

  it('reports no access when no frame answers', async () => {
    stubExecuteScript(async () => {
      throw new Error('Cannot access a chrome:// URL')
    })
    expect(await runInTab(7, { action: 'inspect' })).toBeNull()
  })
})
