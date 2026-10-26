import type { ImageNaming, ImageSaveFormat } from './types'

const EXT: Record<ImageSaveFormat, string> = {
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
  pdf: 'pdf',
}

interface NameSource {
  pageTitle?: string
  imageUrl?: string
  pageUrl?: string
}

/** Safe download basename from page title, image URL, or a generic fallback. */
export function suggestFilename(
  format: ImageSaveFormat,
  opts: NameSource,
  naming: ImageNaming = 'title',
  now: Date = new Date(),
): string {
  const ext = EXT[format]
  if (naming === 'site') {
    const host = hostOf(opts.pageUrl) || hostOf(opts.imageUrl) || 'image'
    return `${host}-${stamp(now)}.${ext}`
  }

  const fromTitle = sanitizeBase(opts.pageTitle)
  const fromImage = basenameFromUrl(opts.imageUrl)
  if (naming === 'image' && fromImage) return swapExtension(fromImage, ext)
  if (fromTitle) return `${fromTitle}.${ext}`
  if (fromImage) return swapExtension(fromImage, ext)

  const fromPage = basenameFromUrl(opts.pageUrl)
  if (fromPage) return `${stripExtension(fromPage) || 'image'}.${ext}`

  return `image-${now.getTime()}.${ext}`
}

/** Download path relative to the Downloads folder. */
export function downloadPath(folder: string, filename: string): string {
  return folder ? `${folder}/${filename}` : filename
}

function hostOf(url?: string): string {
  if (!url || url.startsWith('data:')) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function stamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function sanitizeBase(title?: string): string {
  if (!title) return ''
  const t = title.trim().replace(/[<>:"/\\|?*\p{Cc}]/gu, '').replace(/\s+/g, '-').slice(0, 80)
  return t.replace(/\.+$/g, '')
}

function basenameFromUrl(url?: string): string {
  if (!url) return ''
  try {
    const path = new URL(url).pathname
    const name = path.split('/').filter(Boolean).pop() ?? ''
    return sanitizeBase(decodeURIComponent(name))
  } catch {
    return ''
  }
}

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, '')
}

function swapExtension(name: string, ext: string): string {
  const base = stripExtension(name) || 'image'
  return `${base}.${ext}`
}
