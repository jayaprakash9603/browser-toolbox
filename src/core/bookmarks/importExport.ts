import { FOLDER_SEPARATOR, type BookmarkFolder, type BookmarkLibrary, type BookmarkRow } from '@/tools/productivity/bookmarks/service'

import { canonicalizeBookmarkUrl, isHttpUrl } from './urls'

export interface ImportBookmark {
  title: string
  url: string
  folderPath: string
  tags: string[]
  notes: string
}

export interface ImportPreview {
  bookmarks: ImportBookmark[]
  folders: string[]
  duplicates: number
  selected: boolean[]
}

export function parseBookmarkCsv(text: string): ImportBookmark[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const cell = (cells: string[], name: string) => {
    const index = idx(name)
    return index >= 0 ? (cells[index] ?? '') : ''
  }
  return lines.slice(1).flatMap((line) => {
    const cells = splitCsvLine(line)
    const url = cell(cells, 'url')
    if (!isHttpUrl(url)) return []
    return [
      {
        title: cell(cells, 'title') || url,
        url,
        folderPath: cell(cells, 'folder'),
        tags: cell(cells, 'tags').split(/[\s,]+/).filter(Boolean),
        notes: cell(cells, 'notes'),
      },
    ]
  })
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else current += char
  }
  cells.push(current)
  return cells
}

export function parseBookmarkJson(raw: unknown): ImportBookmark[] {
  const rows = Array.isArray(raw) ? raw : isObject(raw) && Array.isArray(raw.bookmarks) ? raw.bookmarks : [raw]
  return rows.flatMap((row) => {
    if (!isObject(row) || typeof row.url !== 'string' || !isHttpUrl(row.url)) return []
    return [
      {
        title: typeof row.title === 'string' ? row.title : row.url,
        url: row.url,
        folderPath: typeof row.folderPath === 'string' ? row.folderPath : typeof row.folder === 'string' ? row.folder : '',
        tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        notes: typeof row.notes === 'string' ? row.notes : typeof row.note === 'string' ? row.note : '',
      },
    ]
  })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseNetscapeHtml(html: string): ImportBookmark[] {
  const rows: ImportBookmark[] = []
  const stack: string[] = []
  for (const token of html.split(/<(?=DL|\/DL|DT)/i)) {
    const heading = token.match(/<H3[^>]*>([^<]*)<\/H3>/i)
    if (heading) {
      stack.push(decodeHtml(heading[1]))
      continue
    }
    if (/^\/DL/i.test(token)) {
      stack.pop()
      continue
    }
    const link = token.match(/<A[^>]*HREF="([^"]+)"[^>]*>([^<]*)<\/A>/i)
    if (!link || !isHttpUrl(decodeHtml(link[1]))) continue
    rows.push({
      title: decodeHtml(link[2]) || decodeHtml(link[1]),
      url: decodeHtml(link[1]),
      folderPath: stack.join(FOLDER_SEPARATOR),
      tags: [],
      notes: '',
    })
  }
  return rows
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function buildImportPreview(
  imported: ImportBookmark[],
  existing: readonly BookmarkRow[],
): ImportPreview {
  const known = new Set(existing.map((row) => canonicalizeBookmarkUrl(row.url)))
  const folders = [...new Set(imported.map((row) => row.folderPath).filter(Boolean))]
  const duplicates = imported.filter((row) => known.has(canonicalizeBookmarkUrl(row.url))).length
  return {
    bookmarks: imported,
    folders,
    duplicates,
    selected: imported.map(() => true),
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportNestedBookmarkHtml(library: BookmarkLibrary): string {
  const byParent = new Map<string, BookmarkFolder[]>()
  for (const folder of library.folders) {
    const parent = folder.parentId ?? '0'
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder])
  }
  const rowsByParent = new Map<string, BookmarkRow[]>()
  for (const row of library.rows) {
    const parent = row.parentId ?? '0'
    rowsByParent.set(parent, [...(rowsByParent.get(parent) ?? []), row])
  }
  const body = emitFolder('0', byParent, rowsByParent, 1)
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${body}</DL><p>\n`
}

function emitFolder(
  parentId: string,
  byParent: Map<string, BookmarkFolder[]>,
  rowsByParent: Map<string, BookmarkRow[]>,
  depth: number,
): string {
  const pad = '    '.repeat(depth)
  let html = ''
  for (const folder of byParent.get(parentId) ?? []) {
    html += `${pad}<DT><H3>${escapeHtml(folder.title)}</H3>\n${pad}<DL><p>\n`
    html += emitFolder(folder.id, byParent, rowsByParent, depth + 1)
    html += `${pad}</DL><p>\n`
  }
  for (const row of rowsByParent.get(parentId) ?? []) {
    const added = row.dateAdded ? ` ADD_DATE="${Math.floor(row.dateAdded / 1000)}"` : ''
    html += `${pad}<DT><A HREF="${escapeHtml(row.url)}"${added}>${escapeHtml(row.title)}</A>\n`
  }
  return html
}

export function exportOverlayJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}
