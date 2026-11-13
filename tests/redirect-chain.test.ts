import { describe, expect, it } from 'vitest'

import {
  classifyKind,
  collectFlags,
  displayHref,
  filterCounts,
  formatChainText,
  matchesFilter,
  sortEntries,
  summarizeEntries,
  toTraceView,
  type RedirectEntry,
} from '@/core/engines/redirects/chain'
import { collectRedirectTargets, manualRedirectTarget, pageRedirectTarget } from '@/core/engines/redirects/targets'
import type { PageLink, PageLinksSnapshot } from '@/core/engines/links/pageLinks'

function link(partial: Partial<PageLink> & Pick<PageLink, 'index' | 'href' | 'kind'>): PageLink {
  let host = ''
  try {
    host = new URL(partial.href).hostname.replace(/^www\./, '')
  } catch {
    // mailto: and friends have no host.
  }
  return {
    rawHref: partial.href,
    text: 'Link',
    textSource: 'text',
    host,
    section: 'main',
    rel: [],
    nofollow: false,
    newTab: false,
    download: false,
    insecure: false,
    visible: true,
    anchorMissing: false,
    hasImage: false,
    ...partial,
  }
}

function entry(partial: Partial<RedirectEntry> & Pick<RedirectEntry, 'target'>): RedirectEntry {
  return { phase: 'done', ...partial }
}

describe('classifyKind', () => {
  it('treats a single 200 as direct', () => {
    expect(classifyKind({ hops: [{ url: 'https://a.test/', status: 200 }], redirected: false, status: 200 })).toBe('direct')
  })

  it('labels 301/308 chains as permanent', () => {
    expect(
      classifyKind({
        hops: [
          { url: 'https://a.test/', status: 301 },
          { url: 'https://a.test/home', status: 200 },
        ],
        redirected: true,
        status: 200,
      }),
    ).toBe('permanent')
  })

  it('labels 302/307 chains as temporary', () => {
    expect(
      classifyKind({
        hops: [
          { url: 'http://a.test/', status: 302 },
          { url: 'https://a.test/', status: 200 },
        ],
        redirected: true,
        status: 200,
      }),
    ).toBe('temporary')
  })

  it('labels mixed 301 then 302 as mixed', () => {
    expect(
      classifyKind({
        hops: [
          { url: 'https://a.test/x', status: 301 },
          { url: 'https://b.test/x', status: 302 },
          { url: 'https://b.test/y', status: 200 },
        ],
        redirected: true,
        status: 200,
      }),
    ).toBe('mixed')
  })

  it('prefers loop and error over redirect type', () => {
    expect(classifyKind({ hops: [], loop: true, redirected: true, status: 301 })).toBe('loop')
    expect(classifyKind({ hops: [{ url: 'https://a.test/', status: null }], timedOut: true, redirected: false, status: null })).toBe(
      'error',
    )
  })
})

describe('collectFlags', () => {
  it('detects protocol, host, path and query changes', () => {
    expect(collectFlags('http://www.a.test/old?x=1', 'https://b.test/new?y=2')).toEqual([
      'httpsUpgrade',
      'hostChange',
      'pathChange',
      'queryChange',
    ])
    expect(collectFlags('https://www.a.test/', 'https://a.test/')).toEqual(['wwwChange'])
  })
})

describe('toTraceView', () => {
  it('builds hop count, flags and copy text', () => {
    const view = toTraceView({
      href: 'http://a.test/go',
      hops: [
        { url: 'http://a.test/go', status: 301, durationMs: 12 },
        { url: 'https://a.test/home', status: 200, durationMs: 40 },
      ],
      finalUrl: 'https://a.test/home',
      status: 200,
      redirected: true,
    })
    expect(view.kind).toBe('permanent')
    expect(view.flags).toEqual(['httpsUpgrade', 'pathChange'])
    expect(view.durationMs).toBe(52)
    const row = entry({
      target: { url: 'http://a.test/go', text: 'Go', kind: 'internal', host: 'a.test', source: 'link', occurrences: [] },
      trace: view,
    })
    expect(formatChainText(row)).toBe('1. 301 http://a.test/go\n2. 200 https://a.test/home')
    expect(matchesFilter(row, 'redirects')).toBe(true)
    expect(matchesFilter(row, 'direct')).toBe(false)
  })
})

describe('summarize and sort', () => {
  it('counts and ranks loops ahead of direct hits', () => {
    const loop = entry({
      target: { url: 'https://a.test/loop', text: '', kind: 'internal', host: 'a.test', source: 'link', occurrences: [] },
      trace: toTraceView({
        href: 'https://a.test/loop',
        hops: [{ url: 'https://a.test/loop', status: 301 }],
        finalUrl: 'https://a.test/loop',
        status: 301,
        redirected: true,
        loop: true,
      }),
    })
    const direct = entry({
      target: { url: 'https://a.test/ok', text: '', kind: 'internal', host: 'a.test', source: 'link', occurrences: [] },
      trace: toTraceView({
        href: 'https://a.test/ok',
        hops: [{ url: 'https://a.test/ok', status: 200 }],
        finalUrl: 'https://a.test/ok',
        status: 200,
        redirected: false,
      }),
    })
    expect(summarizeEntries([loop, direct])).toEqual({ scanned: 2, redirects: 1, loops: 1, direct: 1, errors: 0 })
    expect(sortEntries([direct, loop])[0].target.url).toContain('/loop')
    expect(filterCounts([loop, direct]).redirects).toBe(1)
  })
})

describe('collectRedirectTargets', () => {
  const snapshot: PageLinksSnapshot = {
    url: 'https://example.com/page',
    title: 'Example',
    host: 'example.com',
    truncated: false,
    links: [
      link({ index: 0, href: 'https://example.com/page', kind: 'internal', text: 'Self' }),
      link({ index: 1, href: 'https://example.com/a', kind: 'internal', text: 'A' }),
      link({ index: 2, href: 'https://example.com/a#frag', kind: 'internal', text: 'A again' }),
      link({ index: 3, href: 'https://cdn.example.net/go', kind: 'external', text: 'CDN' }),
      link({ index: 4, href: 'https://example.com/page#top', kind: 'anchor', text: 'Top' }),
      link({ index: 5, href: 'mailto:hi@example.com', kind: 'email', text: 'Mail' }),
    ],
  }

  it('skips the page URL, anchors and non-http links, and merges duplicates', () => {
    const targets = collectRedirectTargets(snapshot)
    expect(targets.map((item) => item.url)).toEqual(['https://example.com/a', 'https://cdn.example.net/go'])
    expect(targets[0].occurrences).toHaveLength(2)
    expect(pageRedirectTarget(snapshot).source).toBe('page')
    expect(manualRedirectTarget('https://short.test/x#y')?.url).toBe('https://short.test/x')
    expect(manualRedirectTarget('javascript:void(0)')).toBeNull()
  })
})

describe('displayHref', () => {
  it('splits host and path for cards', () => {
    expect(displayHref('https://www.example.com/tools/qr')).toEqual({ host: 'example.com', path: '/tools/qr' })
  })
})
