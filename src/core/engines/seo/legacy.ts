import type { PageInfo } from '@/chrome/content/index'

export interface SeoCheckLegacy {
  id: string
  ok: boolean
  severity: 'error' | 'warning' | 'ok'
  message: string
}

export function analyzeSeo(page: PageInfo): SeoCheckLegacy[] {
  const checks: SeoCheckLegacy[] = []
  const title = page.title.trim()
  checks.push({
    id: 'title',
    ok: title.length > 0,
    severity: title.length === 0 ? 'error' : title.length > 60 ? 'warning' : 'ok',
    message:
      title.length === 0
        ? 'Missing <title>.'
        : title.length > 60
          ? `Title is ${title.length} chars (aim ≤ 60).`
          : `Title present (${title.length} chars).`,
  })
  const desc = page.metaDescription?.trim() ?? ''
  checks.push({
    id: 'description',
    ok: desc.length > 0,
    severity: desc.length === 0 ? 'error' : desc.length > 160 ? 'warning' : 'ok',
    message:
      desc.length === 0
        ? 'Missing meta description.'
        : desc.length > 160
          ? `Description is ${desc.length} chars (aim ≤ 160).`
          : `Meta description present (${desc.length} chars).`,
  })
  checks.push({
    id: 'canonical',
    ok: Boolean(page.canonical),
    severity: page.canonical ? 'ok' : 'warning',
    message: page.canonical ? 'Canonical URL set.' : 'No canonical link.',
  })
  checks.push({
    id: 'viewport',
    ok: Boolean(page.viewport),
    severity: page.viewport ? 'ok' : 'error',
    message: page.viewport ? 'Viewport meta set.' : 'Missing viewport meta (mobile rendering).',
  })
  checks.push({
    id: 'lang',
    ok: Boolean(page.language),
    severity: page.language ? 'ok' : 'warning',
    message: page.language ? `Language: ${page.language}.` : 'No lang attribute on <html>.',
  })
  return checks
}

export interface HeadingIssue {
  severity: 'error' | 'warning'
  message: string
}

export function analyzeHeadings(headings: PageInfo['headings']): HeadingIssue[] {
  const issues: HeadingIssue[] = []
  const h1Count = headings.filter((h) => h.level === 1).length
  if (h1Count === 0) issues.push({ severity: 'error', message: 'No <h1> on the page.' })
  if (h1Count > 1)
    issues.push({ severity: 'warning', message: `${h1Count} <h1> elements — ideally exactly one.` })
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level > headings[index - 1].level + 1) {
      issues.push({
        severity: 'warning',
        message: `Heading level jumps from h${headings[index - 1].level} to h${headings[index].level} ("${headings[index].text.slice(0, 30)}…").`,
      })
    }
  }
  for (const heading of headings) {
    if (!heading.text.trim())
      issues.push({ severity: 'warning', message: `Empty <h${heading.level}>.` })
  }
  return issues
}

export interface LinkAnalysis {
  total: number
  internal: number
  external: number
  emptyAnchors: number
  duplicates: number
}

export function analyzeLinks(links: PageInfo['links']): LinkAnalysis {
  const seen = new Set<string>()
  let duplicates = 0
  for (const link of links) {
    if (seen.has(link.href)) duplicates += 1
    else seen.add(link.href)
  }
  return {
    total: links.length,
    internal: links.filter((l) => l.internal).length,
    external: links.filter((l) => !l.internal).length,
    emptyAnchors: links.filter((l) => !l.text.trim()).length,
    duplicates,
  }
}

export interface ImageAnalysis {
  total: number
  missingAlt: number
  oversized: { src: string; width: number; height: number }[]
}

export function analyzeImages(images: PageInfo['images']): ImageAnalysis {
  return {
    total: images.length,
    missingAlt: images.filter((i) => !i.alt || !i.alt.trim()).length,
    oversized: images
      .filter((i) => i.width > 2000 || i.height > 2000)
      .map((i) => ({ src: i.src, width: i.width, height: i.height })),
  }
}
