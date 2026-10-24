import type { ImageSource, PageImage } from '@/core/engines/imageDownloader/types'

export type AltStatus = 'present' | 'decorative' | 'missing' | 'na'
export type ImageLinksAltFilter = 'all' | 'missing' | 'present' | 'decorative'
export type ImageLinksSort = 'page' | 'largest' | 'smallest' | 'name' | 'type'
export type ImageLinksExportFormat = 'csv' | 'json' | 'txt' | 'markdown' | 'html'

export const IMAGE_LINK_TYPES = ['jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'ico', 'bmp', 'other'] as const
export type ImageLinkType = (typeof IMAGE_LINK_TYPES)[number]

export const IMAGE_LINK_SOURCES: ImageSource[] = ['img', 'picture', 'css', 'svg', 'link', 'meta', 'video']

export interface ImageLinkItem {
  /** Position in the original scan, used for "page order" sorting. */
  order: number
  url: string
  name: string
  host: string
  type: ImageLinkType
  source: ImageSource
  width: number
  height: number
  alt: string | null
  altStatus: AltStatus
}

export interface ImageLinksQuery {
  search: string
  alt: ImageLinksAltFilter
  types: ImageLinkType[]
  sources: ImageSource[]
  minSide: number
  sort: ImageLinksSort
}

export const DEFAULT_IMAGE_LINKS_QUERY: ImageLinksQuery = {
  search: '',
  alt: 'all',
  types: [],
  sources: [],
  minSide: 0,
  sort: 'page',
}

export interface ImageLinksSummary {
  total: number
  /** `<img>` elements only: alt text only applies to them. */
  altApplicable: number
  missingAlt: number
  withAlt: number
  decorative: number
  /** Share of `<img>` elements with an alt attribute (text or intentionally empty), 0–100. */
  altCoverage: number
  byType: Partial<Record<ImageLinkType, number>>
  bySource: Partial<Record<ImageSource, number>>
}

const TYPE_ALIASES: Record<string, ImageLinkType> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  jfif: 'jpg',
  pjpeg: 'jpg',
  png: 'png',
  apng: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  svg: 'svg',
  ico: 'ico',
  'x-icon': 'ico',
  'vnd.microsoft.icon': 'ico',
  bmp: 'bmp',
}

export function normalizeImageType(ext: string | null | undefined): ImageLinkType {
  if (!ext) return 'other'
  const key = ext.toLowerCase().replace(/^\./, '').split('+')[0] ?? ''
  return TYPE_ALIASES[key] ?? 'other'
}

export function imageAltStatus(source: ImageSource, alt: string | null): AltStatus {
  if (source !== 'img') return 'na'
  if (alt == null) return 'missing'
  return alt.trim() ? 'present' : 'decorative'
}

export function imageHost(url: string): string {
  if (url.startsWith('data:')) return 'inline'
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

export function imageFileName(url: string, type: ImageLinkType): string {
  const ext = type === 'other' ? '' : `.${type}`
  if (url.startsWith('data:')) return `inline-image${ext}`
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
    let decoded = segment
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      // keep the raw segment when it is not valid percent-encoding
    }
    return decoded || `image${ext}`
  } catch {
    return `image${ext}`
  }
}

export function toImageLinkItems(images: PageImage[]): ImageLinkItem[] {
  return images.map((image, order) => {
    const type = normalizeImageType(image.ext)
    return {
      order,
      url: image.url,
      name: imageFileName(image.url, type),
      host: imageHost(image.url),
      type,
      source: image.source,
      width: image.width,
      height: image.height,
      alt: image.alt,
      altStatus: imageAltStatus(image.source, image.alt),
    }
  })
}

function matchesAlt(item: ImageLinkItem, filter: ImageLinksAltFilter): boolean {
  if (filter === 'all') return true
  return item.altStatus === filter
}

function compareItems(sort: ImageLinksSort) {
  return (a: ImageLinkItem, b: ImageLinkItem): number => {
    switch (sort) {
      case 'largest':
        return b.width * b.height - a.width * a.height || a.order - b.order
      case 'smallest':
        return a.width * a.height - b.width * b.height || a.order - b.order
      case 'name':
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.order - b.order
      case 'type':
        return a.type.localeCompare(b.type) || a.order - b.order
      default:
        return a.order - b.order
    }
  }
}

export function queryImageLinks(items: ImageLinkItem[], query: ImageLinksQuery): ImageLinkItem[] {
  const needle = query.search.trim().toLowerCase()
  const types = new Set(query.types)
  const sources = new Set(query.sources)
  const filtered = items.filter((item) => {
    if (!matchesAlt(item, query.alt)) return false
    if (types.size && !types.has(item.type)) return false
    if (sources.size && !sources.has(item.source)) return false
    if (query.minSide > 0 && Math.max(item.width, item.height) < query.minSide) return false
    if (needle) {
      const haystack = `${item.url} ${item.alt ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
  return filtered.sort(compareItems(query.sort))
}

export function countActiveImageLinkFilters(query: ImageLinksQuery): number {
  let count = 0
  if (query.alt !== 'all') count += 1
  if (query.types.length) count += 1
  if (query.sources.length) count += 1
  if (query.minSide > 0) count += 1
  return count
}

export function summarizeImageLinks(items: ImageLinkItem[]): ImageLinksSummary {
  const summary: ImageLinksSummary = {
    total: items.length,
    altApplicable: 0,
    missingAlt: 0,
    withAlt: 0,
    decorative: 0,
    altCoverage: 100,
    byType: {},
    bySource: {},
  }
  for (const item of items) {
    summary.byType[item.type] = (summary.byType[item.type] ?? 0) + 1
    summary.bySource[item.source] = (summary.bySource[item.source] ?? 0) + 1
    if (item.altStatus === 'na') continue
    summary.altApplicable += 1
    if (item.altStatus === 'missing') summary.missingAlt += 1
    else if (item.altStatus === 'present') summary.withAlt += 1
    else summary.decorative += 1
  }
  if (summary.altApplicable > 0) {
    summary.altCoverage = Math.round(
      ((summary.altApplicable - summary.missingAlt) / summary.altApplicable) * 100,
    )
  }
  return summary
}

function csvCell(value: string | number): string {
  let text = String(value)
  // Spreadsheet apps execute cells starting with these characters as formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function htmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function markdownUrl(url: string): string {
  return url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function markdownAlt(alt: string): string {
  return alt.replace(/[[\]\\]/g, '\\$&').replace(/\s+/g, ' ').trim()
}

export function imageToHtml(item: Pick<ImageLinkItem, 'url' | 'alt' | 'width' | 'height'>): string {
  const size = item.width > 0 && item.height > 0 ? ` width="${item.width}" height="${item.height}"` : ''
  return `<img src="${htmlAttr(item.url)}" alt="${htmlAttr(item.alt ?? '')}"${size} />`
}

export function imageToMarkdown(item: Pick<ImageLinkItem, 'url' | 'alt'>): string {
  return `![${markdownAlt(item.alt ?? '')}](${markdownUrl(item.url)})`
}

export interface ImageLinksExport {
  text: string
  mime: string
  extension: string
}

export function exportImageLinks(
  items: ImageLinkItem[],
  format: ImageLinksExportFormat,
  meta: { pageUrl?: string; pageTitle?: string; generatedAt?: Date } = {},
): ImageLinksExport {
  switch (format) {
    case 'csv': {
      const header = ['url', 'file_name', 'type', 'source', 'width', 'height', 'alt', 'alt_status']
      const rows = items.map((item) =>
        [item.url, item.name, item.type, item.source, item.width, item.height, item.alt ?? '', item.altStatus]
          .map(csvCell)
          .join(','),
      )
      return { text: `${[header.join(','), ...rows].join('\r\n')}\r\n`, mime: 'text/csv', extension: 'csv' }
    }
    case 'json': {
      const payload = {
        page: { url: meta.pageUrl ?? null, title: meta.pageTitle ?? null },
        generatedAt: (meta.generatedAt ?? new Date()).toISOString(),
        count: items.length,
        images: items.map((item) => ({
          url: item.url,
          fileName: item.name,
          type: item.type,
          source: item.source,
          width: item.width,
          height: item.height,
          alt: item.alt,
          altStatus: item.altStatus,
        })),
      }
      return { text: `${JSON.stringify(payload, null, 2)}\n`, mime: 'application/json', extension: 'json' }
    }
    case 'markdown':
      return {
        text: `${items.map(imageToMarkdown).join('\n')}\n`,
        mime: 'text/markdown',
        extension: 'md',
      }
    case 'html':
      return { text: `${items.map(imageToHtml).join('\n')}\n`, mime: 'text/html', extension: 'html' }
    default:
      return { text: `${items.map((item) => item.url).join('\n')}\n`, mime: 'text/plain', extension: 'txt' }
  }
}
