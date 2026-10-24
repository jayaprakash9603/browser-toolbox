import { afterEach, describe, expect, it } from 'vitest'

import { collectPageLinks } from '@/chrome/content/collectors/links'
import {
  classifyHref,
  countByType,
  countFlags,
  duplicateHrefSet,
  groupByDomain,
  groupBySection,
  hasFlag,
  linksToCsv,
  linksToMarkdown,
  matchesSearch,
  splitUrl,
  toEntries,
  type PageLink,
} from '@/core/engines/links/pageLinks'

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
    ...partial,
  }
}

describe('classifyHref', () => {
  const page = 'https://www.example.com/guide?x=1'

  it('recognises non-web schemes', () => {
    expect(classifyHref('mailto:hi@example.com', 'mailto:hi@example.com', page)).toBe('email')
    expect(classifyHref('tel:+15550100', 'tel:+15550100', page)).toBe('phone')
    expect(classifyHref('javascript:void(0)', 'javascript:void(0)', page)).toBe('script')
    expect(classifyHref('ftp://files.example.com/a', 'ftp://files.example.com/a', page)).toBe('other')
  })

  it('treats fragments on the same page as anchors', () => {
    expect(classifyHref('#faq', 'https://www.example.com/guide?x=1#faq', page)).toBe('anchor')
    expect(classifyHref('/guide?x=1#faq', 'https://www.example.com/guide?x=1#faq', page)).toBe('anchor')
    expect(classifyHref('/other#faq', 'https://www.example.com/other#faq', page)).toBe('internal')
  })

  it('ignores www when comparing hosts', () => {
    expect(classifyHref('https://example.com/a', 'https://example.com/a', page)).toBe('internal')
    expect(classifyHref('https://blog.example.com/a', 'https://blog.example.com/a', page)).toBe('external')
    expect(classifyHref('https://github.com/acme', 'https://github.com/acme', page)).toBe('external')
  })
})

describe('splitUrl', () => {
  it('separates host from a decoded path', () => {
    expect(splitUrl({ href: 'https://www.example.com/caf%C3%A9?q=1', kind: 'internal', rawHref: '' })).toEqual({
      host: 'example.com',
      path: '/café?q=1',
    })
    expect(splitUrl({ href: 'https://example.com/', kind: 'internal', rawHref: '/' })).toEqual({ host: 'example.com', path: '' })
    expect(splitUrl({ href: 'mailto:hi@example.com', kind: 'email', rawHref: 'mailto:hi@example.com' })).toEqual({
      host: 'mailto:',
      path: 'hi@example.com',
    })
  })
})

describe('collectPageLinks', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('reads labels, sections and link attributes from the DOM', () => {
    document.body.innerHTML = `
      <header><a href="/">Home</a></header>
      <nav><a href="/docs">Docs</a><a href="/docs" aria-label="Documentation"><svg></svg></a></nav>
      <main>
        <h2 id="intro">Intro</h2>
        <a href="#intro">Jump to intro</a>
        <a href="#missing">Broken jump</a>
        <a href="https://partner.example.org/x" target="_blank" rel="nofollow noopener">Partner</a>
        <a href="/files/brochure.pdf"><img alt="Brochure" src="data:,"></a>
        <a href="/empty"></a>
      </main>
      <aside><a href="mailto:hi@example.com">Email</a></aside>
      <footer><a href="tel:+15550100" title="Call us"></a></footer>
    `
    const snapshot = collectPageLinks(document)
    const byText = (text: string) => snapshot.links.find((item) => item.text === text)!

    expect(snapshot.links).toHaveLength(10)
    expect(snapshot.truncated).toBe(false)
    expect(byText('Home')).toMatchObject({ kind: 'internal', section: 'header' })
    expect(byText('Documentation')).toMatchObject({ textSource: 'aria', section: 'nav' })
    expect(byText('Jump to intro')).toMatchObject({ kind: 'anchor', anchorMissing: false })
    expect(byText('Broken jump')).toMatchObject({ kind: 'anchor', anchorMissing: true })
    expect(byText('Partner')).toMatchObject({ kind: 'external', newTab: true, nofollow: true, rel: ['nofollow', 'noopener'] })
    expect(byText('Brochure')).toMatchObject({ textSource: 'image', download: true })
    expect(byText('Email')).toMatchObject({ kind: 'email', section: 'aside' })
    expect(byText('Call us')).toMatchObject({ kind: 'phone', textSource: 'title', section: 'footer' })
    expect(snapshot.links.find((item) => item.rawHref === '/empty')).toMatchObject({ text: '', textSource: 'none' })
  })
})

describe('link model', () => {
  const links = [
    link({ index: 0, href: 'https://example.com/', kind: 'internal', text: 'Home', section: 'header' }),
    link({ index: 1, href: 'https://example.com/docs', kind: 'internal', text: 'Docs', section: 'nav' }),
    link({ index: 2, href: 'https://example.com/docs', kind: 'internal', text: 'Read the docs' }),
    link({ index: 3, href: 'https://github.com/acme', kind: 'external', text: 'GitHub', section: 'footer', newTab: true }),
    link({ index: 4, href: 'https://example.com/#faq', kind: 'anchor', text: 'FAQ', host: 'example.com' }),
    link({ index: 5, href: 'mailto:hi@example.com', kind: 'email', text: 'Email', section: 'footer' }),
    link({ index: 6, href: 'https://example.com/icon', kind: 'internal', text: '', textSource: 'none', visible: false }),
  ]

  it('merges repeated URLs and keeps every occurrence', () => {
    const merged = toEntries(links, true)
    expect(merged).toHaveLength(6)
    expect(merged.find((entry) => entry.key === 'https://example.com/docs')?.occurrences.map((item) => item.index)).toEqual([1, 2])
    expect(toEntries(links, false)).toHaveLength(7)
  })

  it('counts types and flags', () => {
    expect(countByType(links)).toEqual({ all: 7, internal: 4, external: 1, anchor: 1, contact: 1, other: 0 })
    const duplicates = duplicateHrefSet(links)
    const unmerged = toEntries(links, false)
    expect(unmerged.filter((entry) => hasFlag(entry, 'duplicates', duplicates))).toHaveLength(2)
    const flags = countFlags(toEntries(links, true), duplicates, (href) =>
      href.includes('github') ? { checking: false, status: 404, ok: false } : undefined,
    )
    expect(flags).toMatchObject({ duplicates: 1, noText: 1, hidden: 1, newTab: 1, broken: 1, nofollow: 0 })
  })

  it('searches text and URLs of every occurrence', () => {
    const entry = toEntries(links, true).find((item) => item.key === 'https://example.com/docs')!
    expect(matchesSearch(entry, 'read docs')).toBe(true)
    expect(matchesSearch(entry, 'example.com/docs')).toBe(true)
    expect(matchesSearch(entry, 'github')).toBe(false)
  })

  it('groups by destination with this site first', () => {
    const groups = groupByDomain(toEntries(links, true))
    expect(groups.map((group) => [group.kind, group.entries.length])).toEqual([
      ['site', 3],
      ['page', 1],
      ['domain', 1],
      ['email', 1],
    ])
    expect(groupBySection(toEntries(links, true)).map((group) => group.key)).toEqual(['header', 'nav', 'main', 'footer'])
  })

  it('exports CSV safely and Markdown with escaped labels', () => {
    const risky = [
      link({ index: 0, href: 'https://example.com/a', kind: 'internal', text: '=HYPERLINK("x")' }),
      link({ index: 1, href: 'https://example.com/b(1)', kind: 'internal', text: 'See [docs], now' }),
    ]
    const csv = linksToCsv(toEntries(risky, true), (href) => (href.endsWith('/a') ? { checking: false, status: 200, ok: true } : undefined))
    const [header, first, second] = csv.split('\n')
    expect(header).toBe('url,text,type,section,rel,new_tab,occurrences,status')
    expect(first).toBe(`https://example.com/a,"'=HYPERLINK(""x"")",internal,main,,false,1,200`)
    expect(second).toBe('https://example.com/b(1),"See [docs], now",internal,main,,false,1,')
    expect(linksToMarkdown(toEntries(risky, true))).toBe(
      '- [=HYPERLINK("x")](https://example.com/a)\n- [See \\[docs\\], now](https://example.com/b(1%29)',
    )
  })
})
