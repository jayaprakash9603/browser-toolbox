import { guessExtFromUrl } from './normalize'

export interface FilenameContext {
  index: number
  url: string
  pageUrl: string
  pageTitle: string
  ext?: string | null
}

function sanitizeSegment(segment: string): string {
  let out = ''
  for (const char of segment) {
    const code = char.charCodeAt(0)
    if (code < 32 || '<>:"/\\|?*'.includes(char)) out += '_'
    else out += char
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, 120) || 'image'
}

function hostFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return 'page'
  }
}

function baseNameFromUrl(url: string): string {
  if (url.startsWith('data:')) return 'inline-image'
  try {
    const path = new URL(url).pathname
    const base = path.split('/').pop() ?? 'image'
    const withoutExt = base.replace(/\.[a-z0-9]{2,5}$/i, '')
    return sanitizeSegment(withoutExt || 'image')
  } catch {
    return 'image'
  }
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function applyFilenameTemplate(template: string, ctx: FilenameContext, now = new Date()): string {
  const ext = (ctx.ext ?? guessExtFromUrl(ctx.url) ?? 'jpg').replace(/^\./, '')
  const pageHost = hostFrom(ctx.pageUrl)
  const replacements: Record<string, string> = {
    '{name}': baseNameFromUrl(ctx.url),
    '{index}': String(ctx.index).padStart(3, '0'),
    '{host}': pageHost,
    '{ext}': ext,
    '{date}': formatDate(now),
  }
  let out = template
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(sanitizeSegment(value))
  }
  if (!out.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
    out = `${out}.${ext}`
  }
  return sanitizeSegment(out.replace(/\//g, '-'))
}

export function buildDownloadPath(subfolderTemplate: string, fileName: string, ctx: FilenameContext): string {
  const pageHost = hostFrom(ctx.pageUrl)
  const folder = subfolderTemplate
    .split('/')
    .map((part) =>
      sanitizeSegment(
        part
          .replace(/\{host\}/g, pageHost)
          .replace(/\{date\}/g, formatDate(new Date()))
          .trim(),
      ),
    )
    .filter(Boolean)
    .join('/')
  return folder ? `${folder}/${fileName}` : fileName
}
