import type { DataRow, FieldValue, ValueKind } from './fields'

export type ExportFormat = 'json' | 'ndjson' | 'csv' | 'tsv' | 'sql' | 'markdown' | 'xml'

export const EXPORT_FORMATS: readonly {
  id: ExportFormat
  label: string
  extension: string
  mime: string
}[] = [
  { id: 'json', label: 'JSON', extension: 'json', mime: 'application/json' },
  { id: 'ndjson', label: 'NDJSON', extension: 'ndjson', mime: 'application/x-ndjson' },
  { id: 'csv', label: 'CSV', extension: 'csv', mime: 'text/csv' },
  { id: 'tsv', label: 'TSV', extension: 'tsv', mime: 'text/tab-separated-values' },
  { id: 'sql', label: 'SQL', extension: 'sql', mime: 'application/sql' },
  { id: 'markdown', label: 'Markdown', extension: 'md', mime: 'text/markdown' },
  { id: 'xml', label: 'XML', extension: 'xml', mime: 'application/xml' },
]

export interface ExportOptions {
  /** Table name for SQL, root element for XML. */
  name?: string
  /** Column kinds drive SQL `CREATE TABLE` types. */
  kinds?: readonly ValueKind[]
  includeSchema?: boolean
}

function text(value: FieldValue): string {
  return value === null ? '' : String(value)
}

function escapeDelimited(value: string, delimiter: string): string {
  return value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function delimited(rows: readonly DataRow[], columns: readonly string[], delimiter: string): string {
  const lines = [columns.map((column) => escapeDelimited(column, delimiter)).join(delimiter)]
  for (const row of rows) {
    lines.push(columns.map((column) => escapeDelimited(text(row[column] ?? null), delimiter)).join(delimiter))
  }
  return lines.join('\n')
}

export function sqlIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function sqlValue(value: FieldValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return `'${value.replace(/'/g, "''")}'`
}

const SQL_TYPES: Record<ValueKind, string> = {
  text: 'TEXT',
  integer: 'INTEGER',
  decimal: 'NUMERIC',
  boolean: 'BOOLEAN',
}

function toSql(rows: readonly DataRow[], columns: readonly string[], options: ExportOptions): string {
  const table = sqlIdentifier(options.name?.trim() || 'test_data')
  const columnList = columns.map(sqlIdentifier).join(', ')
  const parts: string[] = []
  if (options.includeSchema) {
    const definitions = columns.map(
      (column, index) => `  ${sqlIdentifier(column)} ${SQL_TYPES[options.kinds?.[index] ?? 'text']}`,
    )
    parts.push(`CREATE TABLE IF NOT EXISTS ${table} (\n${definitions.join(',\n')}\n);`)
  }
  if (rows.length > 0) {
    const values = rows.map((row) => `  (${columns.map((column) => sqlValue(row[column] ?? null)).join(', ')})`)
    parts.push(`INSERT INTO ${table} (${columnList}) VALUES\n${values.join(',\n')};`)
  }
  return parts.join('\n\n')
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

function toMarkdown(rows: readonly DataRow[], columns: readonly string[]): string {
  const header = `| ${columns.map(escapeMarkdown).join(' | ')} |`
  const divider = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map(
    (row) => `| ${columns.map((column) => escapeMarkdown(text(row[column] ?? null))).join(' | ')} |`,
  )
  return [header, divider, ...body].join('\n')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function xmlName(value: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_.-]/g, '_')
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`
}

function toXml(rows: readonly DataRow[], columns: readonly string[], options: ExportOptions): string {
  const root = xmlName(options.name?.trim() || 'records')
  const tags = columns.map(xmlName)
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', `<${root}>`]
  for (const row of rows) {
    lines.push('  <record>')
    columns.forEach((column, index) => {
      const value = row[column] ?? null
      lines.push(
        value === null
          ? `    <${tags[index]} nil="true"/>`
          : `    <${tags[index]}>${escapeXml(String(value))}</${tags[index]}>`,
      )
    })
    lines.push('  </record>')
  }
  lines.push(`</${root}>`)
  return lines.join('\n')
}

export function formatDataset(
  rows: readonly DataRow[],
  columns: readonly string[],
  format: ExportFormat,
  options: ExportOptions = {},
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(rows, null, 2)
    case 'ndjson':
      return rows.map((row) => JSON.stringify(row)).join('\n')
    case 'csv':
      return delimited(rows, columns, ',')
    case 'tsv':
      return delimited(rows, columns, '\t')
    case 'sql':
      return toSql(rows, columns, options)
    case 'markdown':
      return toMarkdown(rows, columns)
    case 'xml':
      return toXml(rows, columns, options)
  }
}

export function byteSize(value: string): number {
  return new TextEncoder().encode(value).length
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
