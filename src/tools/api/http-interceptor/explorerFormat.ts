import type { ResponseFormat } from '@/core/engines/api'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'

export function formatExplorerDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1) return '<1 ms'
  if (ms >= 1000) {
    const seconds = ms / 1000
    return `${seconds >= 10 ? seconds.toFixed(1) : seconds.toFixed(2)} s`
  }
  return `${Math.round(ms)} ms`
}

export function formatExplorerSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`
}

export function protocolFromUrl(url: string): 'https' | 'http' | null {
  const trimmed = url.trim()
  if (/^https:\/\//i.test(trimmed)) return 'https'
  if (/^http:\/\//i.test(trimmed)) return 'http'
  try {
    const protocol = new URL(trimmed).protocol
    if (protocol === 'https:') return 'https'
    if (protocol === 'http:') return 'http'
  } catch {
    /* ignore invalid URLs */
  }
  return null
}

export function countEnabledKv(rows: { enabled: boolean; key: string }[]): number {
  return rows.filter((row) => row.enabled && row.key.trim()).length
}

export function contentTypeFromHeaders(headers: [string, string][] | undefined): string {
  return headers?.find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? ''
}

export function explorerEditorLanguage(
  body: string,
  contentType = '',
  format?: ResponseFormat,
): EditorLanguage {
  if (/javascript|ecmascript|jsonp/i.test(contentType)) return 'javascript'
  if (/json/i.test(contentType)) return 'json'
  if (/html/i.test(contentType)) return 'html'
  if (/xml|svg/i.test(contentType)) return 'xml'
  if (/css/i.test(contentType)) return 'css'
  if (format === 'json') return 'json'
  if (format === 'html') return 'html'
  if (format === 'xml') return 'xml'
  const trimmed = body.trim()
  if (/^(\(|function\b|const\b|let\b|var\b|import\b|export\b|\/\*|\/\/)/.test(trimmed)) return 'javascript'
  return 'text'
}

export function statusPillClass(status?: number): string {
  if (status == null) return 'border-border bg-muted text-muted-foreground'
  if (status >= 400) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400'
  }
  if (status >= 300) {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-400'
  }
  if (status >= 200) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-400'
  }
  return 'border-border bg-muted text-muted-foreground'
}

export function prettyLanguageLabel(language: EditorLanguage): string {
  if (language === 'javascript') return 'JavaScript'
  if (language === 'json') return 'JSON'
  if (language === 'html') return 'HTML'
  if (language === 'xml') return 'XML'
  if (language === 'css') return 'CSS'
  return 'Text'
}
