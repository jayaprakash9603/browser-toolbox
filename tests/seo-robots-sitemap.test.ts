import { describe, expect, it } from 'vitest'

import { parseRobotsTxt, robotsAllowsUrl } from '@/core/engines/seo/robots'
import { isSitemapIndex, parseSitemapLocs, sitemapContainsUrl } from '@/core/engines/seo/sitemap'

describe('robots.txt', () => {
  it('parses disallow and sitemap for * agent', () => {
    const txt = `User-agent: *
Disallow: /private/
Allow: /private/public.html
Sitemap: https://example.com/sitemap.xml`
    const parsed = parseRobotsTxt(txt)
    expect(parsed.sitemaps).toEqual(['https://example.com/sitemap.xml'])
    expect(parsed.rules.some((r) => r.directive === 'disallow' && r.path === '/private/')).toBe(true)
  })

  it('allows URL when not disallowed', () => {
    const txt = `User-agent: *
Disallow: /admin/`
    expect(robotsAllowsUrl(txt, 'https://example.com/blog/post')).toBe(true)
    expect(robotsAllowsUrl(txt, 'https://example.com/admin/secret')).toBe(false)
  })
})

describe('sitemap', () => {
  it('parses loc entries', () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://a.com/</loc></url></urlset>`
    expect(parseSitemapLocs(xml)).toEqual(['https://a.com/'])
  })

  it('detects sitemap index', () => {
    expect(isSitemapIndex('<sitemapindex></sitemapindex>')).toBe(true)
    expect(isSitemapIndex('<urlset></urlset>')).toBe(false)
  })

  it('checks URL membership', () => {
    const xml = `<urlset><url><loc>https://example.com/page</loc></url></urlset>`
    expect(sitemapContainsUrl(xml, 'https://example.com/page')).toBe(true)
    expect(sitemapContainsUrl(xml, 'https://example.com/other')).toBe(false)
  })
})
