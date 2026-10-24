export type FileFamily =
  | 'text'
  | 'markdown'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'image'
  | 'gzip'
  | 'zip'
  | 'binary'

const EXTENSION_FAMILIES: Record<FileFamily, string[]> = {
  text: [
    'txt', 'log', 'ini', 'env', 'cfg', 'conf', 'sql', 'toml', 'properties', 'srt', 'vtt', 'tex',
    'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'htm', 'py', 'rb', 'php',
    'java', 'kt', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'swift', 'sh', 'bash', 'ps1', 'bat', 'gitignore',
  ],
  markdown: ['md', 'markdown', 'mdx'],
  csv: ['csv'],
  tsv: ['tsv', 'tab'],
  json: ['json', 'jsonl', 'ndjson', 'geojson', 'har', 'webmanifest'],
  yaml: ['yaml', 'yml'],
  xml: ['xml', 'rss', 'atom', 'xsd', 'xsl', 'plist', 'kml'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'],
  gzip: ['gz', 'tgz'],
  zip: ['zip'],
  binary: [],
}

const BY_EXTENSION = new Map<string, FileFamily>(
  (Object.entries(EXTENSION_FAMILIES) as [FileFamily, string[]][]).flatMap(([family, list]) =>
    list.map((ext) => [ext, family] as const),
  ),
)

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot >= 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : ''
}

export function stemOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

export function familyOf(file: Pick<File, 'name' | 'type'>): FileFamily {
  const byExt = BY_EXTENSION.get(extensionOf(file.name))
  if (byExt) return byExt
  const type = file.type.toLowerCase()
  if (type === 'text/csv') return 'csv'
  if (type === 'text/tab-separated-values') return 'tsv'
  if (type === 'text/markdown') return 'markdown'
  if (type.includes('json')) return 'json'
  if (type.includes('yaml')) return 'yaml'
  if (type.endsWith('/xml') || type.endsWith('+xml')) return type === 'image/svg+xml' ? 'image' : 'xml'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('text/')) return 'text'
  if (type === 'application/gzip' || type === 'application/x-gzip') return 'gzip'
  if (type === 'application/zip' || type === 'application/x-zip-compressed') return 'zip'
  return 'binary'
}

export function isTextFamily(family: FileFamily): boolean {
  return ['text', 'markdown', 'csv', 'tsv', 'json', 'yaml', 'xml'].includes(family)
}

export type TargetFormat =
  | 'pdf'
  | 'docx'
  | 'html'
  | 'rtf'
  | 'txt'
  | 'json'
  | 'csv'
  | 'tsv'
  | 'yaml'
  | 'xml'
  | 'xlsx'
  | 'mdtable'
  | 'htmltable'
  | 'png'
  | 'jpg'
  | 'webp'
  | 'gz'
  | 'gunzip'
  | 'base64'

export interface TargetMeta {
  label: string
  ext: string
  mime: string
}

export const TARGET_META: Record<TargetFormat, TargetMeta> = {
  pdf: { label: 'PDF', ext: 'pdf', mime: 'application/pdf' },
  docx: { label: 'Word', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  html: { label: 'HTML', ext: 'html', mime: 'text/html;charset=utf-8' },
  rtf: { label: 'RTF', ext: 'rtf', mime: 'application/rtf' },
  txt: { label: 'TXT', ext: 'txt', mime: 'text/plain;charset=utf-8' },
  json: { label: 'JSON', ext: 'json', mime: 'application/json' },
  csv: { label: 'CSV', ext: 'csv', mime: 'text/csv;charset=utf-8' },
  tsv: { label: 'TSV', ext: 'tsv', mime: 'text/tab-separated-values;charset=utf-8' },
  yaml: { label: 'YAML', ext: 'yaml', mime: 'application/yaml' },
  xml: { label: 'XML', ext: 'xml', mime: 'application/xml' },
  xlsx: { label: 'Excel', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  mdtable: { label: 'MD table', ext: 'md', mime: 'text/markdown;charset=utf-8' },
  htmltable: { label: 'HTML table', ext: 'html', mime: 'text/html;charset=utf-8' },
  png: { label: 'PNG', ext: 'png', mime: 'image/png' },
  jpg: { label: 'JPG', ext: 'jpg', mime: 'image/jpeg' },
  webp: { label: 'WebP', ext: 'webp', mime: 'image/webp' },
  gz: { label: 'GZIP', ext: 'gz', mime: 'application/gzip' },
  gunzip: { label: 'Extract', ext: '', mime: 'application/octet-stream' },
  base64: { label: 'Base64', ext: 'txt', mime: 'text/plain;charset=utf-8' },
}

export type TargetGroup = 'document' | 'data' | 'image' | 'gzip' | 'other'

export const TARGET_GROUPS: TargetGroup[] = ['document', 'data', 'image', 'gzip', 'other']

export const GROUP_TARGETS: Record<TargetGroup, TargetFormat[]> = {
  document: ['pdf', 'docx', 'html', 'rtf', 'txt', 'gz', 'base64'],
  data: ['xlsx', 'json', 'csv', 'tsv', 'yaml', 'xml', 'mdtable', 'htmltable', 'pdf', 'gz', 'base64'],
  image: ['png', 'jpg', 'webp', 'pdf', 'base64'],
  gzip: ['gunzip', 'base64'],
  other: ['gz', 'base64'],
}

export const DEFAULT_TARGETS: Record<TargetGroup, TargetFormat[]> = {
  document: ['pdf'],
  data: ['xlsx'],
  image: ['webp'],
  gzip: ['gunzip'],
  other: ['gz'],
}

export function groupOf(family: FileFamily): TargetGroup {
  if (family === 'text' || family === 'markdown') return 'document'
  if (family === 'csv' || family === 'tsv' || family === 'json' || family === 'yaml' || family === 'xml') return 'data'
  if (family === 'image') return 'image'
  if (family === 'gzip') return 'gzip'
  return 'other'
}

/** True when converting would just copy the file under the same format. */
export function isSameFormat(name: string, family: FileFamily, target: TargetFormat): boolean {
  const ext = extensionOf(name)
  if (family === 'image') return target === ext || (target === 'jpg' && ext === 'jpeg')
  if (target === 'txt') return family === 'text' && ext === 'txt'
  return (
    (target === 'csv' && family === 'csv') ||
    (target === 'tsv' && family === 'tsv') ||
    (target === 'json' && family === 'json' && ext === 'json') ||
    (target === 'yaml' && family === 'yaml') ||
    (target === 'xml' && family === 'xml')
  )
}
