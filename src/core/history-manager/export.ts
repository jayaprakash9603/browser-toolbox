import type { HistoryPage } from './types'

export interface HistoryExportRow {
  url: string
  title: string
  lastVisitTime: string
  visitCount: number
  domain: string
}

export function pagesToExportRows(pages: HistoryPage[]): HistoryExportRow[] {
  return pages.map((p) => ({
    url: p.url,
    title: p.title,
    lastVisitTime: new Date(p.lastVisitTime).toISOString(),
    visitCount: p.visitCount,
    domain: p.domain,
  }))
}

export function historyToCsv(pages: HistoryPage[]): string {
  const rows = pagesToExportRows(pages)
  const header = 'url,title,lastVisitTime,visitCount,domain'
  const body = rows
    .map((r) =>
      [r.url, r.title, r.lastVisitTime, String(r.visitCount), r.domain]
        .map(csvCell)
        .join(','),
    )
    .join('\n')
  return `${header}\n${body}`
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function historyToJson(pages: HistoryPage[]): string {
  return JSON.stringify(pagesToExportRows(pages), null, 2)
}

export function historyToHtml(pages: HistoryPage[], title: string): string {
  const rows = pagesToExportRows(pages)
    .map(
      (r) =>
        `<tr><td><a href="${escapeHtml(r.url)}">${escapeHtml(r.title || r.url)}</a></td><td>${escapeHtml(r.domain)}</td><td>${escapeHtml(r.lastVisitTime)}</td><td>${r.visitCount}</td></tr>`,
    )
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;padding:1rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:.4rem .5rem;text-align:left;font-size:14px}a{color:#2563eb}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr><th>Title</th><th>Domain</th><th>Last visit</th><th>Visits</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function historyExportFilename(ext: string): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `one-panel-history-${stamp}.${ext}`
}
