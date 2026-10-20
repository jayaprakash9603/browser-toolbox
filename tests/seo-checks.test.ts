import { describe, expect, it } from 'vitest'

import { runAllSeoChecks } from '@/core/engines/seo/checks'
import { buildSeoReport } from '@/core/engines/seo/report'
import type { SeoNetworkContext, SeoPageData } from '@/core/engines/seo/types'

function minimalPage(overrides: Partial<SeoPageData> = {}): SeoPageData {
  return {
    url: 'https://example.com/page',
    title: 'Example Page Title',
    metaDescription: 'A reasonable meta description for the example page.',
    metaRobots: null,
    metaKeywords: null,
    canonical: 'https://example.com/page',
    language: 'en',
    charset: 'UTF-8',
    viewport: 'width=device-width, initial-scale=1',
    openGraph: { 'og:title': 'Example', 'og:description': 'Desc', 'og:image': 'https://example.com/i.jpg', 'og:url': 'https://example.com/page' },
    twitter: { 'twitter:card': 'summary' },
    links: [],
    images: [],
    headings: [{ level: 1, text: 'Main heading', index: 0 }],
    hreflangs: [],
    jsonLd: [],
    microdataItemCount: 0,
    rdfaCount: 0,
    favicon: '/favicon.ico',
    appleTouchIcon: null,
    themeColor: null,
    manifest: null,
    doctype: '<!DOCTYPE html>',
    metaRefresh: null,
    ampHtml: null,
    paginationPrev: null,
    paginationNext: null,
    scriptCount: 5,
    stylesheetCount: 2,
    inlineStyleBytes: 100,
    iframeCount: 0,
    embedCount: 0,
    objectCount: 0,
    renderBlockingScriptsInHead: 1,
    htmlBytes: 50_000,
    bodyText: 'word '.repeat(400).trim(),
    wordCount: 400,
    charCount: 2000,
    performance: { domContentLoaded: 800, loadEvent: 1200, ttfb: 120 },
    ...overrides,
  }
}

const network: SeoNetworkContext = {
  statusCode: 200,
  finalUrl: 'https://example.com/page',
  redirectCount: 0,
  xRobotsTag: null,
  contentType: 'text/html',
  contentLength: 40_000,
  contentEncoding: 'gzip',
  cacheControl: 'max-age=3600',
  robotsTxt: 'User-agent: *\nDisallow:',
  robotsAllowsUrl: true,
  robotsSitemaps: ['https://example.com/sitemap.xml'],
  sitemapContainsUrl: true,
  llmsTxt: null,
}

describe('seo checks', () => {
  it('runs many checks on a healthy page', () => {
    const checks = runAllSeoChecks(minimalPage(), network)
    expect(checks.length).toBeGreaterThan(50)
    expect(checks.filter((c) => c.id === 'title' && c.ok).length).toBe(1)
  })

  it('scores a report', () => {
    const report = buildSeoReport(minimalPage(), network)
    expect(report.score).toBeGreaterThan(50)
    expect(report.checks.length).toBeGreaterThan(50)
  })

  it('flags missing title', () => {
    const checks = runAllSeoChecks(minimalPage({ title: '' }), network)
    expect(checks.find((c) => c.id === 'title')?.ok).toBe(false)
  })
})
