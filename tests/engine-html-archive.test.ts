import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import {
  base64ToBytes,
  buildHtmlArchive,
  buildZip,
  bytesToBase64,
  collectSameOriginAssets,
  decodeText,
  isHtmlPageLink,
  relativeZipPath,
  safeZipPath,
  scanAnchorList,
  textEncoder,
  zipFileName,
} from '@/core/engines/htmlArchive'

const BASE = 'https://reports.example.com/run-1/index.html'

describe('htmlArchive engine', () => {
  it('filters html page links on same origin', () => {
    expect(isHtmlPageLink('report-feature_1.html', BASE)).toBe(true)
    expect(isHtmlPageLink('https://evil.com/x.html', BASE)).toBe(false)
    expect(isHtmlPageLink('javascript:void(0)', BASE)).toBe(false)
    expect(isHtmlPageLink('style.css', BASE)).toBe(false)
  })

  it('scans anchor list like cucumber index tables', () => {
    const anchors = [
      { href: 'report-feature_2366870797.html', label: 'FSC_Fallout_TC_06' },
      { href: 'report-feature_1_559416334.html', label: 'FSC_Fallout_TC_07' },
      { href: 'https://other.example.com/x.html', label: 'External' },
    ]
    const entries = scanAnchorList(anchors, BASE, { htmlOnly: true, sameFolderOnly: true })
    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.filename)).toEqual(
      expect.arrayContaining([
        'report-feature_2366870797.html',
        'report-feature_1_559416334.html',
      ]),
    )
  })

  it('collects same-origin assets from html', () => {
    const html =
      '<link rel="stylesheet" href="assets/style.css"><script src="/run-1/app.js"></script><img src="pic.png">'
    const assets = collectSameOriginAssets(html, BASE)
    expect(assets.length).toBeGreaterThanOrEqual(2)
  })

  it('computes relative zip paths', () => {
    expect(relativeZipPath('index.html', 'css/app.css')).toBe('css/app.css')
    expect(relativeZipPath('css/app.css', 'fonts/a.woff')).toBe('../fonts/a.woff')
    expect(relativeZipPath('css/app.css', 'css/b.png')).toBe('b.png')
  })

  it('bundles pages with their css, nested css assets and root-relative refs', async () => {
    const root = 'https://ci.example.com/job/1/cucumber-html-reports/'
    const files: Record<string, string> = {
      [`${root}overview-features.html`]:
        '<link href="css/app.css" rel="stylesheet"><script src="/job/1/cucumber-html-reports/js/app.js"></script>' +
        '<a href="report-feature_1.html#top">f1</a><a href="https://ci.example.com/jenkins">jenkins</a>',
      [`${root}report-feature_1.html`]: '<link href="css/app.css?v=2" rel="stylesheet">',
      [`${root}css/app.css`]: '@font-face{src:url("../fonts/a.woff2")} .x{background:url(img/bg.png)}',
      [`${root}fonts/a.woff2`]: 'FONT',
      [`${root}css/img/bg.png`]: 'PNG',
      [`${root}js/app.js`]: 'console.log(1)',
    }
    const result = await buildHtmlArchive(
      {
        rootPageUrl: `${root}overview-features.html`,
        pageUrls: [`${root}overview-features.html`, `${root}report-feature_1.html`],
        includeAssets: true,
      },
      { loadBytes: async (url) => (url in files ? textEncoder(files[url]) : null) },
    )

    const entries = unzipSync(result.zipBytes)
    expect(Object.keys(entries).sort()).toEqual([
      'css/app.css',
      'css/img/bg.png',
      'fonts/a.woff2',
      'js/app.js',
      'overview-features.html',
      'report-feature_1.html',
    ])
    const overview = decodeText(entries['overview-features.html'])
    expect(overview).toContain('href="css/app.css"')
    expect(overview).toContain('src="js/app.js"')
    expect(overview).toContain('href="report-feature_1.html#top"')
    expect(overview).toContain('href="https://ci.example.com/jenkins"')
    expect(decodeText(entries['report-feature_1.html'])).toContain('href="css/app.css"')
    expect(decodeText(entries['css/app.css'])).toContain('url("../fonts/a.woff2")')
    expect(result.stats).toMatchObject({ pages: 2, assets: 4, missing: 0 })
  })

  it('bundles 300 pages and reports progress through every phase', async () => {
    const root = 'https://ci.example.com/r/'
    const pageUrls = Array.from({ length: 300 }, (_, index) => `${root}report-${index}.html`)
    const phases = new Set<string>()
    let lastPages = 0
    const result = await buildHtmlArchive(
      {
        rootPageUrl: pageUrls[0],
        pageUrls,
        includeAssets: true,
        onProgress: (progress) => {
          phases.add(progress.phase)
          if (progress.phase === 'pages') lastPages = progress.done
        },
      },
      {
        loadBytes: async (url) =>
          textEncoder(url.endsWith('.css') ? 'body{}' : '<link rel="stylesheet" href="css/app.css">'),
      },
    )
    expect(result.stats).toMatchObject({ pages: 300, assets: 1, missing: 0 })
    expect(lastPages).toBe(300)
    expect([...phases]).toEqual(['pages', 'assets', 'zip'])
    expect(Object.keys(unzipSync(result.zipBytes))).toHaveLength(301)
  })

  it('names zips after the page title like chrome save-as', () => {
    const url = 'https://ci.example.com/r/overview-features.html'
    expect(zipFileName('Cucumber Reports (no 1764) - Features Overview', url)).toBe(
      'Cucumber Reports (no 1764) - Features Overview.zip',
    )
    expect(zipFileName('Run: 12 / "nightly"?', url, ' (8 pages)')).toBe('Run_ 12 _ _nightly_ (8 pages).zip')
    expect(zipFileName('   ', url)).toBe('overview-features.zip')
  })

  it('round-trips zip bytes through base64', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255])
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes])
  })

  it('sanitizes zip paths and builds archive', () => {
    expect(() => safeZipPath('../secret.txt')).toThrow()
    const files = new Map<string, Uint8Array>([['index.html', textEncoder('<html></html>')]])
    const zip = buildZip(files)
    expect(zip.byteLength).toBeGreaterThan(0)
    expect(decodeText(files.get('index.html')!)).toContain('html')
  })
})
