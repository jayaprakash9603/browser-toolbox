import type { FileCategory } from './types'

const EXECUTABLE = new Set([
  'exe',
  'msi',
  'msp',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'apk',
  'appimage',
  'bat',
  'cmd',
  'com',
  'scr',
  'jar',
])

const APPLICATION = new Set(['app', 'ipa', 'xapk', 'msix', 'appx'])

const IMAGE = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico', 'heic', 'tif', 'tiff'])
const VIDEO = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv'])
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba'])
const ARCHIVE = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'])
const DOCUMENT = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp'])
const CODE = new Set([
  'js',
  'ts',
  'jsx',
  'tsx',
  'css',
  'html',
  'htm',
  'json',
  'xml',
  'yaml',
  'yml',
  'sql',
  'py',
  'java',
  'go',
  'rs',
  'php',
  'rb',
  'c',
  'cpp',
  'cs',
  'sh',
])
const FONT = new Set(['ttf', 'otf', 'woff', 'woff2', 'eot'])

const MIME_MAP: [RegExp, FileCategory][] = [
  [/^image\//, 'images'],
  [/^video\//, 'videos'],
  [/^audio\//, 'audio'],
  [/^application\/pdf/, 'pdfs'],
  [
    /spreadsheet|ms-excel|wordprocessing|msword|presentation|powerpoint|text\/plain|text\/csv/,
    'documents',
  ],
  [/zip|compressed|x-rar|x-7z|gzip|tar/, 'archives'],
  [/javascript|json|xml|yaml|html/, 'development'],
  [/font|woff/, 'fonts'],
  [/x-msdownload|x-dosexec|x-msi|octet-stream/, 'executables'],
]

export function extensionFromPath(pathOrUrl: string): string {
  const clean = pathOrUrl.split(/[?#]/)[0] ?? ''
  const base = clean.split(/[\\/]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1).toLowerCase()
}

export function classifyFile(mime: string | undefined, filenameOrUrl: string): FileCategory {
  const mimeLower = (mime ?? '').toLowerCase()
  for (const [re, cat] of MIME_MAP) {
    if (re.test(mimeLower)) return cat
  }
  const ext = extensionFromPath(filenameOrUrl)
  if (!ext) return 'other'
  if (ext === 'pdf') return 'pdfs'
  if (IMAGE.has(ext)) return 'images'
  if (VIDEO.has(ext)) return 'videos'
  if (AUDIO.has(ext)) return 'audio'
  if (ARCHIVE.has(ext)) return 'archives'
  if (DOCUMENT.has(ext)) return 'documents'
  if (CODE.has(ext)) return 'development'
  if (FONT.has(ext)) return 'fonts'
  if (EXECUTABLE.has(ext)) return 'executables'
  if (APPLICATION.has(ext)) return 'applications'
  return 'other'
}

export function categorySubfolder(category: FileCategory): string {
  switch (category) {
    case 'images':
      return 'Images'
    case 'videos':
      return 'Videos'
    case 'audio':
      return 'Audio'
    case 'documents':
      return 'Documents'
    case 'pdfs':
      return 'Documents'
    case 'archives':
      return 'Archives'
    case 'applications':
    case 'executables':
      return 'Applications'
    case 'development':
      return 'Development'
    case 'fonts':
      return 'Fonts'
    default:
      return 'Other'
  }
}

export function isLikelyDirectFileUrl(url: string): boolean {
  const ext = extensionFromPath(url)
  if (!ext) return false
  const all = new Set([
    ...IMAGE,
    ...VIDEO,
    ...AUDIO,
    ...ARCHIVE,
    ...DOCUMENT,
    ...CODE,
    ...FONT,
    ...EXECUTABLE,
    ...APPLICATION,
    'pdf',
  ])
  return all.has(ext)
}
