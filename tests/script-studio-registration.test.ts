import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildRegistrationBundle, buildRelaySource } from '@/core/script-studio/registration'
import { mergeScriptRun } from '@/core/script-studio/runs'
import { DEFAULT_SCRIPT_STUDIO_SETTINGS } from '@/core/script-studio/settings'
import type { ScriptRecord } from '@/core/script-studio'

const SAMPLE = `// ==UserScript==
// @name Test
// @namespace https://example.com/
// @version 1.0.0
// @match https://example.com/*
// @grant GM_addStyle
// ==/UserScript==
console.log(1);
`

const record: ScriptRecord = {
  id: 'r1',
  uuid: 'r1',
  enabled: true,
  trashed: false,
  position: 1,
  createdAt: 1,
  updatedAt: 1,
  overrides: {},
  size: 100,
  name: 'Test',
  version: '1.0.0',
}

describe('script-studio registration', () => {
  it('builds USER_SCRIPT bundle for granted script', () => {
    const bundle = buildRegistrationBundle(
      record,
      SAMPLE,
      {},
      [],
      '// runtime',
      DEFAULT_SCRIPT_STUDIO_SETTINGS,
      '0.1.0',
    )
    expect(bundle?.world).toBe('USER_SCRIPT')
    expect(bundle?.matches.some((m) => m.includes('example.com'))).toBe(true)
    expect(bundle?.code).toContain('GM_addStyle')
  })

  it('uses MAIN for @grant none', () => {
    const none = SAMPLE.replace('@grant GM_addStyle', '@grant none')
    const bundle = buildRegistrationBundle(
      record,
      none,
      {},
      [],
      '// runtime',
      DEFAULT_SCRIPT_STUDIO_SETTINGS,
      '0.1.0',
    )
    expect(bundle?.world).toBe('MAIN')
  })
})

function build(source: string) {
  return buildRegistrationBundle(record, source, {}, [], '', DEFAULT_SCRIPT_STUDIO_SETTINGS, '0.1.0', 'n0nce')!
}

describe('script-studio execution reporting', () => {
  const sendMessage = vi.fn()
  beforeEach(() => {
    sendMessage.mockReset()
    vi.stubGlobal('chrome', { runtime: { sendMessage } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reports success from the isolated world', () => {
    new Function(build(SAMPLE).code)()
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SS_GM_BRIDGE', sub: 'report', scriptId: 'r1', payload: expect.objectContaining({ status: 'ok' }) }),
    )
  })

  it('reports and rethrows errors', () => {
    const broken = SAMPLE.replace('console.log(1);', 'throw new TypeError("boom");')
    expect(() => new Function(build(broken).code)()).toThrow('boom')
    const payload = sendMessage.mock.calls[0][0].payload
    expect(payload.status).toBe('error')
    expect(payload.error).toContain('boom')
  })

  it('routes page-world reports through the relay', () => {
    const none = SAMPLE.replace('@grant GM_addStyle', '@grant none')
    new Function(buildRelaySource('n0nce'))()
    new Function(build(none).code)()
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage.mock.calls[0][0]).toMatchObject({ sub: 'report', scriptId: 'r1', payload: { status: 'ok' } })
  })

  it('skips the body and the report when a runtime @include regex does not match', () => {
    const guarded = SAMPLE.replace('// @match https://example.com/*', '// @include /^https:\\/\\/nowhere\\.test\\//')
    const bundle = build(guarded)
    expect(bundle.code).toContain('if((function(){')
    new Function(bundle.code)()
    expect(sendMessage).not.toHaveBeenCalled()
  })
})

describe('mergeScriptRun', () => {
  it('counts runs, tracks frames, and keeps a frame error visible', () => {
    const first = mergeScriptRun(undefined, 's', { status: 'ok', durationMs: 4.4, url: 'https://a.test/', top: true }, 100)
    expect(first).toMatchObject({ status: 'ok', runs: 1, frameRuns: 0, durationMs: 4, firstRunAt: 100 })
    const frame = mergeScriptRun(first, 's', { status: 'error', error: 'x', url: 'https://f.test/', top: false }, 200)
    expect(frame).toMatchObject({ status: 'error', error: 'x', runs: 2, frameRuns: 1, url: 'https://a.test/', lastRunAt: 200 })
    expect(mergeScriptRun(frame, 's', { status: 'ok', top: true }, 300).status).toBe('error')
  })

  it('stores result notes without counting them as runs', () => {
    const early = mergeScriptRun(undefined, 's', { kind: 'note', note: ' Ready ', url: 'https://a.test/' }, 50)
    expect(early).toMatchObject({ runs: 0, note: 'Ready', noteAt: 50 })
    const ran = mergeScriptRun(early, 's', { status: 'ok', top: true }, 60)
    expect(ran).toMatchObject({ runs: 1, firstRunAt: 50, note: 'Ready' })
    expect(mergeScriptRun(ran, 's', { kind: 'note', note: 'Copied 12 words' }, 70)).toMatchObject({ runs: 1, note: 'Copied 12 words', noteAt: 70 })
    expect(mergeScriptRun(ran, 's', { kind: 'note', note: 'frame', top: false }, 80).note).toBe('Ready')
  })
})

describe('script result notes', () => {
  const sendMessage = vi.fn()
  beforeEach(() => {
    sendMessage.mockReset()
    vi.stubGlobal('chrome', { runtime: { sendMessage } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lets a script describe its outcome with __ssNote', () => {
    new Function(build(SAMPLE.replace('console.log(1);', '__ssNote("Did it");')).code)()
    expect(sendMessage.mock.calls[0][0].payload).toMatchObject({ kind: 'note', note: 'Did it' })
    expect(sendMessage.mock.calls[1][0].payload).toMatchObject({ status: 'ok' })
  })
})
