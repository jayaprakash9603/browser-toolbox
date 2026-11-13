import { basenameFromUrl, hostFromUrl } from './urls'
import { classifyFile, categorySubfolder, extensionFromPath } from './classify'
import type { FileCategory } from './types'
import type { DownloadManagerSettings, FilenamePattern } from './types'

function sanitizeSegment(segment: string): string {
  let out = ''
  for (const char of segment) {
    if (char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char)) out += '_'
    else out += char
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, 160) || 'download'
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export interface FilenameBuildInput {
  url: string
  referrer?: string
  mime?: string
  suggestedName?: string
}

export function buildBaseName(input: FilenameBuildInput): string {
  if (input.suggestedName) {
    const base = input.suggestedName.split(/[\\/]/).pop() ?? input.suggestedName
    return sanitizeSegment(base.replace(/\.[a-z0-9]{2,8}$/i, '') || base)
  }
  return sanitizeSegment(basenameFromUrl(input.url).replace(/\.[a-z0-9]{2,8}$/i, '') || 'download')
}

export function buildFilename(
  settings: Pick<DownloadManagerSettings, 'filenamePattern' | 'customFilenameTemplate'>,
  input: FilenameBuildInput,
  now = new Date(),
): string {
  const ext = extensionFromPath(input.suggestedName ?? input.url) || mimeToExt(input.mime) || 'bin'
  const host = hostFromUrl(input.referrer || input.url)
  const name = buildBaseName(input)
  let stem: string
  switch (settings.filenamePattern as FilenamePattern) {
    case 'host-name':
      stem = `${host}-${name}`
      break
    case 'date-name':
      stem = `${formatDate(now)}-${name}`
      break
    case 'host-date-name':
      stem = `${host}-${formatDate(now)}-${name}`
      break
    case 'custom':
      stem = applyCustomTemplate(settings.customFilenameTemplate, { host, name, ext, date: formatDate(now) })
      break
    case 'original':
    default: {
      const original = input.suggestedName?.split(/[\\/]/).pop()
      return original ? sanitizeSegment(original) : `${name}.${ext}`
    }
  }
  if (!stem.toLowerCase().endsWith(`.${ext}`)) stem = `${stem}.${ext}`
  return sanitizeSegment(stem.replace(/\//g, '-'))
}

function applyCustomTemplate(
  template: string,
  ctx: { host: string; name: string; ext: string; date: string },
): string {
  return template
    .replace(/\{host\}/g, sanitizeSegment(ctx.host))
    .replace(/\{name\}/g, sanitizeSegment(ctx.name))
    .replace(/\{ext\}/g, ctx.ext)
    .replace(/\{date\}/g, ctx.date)
}

function mimeToExt(mime?: string): string {
  const m = (mime ?? '').toLowerCase()
  if (m.includes('pdf')) return 'pdf'
  if (m.includes('jpeg')) return 'jpg'
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  if (m.includes('zip')) return 'zip'
  if (m.includes('mpeg')) return 'mp3'
  if (m.includes('mp4')) return 'mp4'
  return ''
}

export function buildOrganizedPath(
  settings: Pick<DownloadManagerSettings, 'categorySubfolders' | 'filenamePattern' | 'customFilenameTemplate'>,
  input: FilenameBuildInput,
): string {
  const fileName = buildFilename(settings, input)
  if (!settings.categorySubfolders) return fileName
  const category = classifyFile(input.mime, input.url) as FileCategory
  const folder = categorySubfolder(category)
  return `${folder}/${fileName}`
}
