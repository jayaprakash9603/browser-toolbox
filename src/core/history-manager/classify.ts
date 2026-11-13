import type { HistoryContentType } from './types'

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico', 'bmp'])
const VIDEO = new Set(['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi'])
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'])
const ARCHIVE = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'dmg', 'apk'])

function extensionFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname
    const dot = path.lastIndexOf('.')
    if (dot === -1) return ''
    const ext = path.slice(dot + 1).split('/')[0]?.toLowerCase() ?? ''
    return ext.length <= 8 ? ext : ''
  } catch {
    return ''
  }
}

export function contentTypeFromUrl(url: string): Exclude<HistoryContentType, 'all'> {
  const lower = url.toLowerCase()
  if (lower.includes('.pdf') || lower.endsWith('.pdf')) return 'pdf'
  const ext = extensionFromUrl(url)
  if (IMAGE.has(ext)) return 'image'
  if (VIDEO.has(ext)) return 'video'
  if (AUDIO.has(ext)) return 'audio'
  if (ARCHIVE.has(ext) || lower.includes('/download')) return 'download'
  return 'webpage'
}

export function matchesContentType(url: string, filter: HistoryContentType): boolean {
  if (filter === 'all') return true
  return contentTypeFromUrl(url) === filter
}
