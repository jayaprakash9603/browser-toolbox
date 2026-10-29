import { describe, expect, it } from 'vitest'

import { TECH_CATEGORIES } from '@/core/engines/techStack/categories'
import { detectTechnologies, groupHitsByCategory } from '@/core/engines/techStack/detect'
import { techScanFilename, techScanToCsv, techScanToJson } from '@/core/engines/techStack/export'
import { TECH_RULES } from '@/core/engines/techStack/rules'
import type { PageSignals, TechHit, TechScan } from '@/core/engines/techStack/types'

function signals(partial: Partial<PageSignals>): PageSignals {
  return {
    url: 'https://example.com/',
    scripts: [],
    resources: [],
    inlineScripts: '',
    meta: {},
    headers: {},
    cookies: [],
    jsValues: {},
    domMatches: [],
    html: '',
    ...partial,
  }
}

function find(partial: Partial<PageSignals>, name: string) {
  return detectTechnologies(signals(partial)).find((hit) => hit.name === name)
}

function names(partial: Partial<PageSignals>): string[] {
  return detectTechnologies(signals(partial)).map((hit) => hit.name)
}

const emptyFacts: TechScan['facts'] = {
  title: '',
  description: '',
  language: '',
  charset: '',
  canonical: '',
  generator: '',
  social: [],
  emails: [],
  phones: [],
  feeds: [],
  counts: { scripts: 0, stylesheets: 0, images: 0, links: 0, forms: 0, iframes: 0 },
}

describe('tech stack rules', () => {
  it('covers a broad catalogue', () => {
    expect(TECH_RULES.length).toBeGreaterThanOrEqual(400)
  })

  it('has unique names and known categories and implications', () => {
    const ruleNames = TECH_RULES.map((rule) => rule.name)
    expect(new Set(ruleNames).size).toBe(ruleNames.length)
    const categories = new Set(TECH_CATEGORIES.map((category) => category.id))
    for (const rule of TECH_RULES) {
      expect(categories.has(rule.category), rule.name).toBe(true)
      for (const implied of rule.implies ?? []) expect(ruleNames, `${rule.name} implies ${implied}`).toContain(implied)
      for (const excluded of rule.excludes ?? []) expect(ruleNames, `${rule.name} excludes ${excluded}`).toContain(excluded)
    }
  })

  it('only contains patterns that compile', () => {
    const sources = TECH_RULES.flatMap((rule) => [
      ...(rule.src ?? []),
      ...(rule.url ?? []),
      ...(rule.inline ?? []),
      ...(rule.html ?? []),
      ...(rule.cookies ?? []),
      ...Object.values(rule.meta ?? {}),
      ...Object.values(rule.headers ?? {}),
      ...Object.values(rule.js ?? {}),
    ])
    for (const source of sources) expect(() => new RegExp(source, 'i'), source).not.toThrow()
  })
})

describe('detectTechnologies', () => {
  it('reads versions from globals and script URLs', () => {
    expect(find({ jsValues: { 'React.version': '18.2.0' } }, 'React')?.version).toBe('18.2.0')
    expect(find({ scripts: ['https://code.jquery.com/jquery-3.7.1.min.js'] }, 'jQuery')?.version).toBe('3.7.1')
  })

  it('detects React without window.React via DevTools hook, markup, and bundles', () => {
    expect(find({ jsValues: { __REACT_DEVTOOLS_GLOBAL_HOOK__: '' } }, 'React')).toBeDefined()
    expect(find({ jsValues: { __REACT_DEVTOOLS_GLOBAL_HOOK__: '', 'React.version': '19.1.0' } }, 'React')?.version).toBe(
      '19.1.0',
    )
    expect(find({ domMatches: ['div[id*="react-root"]'] }, 'React')).toBeDefined()
    expect(find({ domMatches: ['body > div._reactRootContainer'] }, 'React')).toBeDefined()
    expect(find({ html: '<div id="root" data-reactroot="">' }, 'React')).toBeDefined()
    expect(
      find({ inlineScripts: 'import{createRoot}from"react-dom/client";__REACT_DEVTOOLS_GLOBAL_HOOK__' }, 'React'),
    ).toBeDefined()
    expect(find({ meta: { description: 'Web site created using create-react-app' } }, 'React')).toBeDefined()
  })

  it('does not mistake similarly named files for a technology', () => {
    expect(find({ scripts: ['https://cdn.example.com/preact.min.js'] }, 'React')).toBeUndefined()
    expect(find({ scripts: ['https://cdn.example.com/image/photo.js'] }, 'Magento')).toBeUndefined()
  })

  it('drops React when Preact is also present', () => {
    const hits = detectTechnologies(
      signals({
        html: '<div data-reactroot="">',
        scripts: ['https://cdn.example.com/preact.min.js'],
      }),
    )
    expect(hits.find((hit) => hit.name === 'Preact')).toBeDefined()
    expect(hits.find((hit) => hit.name === 'React')).toBeUndefined()
  })

  it('keeps all evidence channels and scores complementary sources higher', () => {
    const hit = find(
      {
        jsValues: { 'React.version': '18.2.0' },
        scripts: ['https://unpkg.com/react@18.2.0/umd/react.production.min.js'],
      },
      'React',
    )
    expect(hit?.evidenceItems.map((item) => item.type).sort()).toEqual(['js', 'url'])
    expect(hit?.confidence).toBeGreaterThan(0.95)
    expect(hit?.confidenceLevel).toBe('high')
  })

  it('labels html-only detections as low confidence', () => {
    const hit = find({ html: '<div data-reactroot="">' }, 'React')
    expect(hit?.confidenceLevel).toBe('low')
    expect(hit?.confidence).toBe(0.4)
  })

  it('records a version conflict instead of silently picking one', () => {
    const hit = find(
      {
        jsValues: { 'React.version': '18.2.0' },
        scripts: ['https://unpkg.com/react@19.0.0/react.production.min.js'],
      },
      'React',
    )
    expect(hit?.version).toBeUndefined()
    expect(hit?.evidenceItems.some((item) => item.detail.includes('version conflict'))).toBe(true)
  })

  it('matches distinctive page URL patterns', () => {
    expect(find({ url: 'https://shop.example.com/wp-content/themes/store/' }, 'WordPress')).toBeDefined()
    expect(find({ url: 'https://app.example.com/_next/static/chunks/main.js' }, 'Next.js')).toBeDefined()
    expect(find({ url: 'https://store.myshopify.com/products/hat' }, 'Shopify')).toBeDefined()
  })

  it('adds implied technologies and marks them', () => {
    const hits = detectTechnologies(signals({ meta: { generator: 'WordPress 6.5.2' } }))
    expect(hits.find((hit) => hit.name === 'WordPress')?.version).toBe('6.5.2')
    expect(hits.find((hit) => hit.name === 'PHP')).toMatchObject({
      implied: true,
      evidence: 'implied by WordPress',
      confidence: 0.5,
      confidenceLevel: 'low',
    })
    expect(hits.find((hit) => hit.name === 'MySQL')?.implied).toBe(true)
  })

  it('implies through several levels without duplicating direct hits', () => {
    const hits = detectTechnologies(signals({ jsValues: { __NEXT_DATA__: '', 'React.version': '19.0.0' } }))
    expect(hits.filter((hit) => hit.name === 'React')).toHaveLength(1)
    expect(hits.find((hit) => hit.name === 'React')?.implied).toBeUndefined()
    expect(hits.find((hit) => hit.name === 'Node.js')?.implied).toBe(true)
  })

  it('labels Google Analytics generations', () => {
    expect(find({ scripts: ['https://www.googletagmanager.com/gtag/js?id=G-ABC123'] }, 'Google Analytics')?.version).toBe('GA4')
    expect(find({ scripts: ['https://www.googletagmanager.com/gtag/js?id=UA-1234-1'] }, 'Google Analytics')?.version).toBe('Universal')
  })

  it('detects infrastructure from response headers and cookies', () => {
    const hits = detectTechnologies(
      signals({
        headers: { server: 'nginx/1.25.3', 'cf-ray': '8a1b2c', 'strict-transport-security': 'max-age=63072000' },
        cookies: ['__cf_bm', 'PHPSESSID'],
      }),
    )
    expect(hits.find((hit) => hit.name === 'Nginx')?.version).toBe('1.25.3')
    expect(hits.some((hit) => hit.name === 'Cloudflare')).toBe(true)
    expect(hits.some((hit) => hit.name === 'HSTS')).toBe(true)
    expect(hits.some((hit) => hit.name === 'PHP')).toBe(true)
  })

  it('detects UI frameworks from DOM selectors and markup like Wappalyzer', () => {
    expect(find({ domMatches: ['.MuiButton-root'] }, 'Material UI')).toBeDefined()
    expect(find({ domMatches: ['body[data-bs-theme]'] }, 'Bootstrap')).toBeDefined()
    expect(find({ domMatches: ['[data-bs-toggle]'] }, 'Bootstrap')).toBeDefined()
    expect(
      find(
        {
          html: '/*! Bootstrap v5.3.2 */',
          jsValues: { 'bootstrap.Alert.VERSION': '5.3.2' },
        },
        'Bootstrap',
      )?.version,
    ).toBe('5.3.2')
    expect(find({ html: '/*! tailwindcss v4.0.0 */' }, 'Tailwind CSS')).toBeDefined()
    expect(find({ scripts: ['https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'] }, 'Tailwind CSS')).toBeDefined()
    expect(find({ domMatches: ['.ant-table'] }, 'Ant Design')).toBeDefined()
  })

  it('detects the negotiated protocol, markup patterns and DOM selectors', () => {
    const found = names({
      protocol: 'h3',
      html: '<div class="flex md:grid p-4"><img fetchpriority="high"></div>',
      domMatches: ['link[rel="manifest"]'],
      meta: { 'og:title': 'Hello', 'twitter:card': 'summary' },
    })
    expect(found).toEqual(expect.arrayContaining(['HTTP/3', 'Tailwind CSS', 'Priority Hints', 'PWA', 'Open Graph', 'Twitter Cards']))
    expect(found).not.toContain('HTTP/2')
  })

  it('matches wildcard globals reported by the page collector', () => {
    expect(find({ jsValues: { 'webpackChunk*': '' } }, 'Webpack')).toBeDefined()
  })

  it('reports where each detection came from', () => {
    expect(find({ scripts: ['https://js.stripe.com/v3/'] }, 'Stripe')?.evidence).toBe('url: https://js.stripe.com/v3/')
  })

  it('detects common stacks from fixture-like signals', () => {
    expect(names({ meta: { generator: 'WordPress 6.5' }, html: '/wp-content/plugins/wordpress-seo/' })).toEqual(
      expect.arrayContaining(['WordPress', 'Yoast SEO', 'PHP']),
    )
    expect(names({ jsValues: { Shopify: '' }, scripts: ['https://cdn.shopify.com/s/files/1/t.js'] })).toContain('Shopify')
    expect(names({ jsValues: { 'Vue.version': '3.5.0' } })).toContain('Vue.js')
    expect(names({ scripts: ['https://www.googletagmanager.com/gtm.js?id=GTM-1'] })).toContain('Google Tag Manager')
    expect(names({ headers: { 'cf-ray': 'abc' } })).toContain('Cloudflare')
    expect(names({})).toEqual([])
  })

  it('detects new coverage fingerprints', () => {
    expect(find({ scripts: ['https://cdn.jsdelivr.net/npm/umami/script.js'] }, 'Umami')).toBeDefined()
    expect(find({ scripts: ['https://cdn.paddle.com/paddle/v2/paddle.js'] }, 'Paddle')).toBeDefined()
    expect(find({ scripts: ['https://boards.greenhouse.io/embed/job_board'] }, 'Greenhouse')).toBeDefined()
  })
})

describe('groupHitsByCategory', () => {
  it('orders groups by category and keeps hits inside them', () => {
    const hits = detectTechnologies(
      signals({ meta: { generator: 'WordPress 6.5' }, scripts: ['https://www.googletagmanager.com/gtag/js?id=G-1'] }),
    )
    const groups = groupHitsByCategory(hits)
    const order = groups.map((group) => group.category)
    expect(order.indexOf('cms')).toBeLessThan(order.indexOf('analytics'))
    expect(groups.find((group) => group.category === 'programming-language')?.hits.map((hit) => hit.name)).toContain('PHP')
  })
})

describe('tech scan export', () => {
  const reactHit: TechHit = {
    name: 'React',
    category: 'js-framework',
    version: '18.2.0',
    evidence: 'js: React.version',
    evidenceItems: [
      { type: 'js', detail: 'js: React.version' },
      { type: 'url', detail: 'url: https://unpkg.com/react@18.2.0/react.js' },
    ],
    confidence: 0.99,
    confidenceLevel: 'high',
    website: 'https://react.dev',
  }
  const formulaHit: TechHit = {
    name: '=HYPERLINK("x")',
    category: 'misc',
    evidence: 'url: a,b',
    evidenceItems: [{ type: 'url', detail: 'url: a,b' }],
    confidence: 0.85,
    confidenceLevel: 'high',
  }
  const scan: TechScan = {
    url: 'https://www.example.com/page',
    scannedAt: '2026-10-29T10:00:00.000Z',
    durationMs: 142,
    headersAvailable: true,
    engineVersion: 2,
    headers: {},
    facts: emptyFacts,
    hits: [reactHit, formulaHit],
  }

  it('writes a header row and one row per technology', () => {
    const lines = techScanToCsv(scan).split('\r\n')
    expect(lines[0]).toBe(
      'Name,Category,Version,Website,Detected by,Confidence,Confidence level,Inferred,Evidence sources,Page URL,Scanned at',
    )
    expect(lines[1]).toContain('React,JavaScript frameworks,18.2.0,https://react.dev,js: React.version,0.99,high,false,')
  })

  it('defuses spreadsheet formulas and quotes separators', () => {
    const row = techScanToCsv(scan).split('\r\n')[2]
    expect(row.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true)
    expect(row).toContain('"url: a,b"')
  })

  it('names the file after the host', () => {
    expect(techScanFilename(scan)).toBe('tech-stack-example.com.csv')
    expect(techScanFilename(scan, 'json')).toBe('tech-stack-example.com.json')
    expect(techScanFilename({ ...scan, url: '' })).toBe('tech-stack-page.csv')
  })

  it('serializes a JSON report without page HTML or cookies', () => {
    const report = JSON.parse(techScanToJson(scan)) as {
      website: string
      durationMs: number
      technologies: { name: string; inferred: boolean; evidence: unknown[] }[]
    }
    expect(report.website).toBe('example.com')
    expect(report.durationMs).toBe(142)
    expect(report.technologies[0]).toMatchObject({ name: 'React', inferred: false })
    expect(JSON.stringify(report)).not.toContain('<html')
    expect(JSON.stringify(report)).not.toContain('cookie')
  })
})
