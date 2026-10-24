import { stringify } from 'yaml'

import { parseCsv } from '@/core/engines/csv'
import { parseJson, rowsFromJson } from '@/core/engines/json'
import { parseXml } from '@/core/engines/xml'
import { parseYaml } from '@/core/engines/yaml'

import { escapeHtml } from './document'
import { xmlEscape } from './docx'

export type DataFormat = 'json' | 'csv' | 'tsv' | 'yaml' | 'xml'
export type DataTarget = 'json' | 'csv' | 'tsv' | 'yaml' | 'xml' | 'mdtable' | 'htmltable'
export type DataResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface ParsedData {
  value: unknown
  /** Header row first; used for spreadsheet, PDF and table outputs. */
  table: string[][]
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function tableFromValue(value: unknown): string[][] {
  const rows = rowsFromJson(value)
  const columns: string[] = []
  for (const row of rows) for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key)
  return [columns, ...rows.map((row) => columns.map((column) => cellText(row[column])))]
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((raw, index) => {
    const base = raw.trim() || `column_${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count ? `${base}_${count + 1}` : base
  })
}

function parseJsonLines(source: string): unknown[] | null {
  const lines = source.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return null
  const values: unknown[] = []
  for (const line of lines) {
    const parsed = parseJson(line)
    if (!parsed.ok) return null
    values.push(parsed.value)
  }
  return values
}

export function parseDataSource(source: string, format: DataFormat, name = ''): DataResult<ParsedData> {
  if (!source.trim()) return { ok: false, error: 'The file is empty.' }
  if (format === 'csv' || format === 'tsv') {
    const parsed = parseCsv(source, format === 'tsv' ? { delimiter: '\t' } : {})
    if (!parsed.ok) return parsed
    const [headerRow = [], ...body] = parsed.value
    const headers = uniqueHeaders(headerRow)
    const records = body.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])))
    return { ok: true, value: { value: records, table: parsed.value } }
  }
  let value: unknown
  if (format === 'json') {
    const lines = /\.(jsonl|ndjson)$/i.test(name) ? parseJsonLines(source) : null
    if (lines) value = lines
    else {
      const parsed = parseJson(source)
      if (!parsed.ok) {
        const fallback = parseJsonLines(source)
        if (!fallback) return { ok: false, error: parsed.error.message }
        value = fallback
      } else value = parsed.value
    }
  } else if (format === 'yaml') {
    const parsed = parseYaml(source)
    if (!parsed.ok) return parsed
    value = parsed.value
  } else {
    const parsed = parseXml(source)
    if (!parsed.ok) return parsed
    value = stripDeclarations(parsed.value)
  }
  return { ok: true, value: { value, table: tableFromValue(value) } }
}

function stripDeclarations(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith('?')))
}

function delimited(table: string[][], delimiter: string): string {
  const escape = (cell: string) =>
    cell.includes('"') || cell.includes(delimiter) || /[\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
  return table.map((row) => row.map((cell) => escape(cell ?? '')).join(delimiter)).join('\n')
}

function xmlName(key: string): string {
  let name = key.replace(/[^A-Za-z0-9_.-]/g, '_')
  if (!/^[A-Za-z_]/.test(name)) name = `_${name}`
  return name
}

function toXml(tag: string, value: unknown, depth: number): string {
  const pad = '  '.repeat(depth)
  if (value === null || value === undefined) return `${pad}<${tag}/>`
  if (typeof value !== 'object') return `${pad}<${tag}>${xmlEscape(String(value))}</${tag}>`
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}<${tag}/>`
    return `${pad}<${tag}>\n${value.map((item) => toXml('item', item, depth + 1)).join('\n')}\n${pad}</${tag}>`
  }
  const record = value as Record<string, unknown>
  const attrs = Object.entries(record)
    .filter(([key]) => key.startsWith('@_'))
    .map(([key, child]) => ` ${xmlName(key.slice(2))}="${xmlEscape(cellText(child))}"`)
    .join('')
  const children = Object.entries(record).filter(([key]) => !key.startsWith('@_') && key !== '#text')
  const text = record['#text']
  if (!children.length) {
    return text === undefined ? `${pad}<${tag}${attrs}/>` : `${pad}<${tag}${attrs}>${xmlEscape(cellText(text))}</${tag}>`
  }
  const inner = children
    .map(([key, child]) =>
      Array.isArray(child)
        ? child.map((item) => toXml(xmlName(key), item, depth + 1)).join('\n')
        : toXml(xmlName(key), child, depth + 1),
    )
    .join('\n')
  return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`
}

export function valueToXml(value: unknown): string {
  const entries = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []
  const single = entries.length === 1 && entries[0][1] && typeof entries[0][1] === 'object' && !Array.isArray(entries[0][1])
  const body = single ? toXml(xmlName(entries[0][0]), entries[0][1], 0) : toXml('root', value, 0)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`
}

export function tableToMarkdown(table: string[][]): string {
  const [header = [], ...body] = table
  const columns = Math.max(header.length, ...body.map((row) => row.length), 1)
  const cell = (value: string | undefined) => (value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
  const row = (cells: string[]) => `| ${Array.from({ length: columns }, (_, index) => cell(cells[index])).join(' | ')} |`
  return [row(header), `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`, ...body.map(row)].join('\n')
}

export function tableToHtml(table: string[][], title: string): string {
  const [header = [], ...body] = table
  const head = header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')
  const rows = body.map((row) => `<tr>${header.map((_, index) => `<td>${escapeHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body { margin: 24px; font: 14px/1.45 system-ui, 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #f8fafc; }
h1 { font-size: 18px; margin: 0 0 12px; }
.wrap { overflow: auto; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
table { border-collapse: collapse; min-width: 100%; }
th, td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; white-space: nowrap; }
th { position: sticky; top: 0; background: #eef2ff; font-weight: 600; }
tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="wrap"><table>
<thead><tr>${head}</tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
</body>
</html>
`
}

export function serializeData(parsed: ParsedData, target: DataTarget, title = 'Data'): DataResult<string> {
  try {
    switch (target) {
      case 'json':
        return { ok: true, value: `${JSON.stringify(parsed.value, null, 2)}\n` }
      case 'csv':
        return { ok: true, value: `${delimited(parsed.table, ',')}\n` }
      case 'tsv':
        return { ok: true, value: `${delimited(parsed.table, '\t')}\n` }
      case 'yaml':
        return { ok: true, value: stringify(parsed.value, { indent: 2 }) }
      case 'xml':
        return { ok: true, value: valueToXml(parsed.value) }
      case 'mdtable':
        return { ok: true, value: `${tableToMarkdown(parsed.table)}\n` }
      case 'htmltable':
        return { ok: true, value: tableToHtml(parsed.table, title) }
    }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Conversion failed.' }
  }
}
