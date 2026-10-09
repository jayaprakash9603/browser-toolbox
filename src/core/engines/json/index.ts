export interface JsonError {
  message: string
  line?: number
  column?: number
  suggestion?: string
}

export type JsonResult<T> = { ok: true; value: T } | { ok: false; error: JsonError }

const POSITION_PATTERN = /position\s+(\d+)/i
const LINE_COLUMN_PATTERN = /line\s+(\d+)\s+column\s+(\d+)/i

function locateByPosition(source: string, position: number): { line: number; column: number } {
  const before = source.slice(0, position)
  const line = before.split('\n').length
  const column = position - (before.lastIndexOf('\n') + 1) + 1
  return { line, column }
}

function suggestFix(source: string, message: string, position?: number): string | undefined {
  if (/unexpected end of (json )?input/i.test(message)) {
    const open = (source.match(/[{[]/g) ?? []).length
    const close = (source.match(/[}\]]/g) ?? []).length
    if (open > close) return 'Missing closing bracket or brace — the input ends early.'
    return 'The input is incomplete.'
  }
  if (/property name|key must be|double quotes/i.test(message)) {
    const trailing =
      position !== undefined &&
      /,\s*[}\]]/.test(source.slice(Math.max(0, position - 3), position + 1))
    if (trailing) return 'Trailing comma — remove the comma before the closing bracket or brace.'
    return 'JSON requires double quotes around property names and strings.'
  }
  if (/unexpected token/i.test(message) && position !== undefined) {
    const near = source.slice(Math.max(0, position - 2), position + 1)
    if (/,\s*[}\]]/.test(source.slice(Math.max(0, position - 3), position + 1))) {
      return 'Trailing comma — remove the comma before the closing bracket or brace.'
    }
    if (near.includes('}') || near.includes(']'))
      return 'Unexpected closing bracket — check for a missing value or extra bracket.'
  }
  return undefined
}

export function parseJson(source: string): JsonResult<unknown> {
  if (!source.trim()) {
    return {
      ok: false,
      error: { message: 'Input is empty.', suggestion: 'Paste JSON text to get started.' },
    }
  }
  try {
    return { ok: true, value: JSON.parse(source) }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    const error: JsonError = { message: 'Invalid JSON' }
    const lineColumn = LINE_COLUMN_PATTERN.exec(message)
    const positionMatch = POSITION_PATTERN.exec(message)
    let position: number | undefined
    if (lineColumn) {
      error.line = Number(lineColumn[1])
      error.column = Number(lineColumn[2])
      const lines = source.split('\n')
      position =
        lines.slice(0, error.line - 1).reduce((sum, line) => sum + line.length + 1, 0) +
        (error.column - 1)
    } else if (positionMatch) {
      position = Number(positionMatch[1])
      Object.assign(error, locateByPosition(source, position))
    }
    error.message = message
    const suggestion = suggestFix(source, message, position)
    if (suggestion) error.suggestion = suggestion
    return { ok: false, error }
  }
}

export function validateJson(source: string): { valid: boolean; error?: JsonError } {
  const result = parseJson(source)
  return result.ok ? { valid: true } : { valid: false, error: result.error }
}

export function formatJson(source: string, indent: number | string = 2): JsonResult<string> {
  const parsed = parseJson(source)
  if (!parsed.ok) return parsed
  return { ok: true, value: JSON.stringify(parsed.value, null, indent) }
}

export function minifyJson(source: string): JsonResult<string> {
  const parsed = parseJson(source)
  if (!parsed.ok) return parsed
  return { ok: true, value: JSON.stringify(parsed.value) }
}

export type JsonTreeNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export interface JsonTreeNode {
  key: string | null
  type: JsonTreeNodeType
  path: string
  children?: JsonTreeNode[]
  value?: string
  size?: number
}

function nodeType(value: unknown): JsonTreeNodeType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const primitive = typeof value
  if (primitive === 'object') return 'object'
  return primitive as JsonTreeNodeType
}

function childPath(parentPath: string, key: string | number): string {
  if (typeof key === 'number') return `${parentPath}[${key}]`
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parentPath}.${key}` : `${parentPath}["${key}"]`
}

export type JsonDiffKind = 'added' | 'removed' | 'changed'

export interface JsonDiffEntry {
  path: string
  kind: JsonDiffKind
  before: unknown
  after: unknown
}

export function diffJsonValues(before: unknown, after: unknown): JsonDiffEntry[] {
  const differences: JsonDiffEntry[] = []
  collectJsonDiff(before, after, '$', differences)
  return differences
}

function collectJsonDiff(
  before: unknown,
  after: unknown,
  path: string,
  differences: JsonDiffEntry[],
): void {
  if (Object.is(before, after)) return
  if (!isDiffContainer(before) || !isDiffContainer(after) || Array.isArray(before) !== Array.isArray(after)) {
    differences.push({ path, kind: 'changed', before, after })
    return
  }

  const beforeKeys = Array.isArray(before)
    ? before.map((_, index) => String(index))
    : Object.keys(before)
  const afterKeys = Array.isArray(after)
    ? after.map((_, index) => String(index))
    : Object.keys(after)
  const keys = [...new Set([...beforeKeys, ...afterKeys])]

  for (const key of keys) {
    const hasBefore = Object.hasOwn(before, key)
    const hasAfter = Object.hasOwn(after, key)
    const child = childPath(path, Array.isArray(before) ? Number(key) : key)
    if (!hasBefore || !hasAfter) {
      differences.push({
        path: child,
        kind: hasAfter ? 'added' : 'removed',
        before: hasBefore ? before[key as keyof typeof before] : undefined,
        after: hasAfter ? after[key as keyof typeof after] : undefined,
      })
      continue
    }
    collectJsonDiff(before[key as keyof typeof before], after[key as keyof typeof after], child, differences)
  }
}

function isDiffContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null
}

export function buildJsonTree(value: unknown, key: string | null = null, path = '$'): JsonTreeNode {
  const type = nodeType(value)
  if (type === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return {
      key,
      type,
      path,
      size: entries.length,
      children: entries.map(([childKey, child]) =>
        buildJsonTree(child, childKey, childPath(path, childKey)),
      ),
    }
  }
  if (type === 'array') {
    const items = value as unknown[]
    return {
      key,
      type,
      path,
      size: items.length,
      children: items.map((child, index) =>
        buildJsonTree(child, String(index), childPath(path, index)),
      ),
    }
  }
  return { key, type, path, value: type === 'string' ? (value as string) : String(value) }
}

function tokenizePath(path: string): (string | number)[] | null {
  const tokens: (string | number)[] = []
  const pattern = /(?:^|\.)([A-Za-z_$][\w$]*)|\["((?:[^"\\]|\\.)*)"\]|\[(\d+)\]/g
  let consumed = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(path))) {
    if (match.index !== consumed) return null
    consumed = pattern.lastIndex
    if (match[1] !== undefined) tokens.push(match[1])
    else if (match[2] !== undefined) tokens.push(match[2].replace(/\\(.)/g, '$1'))
    else tokens.push(Number(match[3]))
  }
  if (consumed !== path.length) return null
  return tokens
}

export function queryJsonPath(value: unknown, path: string): JsonResult<unknown> {
  const trimmed = path.trim()
  if (!trimmed || trimmed === '$') return { ok: true, value }
  if (!trimmed.startsWith('$'))
    return { ok: false, error: { message: 'Path must start with $ (the root).' } }
  const tokens = tokenizePath(trimmed.slice(1))
  if (!tokens)
    return {
      ok: false,
      error: {
        message: 'Invalid path syntax.',
        suggestion: 'Use forms like $.user.name or $.items[0].',
      },
    }
  let current: unknown = value
  for (const token of tokens) {
    if (current === null || typeof current !== 'object') {
      return {
        ok: false,
        error: {
          message: `Cannot read "${String(token)}" — the parent value is not an object or array.`,
        },
      }
    }
    if (typeof token === 'number' && !Array.isArray(current)) {
      return { ok: false, error: { message: `Index [${token}] used on a non-array value.` } }
    }
    const record = current as Record<string, unknown>
    if (!(token in record)) {
      return { ok: false, error: { message: `No value at "${String(token)}".` } }
    }
    current = record[token as string]
  }
  return { ok: true, value: current }
}

export type JsonScalar = string | number | boolean | null

export function flattenObject(
  value: Record<string, unknown>,
  prefix = '',
): Record<string, JsonScalar> {
  const flat: Record<string, JsonScalar> = {}
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object') {
      if (Array.isArray(child)) flat[path] = JSON.stringify(child)
      else Object.assign(flat, flattenObject(child as Record<string, unknown>, path))
    } else {
      flat[path] = child as JsonScalar
    }
  }
  return flat
}

function escapeCsvCell(value: JsonScalar | undefined): string {
  if (value === undefined || value === null) return ''
  const text = typeof value === 'string' ? value : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function rowsFromJson(value: unknown): Record<string, JsonScalar>[] {
  if (Array.isArray(value)) {
    return value.map((item) => (isRecord(item) ? flattenObject(item) : { value: item as JsonScalar }))
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
    const dictionary =
      entries.length > 0 && entries.every(([, child]) => isRecord(child))
    if (dictionary) {
      return entries.map(([key, child]) => ({
        key,
        ...flattenObject(child as Record<string, unknown>),
      }))
    }
    return [flattenObject(value)]
  }
  return [{ value: value as JsonScalar }]
}

export function jsonToCsv(value: unknown): JsonResult<string> {
  const rows = rowsFromJson(value)
  const columns: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key)
  }
  const lines = [columns.map(escapeCsvCell).join(',')]
  for (const row of rows) lines.push(columns.map((column) => escapeCsvCell(row[column])).join(','))
  return { ok: true, value: lines.join('\n') }
}

const XML_IDENTIFIER = /^[A-Za-z_][\w.-]*$/

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function valueToXml(tag: string, value: unknown, indent: string): string {
  if (value === null || typeof value !== 'object') {
    return `${indent}<${tag}>${xmlEscape(value === null ? '' : String(value))}</${tag}>`
  }
  if (Array.isArray(value)) {
    return value.map((item) => valueToXml('item', item, indent)).join('\n')
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([key]) =>
    XML_IDENTIFIER.test(key),
  )
  if (entries.length === 0) return `${indent}<${tag}/>`
  const inner = entries.map(([key, child]) => valueToXml(key, child, indent + '  ')).join('\n')
  return `${indent}<${tag}>\n${inner}\n${indent}</${tag}>`
}

export function jsonToXml(value: unknown, rootTag = 'root'): JsonResult<string> {
  if (!XML_IDENTIFIER.test(rootTag)) {
    return { ok: false, error: { message: `Invalid root tag "${rootTag}".` } }
  }
  return {
    ok: true,
    value: `<?xml version="1.0" encoding="UTF-8"?>\n${valueToXml(rootTag, value, '')}`,
  }
}

export interface TypeScriptOptions {
  rootName?: string
}

function tsIdentifier(name: string): string {
  return XML_IDENTIFIER.test(name) && !/^\d/.test(name) ? name : JSON.stringify(name)
}

function tsTypeOf(value: unknown, name: string, declarations: Map<string, string>): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const itemTypes = [
      ...new Set(value.map((item) => tsTypeOf(item, singularize(name), declarations))),
    ]
    const joined = itemTypes.join(' | ')
    return itemTypes.length === 1 ? `${joined}[]` : `(${joined})[]`
  }
  if (typeof value === 'object') {
    const typeName = toPascalCase(name)
    const entries = Object.entries(value as Record<string, unknown>)
    const body = entries
      .map(([key, child]) => `  ${tsIdentifier(key)}: ${tsTypeOf(child, key, declarations)};`)
      .join('\n')
    declarations.set(typeName, `export interface ${typeName} {\n${body}\n}`)
    return typeName
  }
  return typeof value
}

function toPascalCase(name: string): string {
  const cleaned = name.replace(/[^A-Za-z\d]+(.)/g, (_, char: string) => char.toUpperCase())
  const pascal = cleaned[0]?.toUpperCase() + cleaned.slice(1)
  return /^[A-Za-z]/.test(pascal) ? pascal : `Value${pascal}`
}

function singularize(name: string): string {
  return name.endsWith('s') && name.length > 1 ? name.slice(0, -1) : `${name}Item`
}

export function jsonToTypeScript(
  value: unknown,
  { rootName = 'Root' }: TypeScriptOptions = {},
): string {
  const declarations = new Map<string, string>()
  const rootType = tsTypeOf(value, rootName, declarations)
  if (declarations.size === 0) return `export type ${toPascalCase(rootName)} = ${rootType};`
  const ordered = [...declarations.values()]
  return declarations.has(toPascalCase(rootName))
    ? ordered.reverse().join('\n\n')
    : `export type ${toPascalCase(rootName)} = ${rootType};\n\n${ordered.reverse().join('\n\n')}`
}

function markdownEscape(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function jsonToMarkdownTable(value: unknown): JsonResult<string> {
  const rows = rowsFromJson(value)
  if (rows.length === 0) return { ok: true, value: '' }
  const columns: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key)
  }
  const header = `| ${columns.map(markdownEscape).join(' | ')} |`
  const divider = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map(
    (row) =>
      `| ${columns.map((column) => markdownEscape(row[column] === undefined || row[column] === null ? '' : String(row[column]))).join(' | ')} |`,
  )
  return { ok: true, value: [header, divider, ...body].join('\n') }
}
