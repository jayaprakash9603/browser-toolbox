/** File types that can run code on the user's machine when opened. */
const RISKY_EXTENSIONS = new Set([
  'exe',
  'msi',
  'msix',
  'appx',
  'scr',
  'com',
  'pif',
  'bat',
  'cmd',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'hta',
  'cpl',
  'lnk',
  'jar',
  'apk',
  'dmg',
  'pkg',
  'sh',
  'run',
  'reg',
  'docm',
  'xlsm',
  'pptm',
  'xll',
])

const RISKY_MIME = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/vnd.microsoft.portable-executable',
  'application/x-msi',
  'application/x-ms-installer',
  'application/java-archive',
  'application/vnd.android.package-archive',
  'application/x-apple-diskimage',
  'application/x-sh',
  'application/hta',
])

export interface DownloadSignals {
  filename: string
  url: string
  mime: string
  /** True when the user clicked or pressed a key on the source page within the gesture window. */
  userInitiated: boolean
  /** List category of the source host, if any. */
  threatCategory: string | null
}

export type DownloadVerdict =
  | { action: 'allow' }
  | { action: 'block'; reason: 'threat_host' }
  | { action: 'confirm'; reason: 'automatic_executable' }

export function fileExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const clean = base.split(/[?#]/)[0]
  const dot = clean.lastIndexOf('.')
  return dot > 0 ? clean.slice(dot + 1).toLowerCase() : ''
}

export function isRiskyFile(filename: string, url: string, mime: string): boolean {
  if (RISKY_MIME.has(mime.toLowerCase())) return true
  const ext = fileExtension(filename) || fileExtension(safePath(url))
  return RISKY_EXTENSIONS.has(ext)
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return ''
  }
}

/** Host of a download URL; `blob:https://site/uuid` resolves to `site`. */
export function downloadHost(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'blob:') return new URL(parsed.pathname).hostname
    return parsed.hostname
  } catch {
    return ''
  }
}

export function assessDownload(signals: DownloadSignals): DownloadVerdict {
  if (signals.threatCategory) return { action: 'block', reason: 'threat_host' }
  if (!signals.userInitiated && isRiskyFile(signals.filename, signals.url, signals.mime)) {
    return { action: 'confirm', reason: 'automatic_executable' }
  }
  return { action: 'allow' }
}
