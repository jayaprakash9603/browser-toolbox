export type CsvResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface CsvParseOptions {
  delimiter?: string
}

export function detectDelimiter(line: string): string {
  const candidates = [',', '\t', ';', '|']
  let best = ','
  let bestCount = 0
  for (const candidate of candidates) {
    const count = line.split(candidate).length - 1
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

export function parseCsv(source: string, options: CsvParseOptions = {}): CsvResult<string[][]> {
  if (!source.trim()) return { ok: false, error: 'Input is empty.' }
  const delimiter = options.delimiter ?? detectDelimiter(source.split(/\r?\n/)[0])
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  if (inQuotes) return { ok: false, error: 'Unclosed quoted field.' }
  row.push(field)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  if (rows.length === 0) return { ok: false, error: 'No rows found.' }
  return { ok: true, value: rows }
}

export interface CsvTable {
  headers: string[]
  records: Record<string, string>[]
}

export function csvToRecords(source: string, options: CsvParseOptions = {}): CsvResult<CsvTable> {
  const parsed = parseCsv(source, options)
  if (!parsed.ok) return parsed
  const [headers, ...dataRows] = parsed.value
  const records = dataRows.map((cells) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? ''
    })
    return record
  })
  return { ok: true, value: { headers, records } }
}

export function csvToJson(source: string, options: CsvParseOptions = {}, indent: number | string = 2): CsvResult<string> {
  const table = csvToRecords(source, options)
  if (!table.ok) return table
  return { ok: true, value: JSON.stringify(table.value.records, null, indent) }
}

function escapeCell(value: unknown, delimiter: string): string {
  const text = value === null || value === undefined ? '' : String(value)
  return text.includes('"') || text.includes(delimiter) || /[\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

export function recordsToCsv(records: Record<string, unknown>[], delimiter = ','): string {
  const columns: string[] = []
  for (const record of records) {
    for (const key of Object.keys(record)) if (!columns.includes(key)) columns.push(key)
  }
  const lines = [columns.map((column) => escapeCell(column, delimiter)).join(delimiter)]
  for (const record of records) {
    lines.push(columns.map((column) => escapeCell(record[column], delimiter)).join(delimiter))
  }
  return lines.join('\n')
}

export function jsonToCsv(source: string, delimiter = ','): CsvResult<string> {
  if (!source.trim()) return { ok: false, error: 'Input is empty.' }
  try {
    const value: unknown = JSON.parse(source)
    if (!Array.isArray(value)) {
      return { ok: false, error: 'JSON → CSV requires a top-level array of objects.' }
    }
    const records = value.map((item) =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : { value: item },
    )
    return { ok: true, value: recordsToCsv(records, delimiter) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Invalid JSON.' }
  }
}

export function csvToTsv(source: string): CsvResult<string> {
  const parsed = parseCsv(source)
  if (!parsed.ok) return parsed
  return { ok: true, value: parsed.value.map((row) => row.map((cell) => escapeCell(cell, '\t')).join('\t')).join('\n') }
}

export function tsvToCsv(source: string): CsvResult<string> {
  const parsed = parseCsv(source, { delimiter: '\t' })
  if (!parsed.ok) return parsed
  return { ok: true, value: parsed.value.map((row) => row.map((cell) => escapeCell(cell, ',')).join(',')).join('\n') }
}

export function csvToMarkdown(source: string, options: CsvParseOptions = {}): CsvResult<string> {
  const parsed = parseCsv(source, options)
  if (!parsed.ok) return parsed
  const [headers, ...rows] = parsed.value
  const escapeMd = (cell: string) => cell.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const lines = [
    `| ${headers.map(escapeMd).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((_, index) => escapeMd(row[index] ?? '')).join(' | ')} |`),
  ]
  return { ok: true, value: lines.join('\n') }
}
