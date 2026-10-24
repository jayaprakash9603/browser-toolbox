/**
 * Chrome's on-device AI APIs (Summarizer, Translator, LanguageDetector). They run
 * locally once the model is downloaded and are missing in other browsers.
 */

export type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void
}

interface CreateOptions {
  monitor?: (monitor: DownloadMonitor) => void
  signal?: AbortSignal
}

export type SummaryType = 'key-points' | 'tldr' | 'teaser' | 'headline'
export type SummaryLength = 'short' | 'medium' | 'long'

interface SummarizerInstance {
  summarize(text: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>
  inputQuota?: number
  measureInputUsage?(text: string): Promise<number>
  destroy(): void
}

interface SummarizerApi {
  availability(options?: object): Promise<Availability>
  create(options: CreateOptions & { type: SummaryType; length: SummaryLength; format: 'markdown' | 'plain-text'; sharedContext?: string; outputLanguage?: string }): Promise<SummarizerInstance>
}

interface TranslatorInstance {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>
  destroy(): void
}

interface TranslatorApi {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>
  create(options: CreateOptions & { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorInstance>
}

interface DetectorInstance {
  detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]>
  destroy(): void
}

interface DetectorApi {
  availability(): Promise<Availability>
  create(options?: CreateOptions): Promise<DetectorInstance>
}

const scope = globalThis as unknown as { Summarizer?: SummarizerApi; Translator?: TranslatorApi; LanguageDetector?: DetectorApi }

export function hasSummarizer(): boolean {
  return typeof scope.Summarizer?.create === 'function'
}

export function hasTranslator(): boolean {
  return typeof scope.Translator?.create === 'function'
}

export async function summarizerAvailability(): Promise<Availability> {
  if (!scope.Summarizer) return 'unavailable'
  try {
    return await scope.Summarizer.availability({ type: 'key-points', format: 'markdown', length: 'medium', outputLanguage: 'en' })
  } catch {
    return 'unavailable'
  }
}

export async function translatorAvailability(sourceLanguage: string, targetLanguage: string): Promise<Availability> {
  if (!scope.Translator) return 'unavailable'
  try {
    return await scope.Translator.availability({ sourceLanguage, targetLanguage })
  } catch {
    return 'unavailable'
  }
}

function monitor(onProgress?: (fraction: number) => void) {
  return onProgress
    ? (target: DownloadMonitor) => {
        target.addEventListener('downloadprogress', (event) => onProgress(event.loaded))
      }
    : undefined
}

/** Splits text at paragraph and sentence boundaries into pieces of at most `size` characters. */
export function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const paragraph of text.split(/\n{2,}/)) {
    const pieces = paragraph.length > size ? (paragraph.match(/[^.!?]+[.!?]*\s*/g) ?? [paragraph]) : [paragraph]
    for (const piece of pieces) {
      if (current && current.length + piece.length + 2 > size) {
        chunks.push(current.trim())
        current = ''
      }
      current += (current ? '\n\n' : '') + piece.slice(0, size)
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export interface SummaryRequest {
  text: string
  type: SummaryType
  length: SummaryLength
  context?: string
  signal?: AbortSignal
  onDownload?: (fraction: number) => void
  onChunk?: (done: number, total: number) => void
}

/** Summarises long documents piece by piece, then summarises the partial summaries. */
export async function summarizeWithAi(request: SummaryRequest): Promise<string> {
  const api = scope.Summarizer
  if (!api) throw new Error('The built-in Summarizer is not available in this browser')
  const create = (type: SummaryType, length: SummaryLength) =>
    api.create({ type, length, format: 'markdown', sharedContext: request.context, outputLanguage: 'en', monitor: monitor(request.onDownload), signal: request.signal })
  const partial = await create('tldr', 'medium')
  try {
    const quota = partial.inputQuota && Number.isFinite(partial.inputQuota) ? partial.inputQuota : 4000
    const chunks = chunkText(request.text, Math.max(1500, Math.floor(quota * 2.5)))
    if (chunks.length === 1) {
      partial.destroy()
      const single = await create(request.type, request.length)
      try {
        return await single.summarize(chunks[0], { signal: request.signal })
      } finally {
        single.destroy()
      }
    }
    const pieces: string[] = []
    for (const [index, chunk] of chunks.entries()) {
      pieces.push(await partial.summarize(chunk, { signal: request.signal }))
      request.onChunk?.(index + 1, chunks.length)
    }
    const final = await create(request.type, request.length)
    try {
      return await final.summarize(pieces.join('\n\n').slice(0, Math.floor(quota * 2.5)), { signal: request.signal })
    } finally {
      final.destroy()
    }
  } finally {
    partial.destroy()
  }
}

export async function detectLanguage(text: string): Promise<string | null> {
  const api = scope.LanguageDetector
  if (!api) return null
  try {
    const detector = await api.create()
    try {
      const [best] = await detector.detect(text.slice(0, 4000))
      return best && best.confidence > 0.4 && best.detectedLanguage !== 'und' ? best.detectedLanguage : null
    } finally {
      detector.destroy()
    }
  } catch {
    return null
  }
}

export interface Translator {
  translate: (text: string) => Promise<string>
  destroy: () => void
}

export async function createTranslator(sourceLanguage: string, targetLanguage: string, options: { signal?: AbortSignal; onDownload?: (fraction: number) => void } = {}): Promise<Translator> {
  const api = scope.Translator
  if (!api) throw new Error('The built-in Translator is not available in this browser')
  const instance = await api.create({ sourceLanguage, targetLanguage, monitor: monitor(options.onDownload), signal: options.signal })
  return {
    translate: (text) => (text.trim() ? instance.translate(text, { signal: options.signal }) : Promise.resolve(text)),
    destroy: () => instance.destroy(),
  }
}
