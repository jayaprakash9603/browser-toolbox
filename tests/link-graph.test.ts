import { describe, expect, it } from 'vitest'

import { analyzeAnchorText, brandTermsFromGraph } from '@/core/engines/links/anchorIntel'
import { collectPageLinksFromHtml } from '@/core/engines/links/collectFromHtml'
import {
  applyLinkHealth,
  buildLinkGraph,
  graphPageKey,
  graphPagesFromSnapshot,
  type GraphPageInput,
} from '@/core/engines/links/graph'
import { layoutLinkGraph } from '@/core/engines/links/graphLayout'
import { hasRelFlag } from '@/core/engines/links/pageLinks'
import { classifyPageType } from '@/core/engines/links/pageType'

function page(url: string, html: string, title: string, depth = 0): GraphPageInput {
  const snapshot = collectPageLinksFromHtml(html, url, title)
  return { url, title, crawlDepth: depth, fetched: true, snapshot, canonical: snapshot.canonical, robots: snapshot.robots }
}

describe('classifyPageType', () => {
  it('uses the first path segment as a heuristic only', () => {
    expect(classifyPageType('https://ex.test/')).toBe('home')
    expect(classifyPageType('https://ex.test/blog/hello')).toBe('blog')
    expect(classifyPageType('https://ex.test/products/sku')).toBe('product')
    expect(classifyPageType('https://ex.test/category/shoes')).toBe('category')
    expect(classifyPageType('https://ex.test/about')).toBe('content')
  })
})

describe('rel flags', () => {
  it('treats sponsored and ugc as distinct from nofollow', () => {
    expect(hasRelFlag(['nofollow', 'noopener'], 'nofollow')).toBe(true)
    expect(hasRelFlag(['sponsored'], 'nofollow')).toBe(false)
    expect(hasRelFlag(['sponsored'], 'sponsored')).toBe(true)
    expect(hasRelFlag(['ugc'], 'ugc')).toBe(true)
  })
})

describe('buildLinkGraph', () => {
  const home = page(
    'https://ex.test/',
    `<html><head><link rel="canonical" href="https://ex.test/"></head><body>
      <a href="/about">About</a>
      <a href="/about" rel="nofollow">About again</a>
      <a href="https://partner.test/x" rel="sponsored">Partner</a>
      <a href="/secret">Secret</a>
      <a href="/click"><img src="x.png"></a>
    </body></html>`,
    'Example',
    0,
  )
  const about = page('https://ex.test/about', '<a href="/">Home</a><a href="https://partner.test/x">Out</a>', 'About', 1)
  const secret = page('https://ex.test/lonely', '<p>No inbound</p>', 'Lonely', 1)

  const graph = buildLinkGraph([home, about, secret], { startUrl: 'https://ex.test/' })

  it('records only real source-to-destination edges', () => {
    const pairs = graph.edges
      .filter((edge) => edge.linkType === 'internal' || edge.linkType === 'external')
      .map((edge) => `${edge.sourcePageId}->${edge.destinationUrl}`)
    expect(pairs).toEqual(
      expect.arrayContaining([
        `${graphPageKey('https://ex.test/')}->https://ex.test/about`,
        `${graphPageKey('https://ex.test/')}->https://partner.test/x`,
        `${graphPageKey('https://ex.test/about')}->https://ex.test/`,
      ]),
    )
    expect(pairs.some((pair) => pair.includes('random'))).toBe(false)
    expect(graph.nodes.some((node) => node.url.includes('placeholder'))).toBe(false)
  })

  it('keeps raw occurrences when grouping parallel edges', () => {
    const aboutEdges = graph.edges.filter((edge) => edge.destinationUrl === 'https://ex.test/about')
    const followed = aboutEdges.find((edge) => !edge.nofollow)
    const nofollow = aboutEdges.find((edge) => edge.nofollow)
    expect(followed?.occurrenceCount).toBe(1)
    expect(nofollow?.occurrenceCount).toBe(1)
    expect(nofollow?.anchorText).toBe('About again')
  })

  it('computes depth from the start page and flags fetched pages with no inbound links', () => {
    const homeNode = graph.nodes.find((node) => node.id === graph.homepageId)!
    const aboutNode = graph.nodes.find((node) => node.url.includes('/about'))!
    const lonely = graph.nodes.find((node) => node.url.includes('/lonely'))!
    expect(homeNode.linkDepth).toBe(0)
    expect(aboutNode.linkDepth).toBe(1)
    expect(lonely.isOrphan).toBe(true)
    expect(lonely.orphanConfidence).toBe('isolated')
    expect(lonely.linkDepth).toBeNull()
  })

  it('marks incomplete-crawl orphans without calling them confirmed isolates', () => {
    const incomplete = buildLinkGraph([home, secret], { startUrl: 'https://ex.test/', incomplete: true })
    const lonely = incomplete.nodes.find((node) => node.url.includes('/lonely'))!
    expect(lonely.isOrphan).toBe(true)
    expect(lonely.orphanConfidence).toBe('crawl-incomplete')
  })

  it('does not treat timeouts as broken', () => {
    const withHealth = applyLinkHealth(graph, (url) => {
      if (url.includes('partner.test')) return { href: url, text: '', status: null, ok: false, timedOut: true }
      if (url.includes('/about')) return { href: url, text: '', status: 200, ok: true }
      return undefined
    })
    const partner = withHealth.nodes.find((node) => node.isExternal)!
    const aboutNode = withHealth.nodes.find((node) => node.url.includes('/about'))!
    expect(partner.health).toBe('timeout')
    expect(aboutNode.health).toBe('ok')
    expect(withHealth.stats.brokenDestinations).toBe(0)
  })

  it('builds a current-page star from a single snapshot', () => {
    const snapshot = home.snapshot!
    const star = buildLinkGraph(graphPagesFromSnapshot(snapshot), { startUrl: snapshot.url })
    expect(star.nodes.some((node) => node.id === star.homepageId && node.fetched)).toBe(true)
    expect(star.edges.length).toBeGreaterThan(0)
    expect(star.stats.pages).toBeGreaterThan(0)
  })
})

describe('anchor intelligence', () => {
  it('reports empty, generic and image-without-alt anchors without penalty claims', () => {
    const snapshot = collectPageLinksFromHtml(
      `<a href="/a">Click here</a><a href="/b"><img src="x.png"></a><a href="/c">Example</a>`,
      'https://example.test/',
      'Example',
    )
    const graph = buildLinkGraph(graphPagesFromSnapshot(snapshot), { startUrl: snapshot.url })
    const report = analyzeAnchorText(graph, brandTermsFromGraph(graph))
    expect(report.generic).toBe(1)
    expect(report.imageMissingAlt).toBe(1)
    expect(report.empty).toBe(1)
    expect(report.insights.some((item) => item.branded && item.text === 'Example')).toBe(true)
  })
})

describe('graphPageKey', () => {
  it('keeps query strings only when asked', () => {
    expect(graphPageKey('https://x.test/a?id=1')).toBe(graphPageKey('https://x.test/a?id=2'))
    expect(graphPageKey('https://x.test/a?id=1', true)).not.toBe(graphPageKey('https://x.test/a?id=2', true))
    expect(graphPageKey('https://x.test/a#top')).toBe(graphPageKey('https://x.test/a'))
  })
})

describe('layoutLinkGraph', () => {
  it('places every node from the graph and no extras', () => {
    const snapshot = collectPageLinksFromHtml('<a href="/a">A</a><a href="https://out.test">O</a>', 'https://ex.test/', 'Home')
    const graph = buildLinkGraph(graphPagesFromSnapshot(snapshot), { startUrl: snapshot.url })
    const layout = layoutLinkGraph(graph, 'spherical')
    expect([...layout.keys()].sort()).toEqual(graph.nodes.map((node) => node.id).sort())
  })
})
