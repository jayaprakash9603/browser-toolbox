import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildContentScripts } from '@/chrome/background/adblock/contentScripts'
import { selectScriptlets, type ScriptletShard } from '@/chrome/content/adblock/scriptlets/isolated'
import { SCRIPTLET_ATTR } from '@/chrome/content/adblock/scriptlets/protocol'
import { DEFAULT_ADBLOCK_STATE } from '@/core/adblock'
import { bloomHasBase64, type Base64Bloom } from '@/core/adblock/bloom'
import { hostShard } from '@/core/adblock/shard'
// @ts-expect-error build-time converter modules are plain ESM
import { buildBloom } from '../scripts/adblock/converter/bloom.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { createScriptletCollector, parseScriptletFilter, splitScriptletArgs } from '../scripts/adblock/converter/scriptlets.mjs'
import { makeHelpers } from '../scripts/adblock/scriptlets/helpers.mjs'
import { canonicalScriptletName, SCRIPTLETS } from '../scripts/adblock/scriptlets/library.mjs'

function run(name: string, ...args: string[]): void {
  const spec = SCRIPTLETS[name]
  spec.fn(makeHelpers(Boolean(spec.trusted)), ...args)
}

function toBase64Bloom(keys: string[]): Base64Bloom {
  const buffer = buildBloom(keys) as Uint8Array
  const view = new DataView(buffer.buffer)
  return { m: view.getUint32(0, true), k: view.getUint32(4, true), bits: Buffer.from(buffer.subarray(8)).toString('base64') }
}

/** Shards and bloom exactly as the list build writes them. */
function compile(lines: string[], ruleset = 'ads') {
  const collector = createScriptletCollector()
  for (const line of lines) collector.add(parseScriptletFilter(line, { trusted: true }), ruleset)
  const { byHost, disabledHosts } = collector.build() as { byHost: Map<string, unknown>; disabledHosts: string[] }
  const shards = new Map<number, ScriptletShard>()
  for (const [host, entries] of byHost) {
    const index = hostShard(host)
    shards.set(index, { ...shards.get(index), [host]: entries } as ScriptletShard)
  }
  const loads: number[] = []
  const load = (index: number) => {
    loads.push(index)
    return shards.get(index) ?? {}
  }
  return { byHost, disabledHosts, bloom: toBase64Bloom([...byHost.keys()]), load, loads }
}

const originals = {
  parse: JSON.parse,
  setTimeout: window.setTimeout,
  open: window.open,
  addEventListener: EventTarget.prototype.addEventListener,
}

afterEach(() => {
  JSON.parse = originals.parse
  window.setTimeout = originals.setTimeout
  window.open = originals.open
  EventTarget.prototype.addEventListener = originals.addEventListener
  for (const key of ['adsConfig', 'detector', 'blocker', 'nested', 'tbxHandoff']) {
    delete (window as unknown as Record<string, unknown>)[key]
  }
  document.cookie.split(';').forEach((c) => {
    document.cookie = `${c.split('=')[0].trim()}=; max-age=-1; path=/`
  })
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('scriptlet filter parsing', () => {
  it('splits uBO arguments with escapes and quotes', () => {
    expect(splitScriptletArgs('set, a.b, true')).toEqual(['set', 'a.b', 'true'])
    expect(splitScriptletArgs(String.raw`rmnt, script, /a\,b/`)).toEqual(['rmnt', 'script', '/a,b/'])
    expect(splitScriptletArgs(`nostif, '1, 2', 500`)).toEqual(['nostif', '1, 2', '500'])
    expect(splitScriptletArgs('nowoif')).toEqual(['nowoif'])
  })

  it('resolves aliases and the .js suffix', () => {
    expect(canonicalScriptletName('aopr')).toBe('abort-on-property-read')
    expect(canonicalScriptletName('set-constant.js')).toBe('set-constant')
    expect(canonicalScriptletName('nofab')).toBe('fuckadblock.js-3.2.0')
    expect(canonicalScriptletName('no-such-thing')).toBeNull()
  })

  it('parses hosts, negated hosts and entities', () => {
    expect(parseScriptletFilter('example.com,~sub.example.com,mirror.*##+js(aopr, adblock)')).toMatchObject({
      exception: false,
      name: 'abort-on-property-read',
      args: ['adblock'],
      hosts: ['example.com', 'mirror.*'],
      excluded: ['sub.example.com'],
    })
  })

  it('applies uBO validation rules', () => {
    expect(parseScriptletFilter('##+js(aopr, x)')).toEqual({ invalid: 'generic' })
    expect(parseScriptletFilter('a.com##+js(trusted-set-cookie, a, b)')).toEqual({ invalid: 'untrusted' })
    expect(parseScriptletFilter('a.com##+js(trusted-set-cookie, a, b)', { trusted: true })).toMatchObject({
      name: 'trusted-set-cookie',
    })
    expect(parseScriptletFilter('a.com>>##+js(aopr, x)')).toEqual({ invalid: 'frame-context' })
    expect(parseScriptletFilter('a.com##+js(spoof-css, x)')).toEqual({ invalid: 'unsupported' })
    expect(parseScriptletFilter('! a.com##+js(aopr, x)')).toBeNull()
    expect(parseScriptletFilter('a.com##.ad')).toBeNull()
    expect(parseScriptletFilter('a.com#@#+js()')).toMatchObject({ exception: true, all: true, hosts: ['a.com'] })
  })
})

describe('scriptlet selection for a page', () => {
  it('reads no shard for hosts outside the lists', () => {
    const { bloom, load, loads } = compile(['a.com##+js(aopr, x)'])
    expect(selectScriptlets('unlisted.org', bloom, [0], load)).toEqual([])
    expect(loads).toEqual([])
  })

  it('matches parent domains and entities, deduplicating identical calls', () => {
    const { bloom, load } = compile(['a.com##+js(aopr, x)', 'www.a.com,mirror.*##+js(aopr, x)', 'mirror.*##+js(nowoif)'])
    expect(selectScriptlets('www.a.com', bloom, [0], load)).toEqual([['abort-on-property-read', ['x']]])
    expect(selectScriptlets('mirror.co.uk', bloom, [0], load)).toEqual([
      ['abort-on-property-read', ['x']],
      ['no-window-open-if', []],
    ])
  })

  it('honours ~host, #@#+js(...) and #@#+js() exceptions', () => {
    const { bloom, load } = compile([
      'a.com,~shop.a.com##+js(aopr, x)',
      'a.com##+js(aopr, y)',
      'news.a.com#@#+js(aopr, y)',
      'b.com##+js(aopr, z)',
      'off.b.com#@#+js()',
    ])
    expect(selectScriptlets('shop.a.com', bloom, [0], load)).toEqual([['abort-on-property-read', ['y']]])
    expect(selectScriptlets('news.a.com', bloom, [0], load)).toEqual([['abort-on-property-read', ['x']]])
    expect(selectScriptlets('off.b.com', bloom, [0], load)).toEqual([])
    expect(selectScriptlets('b.com', bloom, [0], load)).toEqual([['abort-on-property-read', ['z']]])
  })

  it('only runs scriptlets from enabled lists', () => {
    const { bloom, load } = compile(['a.com##+js(trusted-click-element, #reject)'], 'annoyances')
    expect(selectScriptlets('a.com', bloom, [0, 1], load)).toEqual([])
    expect(selectScriptlets('a.com', bloom, [2], load)).toEqual([['trusted-click-element', ['#reject']]])
  })

  it('reads the inline base64 bloom exactly like the binary one', () => {
    const keys = Array.from({ length: 500 }, (_, i) => `host${i}.example`)
    const bloom = toBase64Bloom(keys)
    expect(keys.every((key) => bloomHasBase64(bloom, key))).toBe(true)
    const misses = Array.from({ length: 2000 }, (_, i) => `other${i}.test`).filter((key) => bloomHasBase64(bloom, key))
    expect(misses.length).toBeLessThan(60)
  })
})

describe('MAIN-world runner', () => {
  it('picks up calls the isolated bootstrap left on <html>', async () => {
    document.documentElement.setAttribute(SCRIPTLET_ATTR, JSON.stringify([['set-constant', ['tbxHandoff', 'true']]]))
    await import('@/chrome/content/adblock/scriptlets/main')
    expect(document.documentElement.hasAttribute(SCRIPTLET_ATTR)).toBe(false)
    expect((window as unknown as Record<string, unknown>).tbxHandoff).toBe(true)
  })
})

describe('scriptlets at runtime', () => {
  it('set-constant pins values, including on chains created later', () => {
    run('set-constant', 'adsConfig.enabled', 'false')
    run('set-constant', 'detector', 'noopFunc')
    const w = window as unknown as { adsConfig: { enabled: boolean }; detector: unknown }
    w.adsConfig = { enabled: true }
    expect(w.adsConfig.enabled).toBe(false)
    w.adsConfig.enabled = true
    expect(w.adsConfig.enabled).toBe(false)
    expect(typeof w.detector).toBe('function')
  })

  it('set-constant refuses arbitrary values unless trusted', () => {
    run('set-constant', 'blocker', '{"a":1}')
    expect('blocker' in window).toBe(false)
    run('trusted-set-constant', 'nested', '{"a":1}')
    expect((window as unknown as Record<string, unknown>).nested).toEqual({ a: 1 })
  })

  it('abort-on-property-read throws on access', () => {
    run('abort-on-property-read', 'blocker')
    expect(() => (window as unknown as Record<string, unknown>).blocker).toThrow(ReferenceError)
  })

  it('no-setTimeout-if neutralises matching callbacks only', async () => {
    const calls: string[] = []
    run('no-setTimeout-if', 'adblock', '')
    window.setTimeout(function adblockCheck() {
      calls.push('adblock')
    }, 0)
    window.setTimeout(function other() {
      calls.push('other')
    }, 0)
    await new Promise((resolve) => originals.setTimeout(resolve, 20))
    expect(calls).toEqual(['other'])
  })

  it('json-prune removes paths only when the needles are present', () => {
    run('json-prune', 'ads data.[].banner', 'playerResponse')
    expect(JSON.parse('{"playerResponse":1,"ads":[1],"data":[{"banner":1,"x":2}]}')).toEqual({
      playerResponse: 1,
      data: [{ x: 2 }],
    })
    expect(JSON.parse('{"ads":[1]}')).toEqual({ ads: [1] })
  })

  it('no-window-open-if returns an inert window for matching URLs', () => {
    const open = vi.fn(() => null)
    window.open = open as unknown as typeof window.open
    run('no-window-open-if', 'popunder')
    const fake = window.open('https://ads.example/popunder')
    expect(open).not.toHaveBeenCalled()
    expect(fake?.closed).toBe(false)
    window.open('https://example.com/')
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('addEventListener-defuser drops matching listeners', () => {
    run('addEventListener-defuser', 'click', 'popMagic')
    const el = document.createElement('div')
    const calls: string[] = []
    el.addEventListener('click', function popMagic() {
      calls.push('bad')
    })
    el.addEventListener('click', () => calls.push('good'))
    el.click()
    expect(calls).toEqual(['good'])
  })

  it('remove-attr and set-attr edit matching elements, never event handlers', () => {
    document.body.innerHTML = '<a id="x" onclick="track()" href="#">x</a><div id="y"></div>'
    run('remove-attr', 'onclick', '#x')
    run('set-attr', '#y', 'data-ok', 'true')
    run('trusted-set-attr', '#y', 'onclick', 'alert(1)')
    expect(document.getElementById('x')?.hasAttribute('onclick')).toBe(false)
    expect(document.getElementById('y')?.getAttribute('data-ok')).toBe('true')
    expect(document.getElementById('y')?.hasAttribute('onclick')).toBe(false)
  })

  it('set-cookie and set-local-storage-item only write safe values unless trusted', () => {
    run('set-cookie', 'consent', 'accepted')
    run('set-cookie', 'evil', '<script>')
    expect(document.cookie).toContain('consent=accepted')
    expect(document.cookie).not.toContain('evil')
    run('set-local-storage-item', 'seen', 'true')
    run('set-local-storage-item', 'x', 'arbitrary text')
    expect(localStorage.getItem('seen')).toBe('true')
    expect(localStorage.getItem('x')).toBeNull()
    run('trusted-set-local-storage-item', 'x', '{"v":1}')
    expect(localStorage.getItem('x')).toBe('{"v":1}')
  })
})

describe('scriptlet registration', () => {
  it('registers the bootstrap and runner on every page with the enabled lists', () => {
    const scripts = buildContentScripts({ ...DEFAULT_ADBLOCK_STATE, allowlist: ['shop.com'] })
    const isolated = scripts.find((s) => s.id === 'adblock-scriptlets-isolated')
    const main = scripts.find((s) => s.id === 'adblock-scriptlets-main')
    expect(isolated).toMatchObject({
      js: ['adblock/scriptlets/cfg/ads-privacy.js', 'adblock/scriptlets/bloom.js', 'adblock/scripts/scriptlets-isolated.js'],
      matches: ['<all_urls>'],
      excludeMatches: ['*://*.shop.com/*'],
      runAt: 'document_start',
      allFrames: true,
    })
    expect(isolated?.world).toBeUndefined()
    expect(main).toMatchObject({ js: ['adblock/scripts/scriptlets-main.js'], world: 'MAIN', runAt: 'document_start' })

    const withAnnoyances = buildContentScripts({ ...DEFAULT_ADBLOCK_STATE, cookieBanners: true })
    expect(withAnnoyances.find((s) => s.id === 'adblock-scriptlets-isolated')?.js?.[0]).toBe(
      'adblock/scriptlets/cfg/ads-privacy-annoyances.js',
    )
    const none = buildContentScripts({ ...DEFAULT_ADBLOCK_STATE, lists: { ...DEFAULT_ADBLOCK_STATE.lists, ads: false, privacy: false } })
    expect(none.some((s) => s.id.startsWith('adblock-scriptlets'))).toBe(false)
  })
})
