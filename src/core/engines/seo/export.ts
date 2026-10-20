import type { SeoPageData, SeoCheck } from './types'

export function exportHeadingsOutline(page: SeoPageData): string {
  return page.headings.map((h) => `H${h.level}: ${h.text}`).join('\n')
}

export function exportLinksCsv(page: SeoPageData): string {
  const header = 'href,text,internal,nofollow'
  const rows = page.links.map(
    (l) =>
      `"${l.href.replace(/"/g, '""')}","${l.text.replace(/"/g, '""')}",${l.internal},${l.nofollow}`,
  )
  return [header, ...rows].join('\n')
}

export function exportChecksJson(checks: SeoCheck[]): string {
  return JSON.stringify(checks, null, 2)
}

export function exportSchemaJson(page: SeoPageData): string {
  return JSON.stringify(
    page.jsonLd.map((b) => b.parsed ?? { error: b.error, raw: b.raw }),
    null,
    2,
  )
}
