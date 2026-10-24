export interface TabInfo {
  id: number
  windowId: number
  index: number
  title: string
  url: string
  favIconUrl: string
  active: boolean
  pinned: boolean
  audible: boolean
  muted: boolean
  discarded: boolean
  lastAccessed: number
}

export type TabFilter = 'all' | 'window' | 'pinned' | 'audio' | 'duplicates' | 'sleeping'
export type TabGrouping = 'none' | 'window' | 'domain'
export type TabSort = 'position' | 'recent' | 'title' | 'domain'
export type CopyFormat = 'urls' | 'markdown' | 'titled' | 'csv'
export type ExportFormat = 'txt' | 'csv' | 'json' | 'html'

export const TAB_FILTERS: TabFilter[] = ['all', 'window', 'pinned', 'audio', 'duplicates', 'sleeping']

export function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (tab.id == null || tab.id < 0) return null
  const url = tab.url || tab.pendingUrl || ''
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title || url,
    url,
    favIconUrl: tab.favIconUrl ?? '',
    active: tab.active,
    pinned: tab.pinned,
    audible: tab.audible === true,
    muted: tab.mutedInfo?.muted === true,
    discarded: tab.discarded === true,
    lastAccessed: (tab as { lastAccessed?: number }).lastAccessed ?? 0,
  }
}

export function domainOf(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.hostname.replace(/^www\./, '')
    if (parsed.protocol === 'file:') return 'file'
    return parsed.protocol.replace(/:$/, '') + (parsed.hostname ? `://${parsed.hostname}` : '')
  } catch {
    return url || '—'
  }
}

/** URL path + query, shown under the domain so long URLs stay readable. */
export function pathOf(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    const rest = `${parsed.pathname}${parsed.search}`
    return rest === '/' ? '' : decodeURI(rest)
  } catch {
    return ''
  }
}

/** Duplicates ignore the #fragment; the first tab of each URL (by window/index) is kept. */
export function duplicateIds(tabs: TabInfo[]): Set<number> {
  const seen = new Set<string>()
  const dupes = new Set<number>()
  const ordered = [...tabs].sort((a, b) => Number(b.active) - Number(a.active) || a.windowId - b.windowId || a.index - b.index)
  for (const tab of ordered) {
    if (!tab.url) continue
    const key = tab.url.replace(/#.*$/, '')
    if (seen.has(key)) dupes.add(tab.id)
    else seen.add(key)
  }
  return dupes
}

export function matchesFilter(tab: TabInfo, filter: TabFilter, ctx: { windowId: number | null; dupes: Set<number> }) {
  switch (filter) {
    case 'window':
      return ctx.windowId == null || tab.windowId === ctx.windowId
    case 'pinned':
      return tab.pinned
    case 'audio':
      return tab.audible || tab.muted
    case 'duplicates':
      return ctx.dupes.has(tab.id)
    case 'sleeping':
      return tab.discarded
    default:
      return true
  }
}

export function filterCounts(tabs: TabInfo[], ctx: { windowId: number | null; dupes: Set<number> }) {
  const counts = {} as Record<TabFilter, number>
  for (const f of TAB_FILTERS) counts[f] = tabs.filter((tab) => matchesFilter(tab, f, ctx)).length
  return counts
}

export function matchesQuery(tab: TabInfo, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return q.split(/\s+/).every((part) => tab.title.toLowerCase().includes(part) || tab.url.toLowerCase().includes(part))
}

export function sortTabs(tabs: TabInfo[], sort: TabSort): TabInfo[] {
  const list = [...tabs]
  switch (sort) {
    case 'recent':
      return list.sort((a, b) => b.lastAccessed - a.lastAccessed)
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    case 'domain':
      return list.sort((a, b) => domainOf(a.url).localeCompare(domainOf(b.url)) || a.index - b.index)
    default:
      return list.sort((a, b) => a.windowId - b.windowId || a.index - b.index)
  }
}

export interface TabGroup {
  key: string
  label: string
  windowId?: number
  domain?: string
  tabs: TabInfo[]
}

export function groupTabs(tabs: TabInfo[], grouping: TabGrouping, windowOrder: number[]): TabGroup[] {
  if (grouping === 'none') return [{ key: 'all', label: '', tabs }]
  const map = new Map<string, TabGroup>()
  for (const tab of tabs) {
    const key = grouping === 'window' ? `w${tab.windowId}` : `d${domainOf(tab.url)}`
    let group = map.get(key)
    if (!group) {
      group =
        grouping === 'window'
          ? { key, label: '', windowId: tab.windowId, tabs: [] }
          : { key, label: domainOf(tab.url), domain: domainOf(tab.url), tabs: [] }
      map.set(key, group)
    }
    group.tabs.push(tab)
  }
  const groups = [...map.values()]
  if (grouping === 'window') {
    return groups.sort((a, b) => windowOrder.indexOf(a.windowId!) - windowOrder.indexOf(b.windowId!))
  }
  return groups.sort((a, b) => b.tabs.length - a.tabs.length || a.label.localeCompare(b.label))
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function formatTabs(tabs: TabInfo[], format: CopyFormat): string {
  switch (format) {
    case 'markdown':
      return tabs.map((t) => `- [${t.title.replace(/([[\]])/g, '\\$1')}](${t.url})`).join('\n')
    case 'titled':
      return tabs.map((t) => `${t.title}\n${t.url}`).join('\n\n')
    case 'csv':
      return ['title,url,domain', ...tabs.map((t) => [t.title, t.url, domainOf(t.url)].map(csvCell).join(','))].join('\n')
    default:
      return tabs.map((t) => t.url).join('\n')
  }
}

export function exportTabs(tabs: TabInfo[], format: ExportFormat, now = new Date()): { text: string; mime: string } {
  switch (format) {
    case 'csv':
      return { text: formatTabs(tabs, 'csv'), mime: 'text/csv;charset=utf-8' }
    case 'json':
      return {
        text: JSON.stringify(
          {
            exportedAt: now.toISOString(),
            tabs: tabs.map(({ title, url, pinned, windowId }) => ({ title, url, pinned, windowId })),
          },
          null,
          2,
        ),
        mime: 'application/json',
      }
    case 'html': {
      const stamp = Math.floor(now.getTime() / 1000)
      const items = tabs
        .map((t) => `    <DT><A HREF="${escapeHtml(t.url)}" ADD_DATE="${stamp}">${escapeHtml(t.title)}</A>`)
        .join('\n')
      return {
        text: `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3 ADD_DATE="${stamp}">Tabs ${now.toLocaleDateString()}</H3>
  <DL><p>
${items}
  </DL><p>
</DL><p>
`,
        mime: 'text/html;charset=utf-8',
      }
    }
    default:
      return { text: formatTabs(tabs, 'urls'), mime: 'text/plain;charset=utf-8' }
  }
}

/** Pulls openable URLs out of pasted text (one per line, markdown links, or bare domains). */
export function parseUrlList(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/[\n\r]+/)) {
    const line = raw.trim()
    if (!line) continue
    const md = /\]\((\S+?)\)/.exec(line)
    const candidate = md?.[1] ?? /(https?:\/\/\S+|chrome:\/\/\S+|file:\/\/\S+)/i.exec(line)?.[1] ?? line.split(/\s+/)[0]
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`
    try {
      const url = new URL(withScheme)
      const web = url.protocol === 'http:' || url.protocol === 'https:'
      const plausibleHost = url.hostname.includes('.') || url.hostname === 'localhost'
      if (/^(https?|chrome|file|edge|about):$/.test(url.protocol) && (!web || plausibleHost)) out.push(url.href)
    } catch {
      // not a URL
    }
  }
  return out
}
