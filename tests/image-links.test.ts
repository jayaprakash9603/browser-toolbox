import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { buildImagesZip, type PageImage } from '@/core/engines/imageDownloader'
import {
  DEFAULT_IMAGE_LINKS_QUERY,
  countActiveImageLinkFilters,
  exportImageLinks,
  imageToHtml,
  imageToMarkdown,
  queryImageLinks,
  summarizeImageLinks,
  toImageLinkItems,
} from '@/core/engines/imageLinks'

const images: PageImage[] = [
  { url: 'https://www.example.com/img/Hero%20Banner.JPEG?w=800', source: 'img', width: 1600, height: 900, alt: 'Hero banner', ext: 'jpeg' },
  { url: 'https://cdn.example.com/icons/logo.svg', source: 'img', width: 32, height: 32, alt: null, ext: 'svg' },
  { url: 'https://cdn.example.com/spacer.png', source: 'img', width: 1, height: 1, alt: '', ext: 'png' },
  { url: 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E', source: 'svg', width: 24, height: 24, alt: null, ext: 'svg+xml' },
  { url: 'https://example.com/og/card', source: 'meta', width: 0, height: 0, alt: null, ext: null },
]

describe('image links engine', () => {
  it('normalizes names, hosts, formats and alt status', () => {
    const items = toImageLinkItems(images)
    expect(items.map((item) => item.name)).toEqual([
      'Hero Banner.JPEG',
      'logo.svg',
      'spacer.png',
      'inline-image.svg',
      'card',
    ])
    expect(items.map((item) => item.type)).toEqual(['jpg', 'svg', 'png', 'svg', 'other'])
    expect(items.map((item) => item.host)).toEqual([
      'example.com',
      'cdn.example.com',
      'cdn.example.com',
      'inline',
      'example.com',
    ])
    expect(items.map((item) => item.altStatus)).toEqual(['present', 'missing', 'decorative', 'na', 'na'])
  })

  it('summarizes alt coverage over <img> elements only', () => {
    const summary = summarizeImageLinks(toImageLinkItems(images))
    expect(summary).toMatchObject({
      total: 5,
      altApplicable: 3,
      missingAlt: 1,
      withAlt: 1,
      decorative: 1,
      altCoverage: 67,
    })
    expect(summary.byType).toEqual({ jpg: 1, svg: 2, png: 1, other: 1 })
    expect(summarizeImageLinks([]).altCoverage).toBe(100)
  })

  it('filters, searches and sorts', () => {
    const items = toImageLinkItems(images)
    const run = (patch: Partial<typeof DEFAULT_IMAGE_LINKS_QUERY>) =>
      queryImageLinks(items, { ...DEFAULT_IMAGE_LINKS_QUERY, ...patch }).map((item) => item.name)

    expect(run({ alt: 'missing' })).toEqual(['logo.svg'])
    expect(run({ types: ['svg'] })).toEqual(['logo.svg', 'inline-image.svg'])
    expect(run({ sources: ['meta', 'svg'] })).toEqual(['inline-image.svg', 'card'])
    expect(run({ minSide: 100 })).toEqual(['Hero Banner.JPEG'])
    expect(run({ search: 'hero BANNER' })).toEqual(['Hero Banner.JPEG'])
    expect(run({ sort: 'largest' })[0]).toBe('Hero Banner.JPEG')
    expect(run({ sort: 'name' })).toEqual(['card', 'Hero Banner.JPEG', 'inline-image.svg', 'logo.svg', 'spacer.png'])
    expect(countActiveImageLinkFilters({ ...DEFAULT_IMAGE_LINKS_QUERY, alt: 'missing', minSide: 50, search: 'x' })).toBe(2)
  })

  it('exports CSV with quoting and formula guarding', () => {
    const [item] = toImageLinkItems([
      { url: 'https://example.com/a.png', source: 'img', width: 10, height: 20, alt: '=HYPERLINK("x"), "quoted"', ext: 'png' },
    ])
    const { text, extension, mime } = exportImageLinks([item!], 'csv')
    expect(extension).toBe('csv')
    expect(mime).toBe('text/csv')
    const [header, row] = text.trim().split('\r\n')
    expect(header).toBe('url,file_name,type,source,width,height,alt,alt_status')
    expect(row).toBe('https://example.com/a.png,a.png,png,img,10,20,"\'=HYPERLINK(""x""), ""quoted""",present')
  })

  it('exports JSON, Markdown, HTML and plain lists', () => {
    const items = toImageLinkItems(images.slice(0, 2))
    const json = JSON.parse(
      exportImageLinks(items, 'json', { pageUrl: 'https://example.com/', generatedAt: new Date(0) }).text,
    )
    expect(json).toMatchObject({ page: { url: 'https://example.com/' }, count: 2, generatedAt: '1970-01-01T00:00:00.000Z' })
    expect(json.images[1]).toMatchObject({ fileName: 'logo.svg', altStatus: 'missing', alt: null })

    expect(exportImageLinks(items, 'txt').text).toBe(`${images[0]!.url}\n${images[1]!.url}\n`)
    expect(imageToMarkdown({ url: 'https://x.dev/a (1).png', alt: 'A [big] cat' })).toBe(
      '![A \\[big\\] cat](https://x.dev/a%20%281%29.png)',
    )
    expect(imageToHtml({ url: 'https://x.dev/a.png?a=1&b=2', alt: 'Say "hi"', width: 4, height: 3 })).toBe(
      '<img src="https://x.dev/a.png?a=1&amp;b=2" alt="Say &quot;hi&quot;" width="4" height="3" />',
    )
    expect(imageToHtml({ url: 'https://x.dev/a.png', alt: null, width: 0, height: 0 })).toBe(
      '<img src="https://x.dev/a.png" alt="" />',
    )
  })

  it('adds manifest files to image ZIPs without clashing with image names', () => {
    const ctx = { pageUrl: 'https://example.com/', pageTitle: 'Example' }
    const zip = buildImagesZip(
      [
        { url: 'https://example.com/links.csv', bytes: new Uint8Array([1]), context: { ...ctx, index: 1, url: 'https://example.com/links.csv', ext: 'csv' } },
        { url: 'https://example.com/a.png', bytes: new Uint8Array([2]), context: { ...ctx, index: 2, url: 'https://example.com/a.png', ext: 'png' } },
        { url: 'https://example.com/b/a.png', bytes: new Uint8Array([3]), context: { ...ctx, index: 3, url: 'https://example.com/b/a.png', ext: 'png' } },
      ],
      '{name}',
      [{ name: 'links.csv', text: 'url\n' }],
    )
    const files = unzipSync(zip)
    expect(Object.keys(files).sort()).toEqual(['a-1.png', 'a.png', 'links-1.csv', 'links.csv'])
    expect(strFromU8(files['links.csv']!)).toBe('url\n')
  })
})
