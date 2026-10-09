import { detectDelimiter } from '@/core/engines/csv'

export type TextFileKind = 'csv' | 'json' | 'text'
export type FileTab = TextFileKind | 'pdf'

export interface LoadedFile {
  name: string
  size: number
  lastModified: number
  content: string
}

const EXTENSIONS: Record<TextFileKind, string[]> = {
  csv: ['.csv', '.tsv'],
  json: ['.json', '.geojson', '.jsonl'],
  text: ['.txt', '.md', '.log', '.xml', '.yaml', '.yml', '.ini', '.env', '.sql'],
}

export function acceptFor(kind: TextFileKind): string {
  return EXTENSIONS[kind].join(',')
}

export function acceptLabel(kind: TextFileKind): string {
  return EXTENSIONS[kind].map((ext) => ext.slice(1).toUpperCase()).join(', ')
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export function detectFileKind(file: Pick<File, 'name' | 'type'>): TextFileKind | null {
  const ext = extensionOf(file.name)
  for (const kind of Object.keys(EXTENSIONS) as TextFileKind[]) {
    if (EXTENSIONS[kind].includes(ext)) return kind
  }
  if (file.type === 'text/csv' || file.type === 'text/tab-separated-values') return 'csv'
  if (file.type === 'application/json') return 'json'
  if (file.type.startsWith('text/')) return 'text'
  return null
}

export function splitFileName(name: string): { base: string; extension: string } {
  const ext = extensionOf(name)
  return ext && ext.length < name.length
    ? { base: name.slice(0, -ext.length), extension: ext.slice(1).toUpperCase() }
    : { base: name, extension: '' }
}

export function countLines(content: string): number {
  if (!content) return 0
  const lines = content.split(/\r\n|\r|\n/)
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
}

const DELIMITER_NAMES: Record<string, string> = {
  ',': 'Comma',
  '\t': 'Tab',
  ';': 'Semicolon',
  '|': 'Pipe',
}

export function delimiterLabel(content: string): string {
  const delimiter = detectDelimiter(content.split(/\r?\n/, 1)[0] ?? '')
  return DELIMITER_NAMES[delimiter] ?? `"${delimiter}"`
}

export async function readLoadedFile(file: File): Promise<LoadedFile> {
  const raw = await file.text()
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    content: raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw,
  }
}
