export type LinkKind = 'internal' | 'external' | 'anchor' | 'email' | 'phone' | 'script' | 'other'
export type LinkSection = 'header' | 'nav' | 'main' | 'aside' | 'footer' | 'other'
export type LinkTextSource = 'text' | 'aria' | 'title' | 'image' | 'none'

export interface PageLink {
  index: number
  href: string
  rawHref: string
  text: string
  textSource: LinkTextSource
  kind: LinkKind
  host: string
  section: LinkSection
  rel: string[]
  nofollow: boolean
  newTab: boolean
  download: boolean
  insecure: boolean
  visible: boolean
  anchorMissing: boolean
}

export interface PageLinksSnapshot {
  url: string
  title: string
  host: string
  links: PageLink[]
  truncated: boolean
}

/** One URL with every place it appears on the page. */
export interface LinkEntry {
  key: string
  link: PageLink
  occurrences: PageLink[]
}

export type LinkTypeFilter = 'all' | 'internal' | 'external' | 'anchor' | 'contact' | 'other'
export type LinkFlag = 'duplicates' | 'noText' | 'nofollow' | 'newTab' | 'hidden' | 'brokenAnchor' | 'insecure' | 'download' | 'broken'

export interface LinkStatusInfo {
  checking: boolean
  status: number | null
  ok: boolean
  error?: string
}

export type StatusLookup = (href: string) => LinkStatusInfo | undefined

export const LINK_TYPE_FILTERS: LinkTypeFilter[] = ['all', 'internal', 'external', 'anchor', 'contact', 'other']
export const LINK_FLAGS: LinkFlag[] = ['broken', 'duplicates', 'noText', 'brokenAnchor', 'insecure', 'hidden', 'nofollow', 'newTab', 'download']
export const LINK_SECTIONS: LinkSection[] = ['header', 'nav', 'main', 'aside', 'footer', 'other']

const FILE_EXTENSION = /\.(pdf|zip|rar|7z|gz|tar|docx?|xlsx?|pptx?|csv|txt|rtf|odt|mp3|wav|mp4|mov|avi|mkv|dmg|exe|msi|apk|iso|epub)$/i

export function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '')
}

export function classifyHref(rawHref: string, absolute: string, pageUrl: string): LinkKind {
  const raw = rawHref.trim().toLowerCase()
  if (raw.startsWith('mailto:')) return 'email'
  if (raw.startsWith('tel:') || raw.startsWith('sms:')) return 'phone'
  if (raw.startsWith('javascript:')) return 'script'
  let url: URL
  try {
    url = new URL(absolute)
  } catch {
    return 'other'
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'other'
  let page: URL | null
  try {
    page = new URL(pageUrl)
  } catch {
    page = null
  }
  if (!page) return 'external'
  const samePage =
    url.origin === page.origin && url.pathname === page.pathname && url.search === page.search
  if (raw.startsWith('#') || (samePage && absolute.includes('#'))) return 'anchor'
  return bareHost(url.hostname) === bareHost(page.hostname) ? 'internal' : 'external'
}

export function isFileUrl(href: string): boolean {
  try {
    return FILE_EXTENSION.test(new URL(href).pathname)
  } catch {
    return false
  }
}

/** Splits a URL into a muted host and the more meaningful path for display. */
export function splitUrl(link: Pick<PageLink, 'href' | 'kind' | 'rawHref'>): { host: string; path: string } {
  if (link.kind === 'email' || link.kind === 'phone' || link.kind === 'script') {
    const [scheme, ...rest] = link.rawHref.trim().split(':')
    return { host: `${scheme.toLowerCase()}:`, path: decodeSafe(rest.join(':')) }
  }
  try {
    const url = new URL(link.href)
    const path = `${url.pathname === '/' && !url.search && !url.hash ? '' : url.pathname}${url.search}${url.hash}`
    return { host: bareHost(url.hostname) + (url.port ? `:${url.port}` : ''), path: decodeSafe(path) }
  } catch {
    return { host: '', path: link.href }
  }
}

function decodeSafe(value: string): string {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

export function toEntries(links: PageLink[], merge: boolean): LinkEntry[] {
  if (!merge) return links.map((link) => ({ key: `${link.index}`, link, occurrences: [link] }))
  const byHref = new Map<string, LinkEntry>()
  for (const link of links) {
    const existing = byHref.get(link.href)
    if (existing) existing.occurrences.push(link)
    else byHref.set(link.href, { key: link.href, link, occurrences: [link] })
  }
  return [...byHref.values()]
}

export function matchesType(link: PageLink, type: LinkTypeFilter): boolean {
  switch (type) {
    case 'all':
      return true
    case 'contact':
      return link.kind === 'email' || link.kind === 'phone'
    case 'other':
      return link.kind === 'script' || link.kind === 'other'
    default:
      return link.kind === type
  }
}

export function hasFlag(entry: LinkEntry, flag: LinkFlag, duplicateHrefs: Set<string>, status?: StatusLookup): boolean {
  const { link, occurrences } = entry
  switch (flag) {
    case 'duplicates':
      return occurrences.length > 1 || duplicateHrefs.has(link.href)
    case 'noText':
      return occurrences.some((item) => item.textSource === 'none')
    case 'nofollow':
      return occurrences.some((item) => item.nofollow)
    case 'newTab':
      return occurrences.some((item) => item.newTab)
    case 'hidden':
      return occurrences.every((item) => !item.visible)
    case 'brokenAnchor':
      return link.anchorMissing
    case 'insecure':
      return link.insecure
    case 'download':
      return link.download
    case 'broken': {
      const info = status?.(link.href)
      return Boolean(info && !info.checking && !info.ok)
    }
  }
}

export function duplicateHrefSet(links: PageLink[]): Set<string> {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const link of links) {
    if (seen.has(link.href)) dupes.add(link.href)
    else seen.add(link.href)
  }
  return dupes
}

export function matchesSearch(entry: LinkEntry, search: string): boolean {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = entry.occurrences
    .map((item) => `${item.text} ${item.href}`)
    .join(' ')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function countByType(links: PageLink[]): Record<LinkTypeFilter, number> {
  const counts: Record<LinkTypeFilter, number> = { all: links.length, internal: 0, external: 0, anchor: 0, contact: 0, other: 0 }
  for (const link of links) {
    for (const type of LINK_TYPE_FILTERS) {
      if (type !== 'all' && matchesType(link, type)) counts[type] += 1
    }
  }
  return counts
}

export function countFlags(
  entries: LinkEntry[],
  duplicateHrefs: Set<string>,
  status?: StatusLookup,
): Record<LinkFlag, number> {
  const counts = Object.fromEntries(LINK_FLAGS.map((flag) => [flag, 0])) as Record<LinkFlag, number>
  for (const entry of entries) {
    for (const flag of LINK_FLAGS) if (hasFlag(entry, flag, duplicateHrefs, status)) counts[flag] += 1
  }
  return counts
}

export interface LinkGroup {
  key: string
  label: string
  kind: 'site' | 'domain' | 'page' | 'email' | 'phone' | 'script' | 'other' | LinkSection
  entries: LinkEntry[]
}

function domainGroupKey(link: PageLink): Pick<LinkGroup, 'key' | 'label' | 'kind'> {
  switch (link.kind) {
    case 'anchor':
      return { key: '#page', label: '#', kind: 'page' }
    case 'email':
      return { key: '#email', label: 'mailto:', kind: 'email' }
    case 'phone':
      return { key: '#phone', label: 'tel:', kind: 'phone' }
    case 'script':
      return { key: '#script', label: 'javascript:', kind: 'script' }
    case 'other':
      return { key: '#other', label: 'other', kind: 'other' }
    default:
      return { key: link.host, label: link.host, kind: link.kind === 'internal' ? 'site' : 'domain' }
  }
}

const GROUP_ORDER: Record<LinkGroup['kind'], number> = {
  site: 0,
  page: 1,
  domain: 2,
  email: 3,
  phone: 4,
  script: 5,
  other: 6,
  header: 0,
  nav: 1,
  main: 2,
  aside: 3,
  footer: 4,
}

export function groupByDomain(entries: LinkEntry[]): LinkGroup[] {
  const groups = new Map<string, LinkGroup>()
  for (const entry of entries) {
    const meta = domainGroupKey(entry.link)
    const group = groups.get(meta.key)
    if (group) group.entries.push(entry)
    else groups.set(meta.key, { ...meta, entries: [entry] })
  }
  return [...groups.values()].sort(
    (a, b) =>
      GROUP_ORDER[a.kind] - GROUP_ORDER[b.kind] ||
      b.entries.length - a.entries.length ||
      a.label.localeCompare(b.label),
  )
}

export function groupBySection(entries: LinkEntry[]): LinkGroup[] {
  const groups = new Map<LinkSection, LinkGroup>()
  for (const entry of entries) {
    const section = entry.link.section
    const group = groups.get(section)
    if (group) group.entries.push(entry)
    else groups.set(section, { key: section, label: section, kind: section, entries: [entry] })
  }
  return LINK_SECTIONS.filter((section) => groups.has(section)).map((section) => groups.get(section)!)
}

function csvCell(value: string | number | boolean): string {
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function statusText(info: LinkStatusInfo | undefined): string {
  if (!info || info.checking) return ''
  return info.status == null ? 'error' : String(info.status)
}

export function linksToCsv(entries: LinkEntry[], status?: StatusLookup): string {
  const header = ['url', 'text', 'type', 'section', 'rel', 'new_tab', 'occurrences', 'status']
  const rows = entries.map(({ link, occurrences }) =>
    [
      link.href,
      link.text,
      link.kind,
      link.section,
      link.rel.join(' '),
      link.newTab,
      occurrences.length,
      statusText(status?.(link.href)),
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export function linksToMarkdown(entries: LinkEntry[]): string {
  return entries
    .map(({ link }) => {
      const label = (link.text || link.href).replace(/([[\]])/g, '\\$1')
      return `- [${label}](${link.href.replace(/\)/g, '%29')})`
    })
    .join('\n')
}

export function linksToJson(entries: LinkEntry[], status?: StatusLookup): string {
  return JSON.stringify(
    entries.map(({ link, occurrences }) => {
      const info = status?.(link.href)
      return {
        url: link.href,
        text: link.text,
        type: link.kind,
        section: link.section,
        rel: link.rel,
        newTab: link.newTab,
        occurrences: occurrences.length,
        ...(info && !info.checking ? { status: info.status, ok: info.ok } : {}),
      }
    }),
    null,
    2,
  )
}
