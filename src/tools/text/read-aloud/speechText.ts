import type { ReadableBlock, ReadableBlockType } from '@/core/text/readablePage'

export interface Segment {
  index: number
  block: number
  text: string
  words: number
}

export interface ReaderBlock {
  type: ReadableBlockType
  text: string
  segments: Segment[]
  skipped: boolean
}

export interface ReaderModel {
  blocks: ReaderBlock[]
  segments: Segment[]
  words: number
}

export interface SpeechTextOptions {
  skipUrls: boolean
  skipCitations: boolean
  readCode: boolean
}

/** Chrome's online voices go silent on long utterances, so each one stays well under ~15 seconds. */
export const MAX_UTTERANCE_CHARS = 180
export const WORDS_PER_MINUTE = 170

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'\])]*[^\s<>"'\]).,;:!?]/gi
const CITATION_PATTERN = /\[(?:\d+(?:\s*[,–-]\s*\d+)*|[a-z]|citation needed|clarification needed|note \d+|edit)\]/gi

export function cleanForSpeech(text: string, options: Pick<SpeechTextOptions, 'skipUrls' | 'skipCitations'>): string {
  let out = text
  if (options.skipUrls) out = out.replace(URL_PATTERN, '')
  if (options.skipCitations) out = out.replace(CITATION_PATTERN, '')
  return out
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim()
}

const segmenters = new Map<string, Intl.Segmenter>()

function sentenceSegmenter(locale: string | undefined): Intl.Segmenter | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null
  const key = locale ?? ''
  let segmenter = segmenters.get(key)
  if (!segmenter) {
    try {
      segmenter = new Intl.Segmenter(locale || undefined, { granularity: 'sentence' })
    } catch {
      segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' })
    }
    segmenters.set(key, segmenter)
  }
  return segmenter
}

export function splitSentences(text: string, locale?: string): string[] {
  const segmenter = sentenceSegmenter(locale)
  const parts = segmenter
    ? Array.from(segmenter.segment(text), (part) => part.segment)
    : (text.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)/g) ?? [])
  return parts.map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Breaks a long sentence at the last clause boundary (or space) before the limit. */
export function chunkSentence(sentence: string, max = MAX_UTTERANCE_CHARS): string[] {
  const parts: string[] = []
  let rest = sentence.trim()
  while (rest.length > max) {
    const window = rest.slice(0, max)
    let cut = Math.max(
      window.lastIndexOf(', '),
      window.lastIndexOf('; '),
      window.lastIndexOf(': '),
      window.lastIndexOf(' – '),
      window.lastIndexOf(' — '),
    )
    if (cut < max * 0.4) cut = window.lastIndexOf(' ')
    cut = cut <= 0 ? max : cut + 1
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)
  return matches ? matches.length : 0
}

export function buildReader(blocks: ReadableBlock[], options: SpeechTextOptions, locale?: string): ReaderModel {
  const out: ReaderBlock[] = []
  const segments: Segment[] = []
  let words = 0

  for (const block of blocks) {
    if (block.type === 'code' && !options.readCode) {
      out.push({ type: block.type, text: block.text, segments: [], skipped: true })
      continue
    }
    const text = cleanForSpeech(block.type === 'code' ? block.text.replace(/\s+/g, ' ') : block.text, options)
    if (!text) continue

    const blockIndex = out.length
    const blockSegments: Segment[] = []
    for (const sentence of splitSentences(text, locale)) {
      for (const chunk of chunkSentence(sentence)) {
        const segment = { index: segments.length, block: blockIndex, text: chunk, words: countWords(chunk) }
        segments.push(segment)
        blockSegments.push(segment)
        words += segment.words
      }
    }
    out.push({ type: block.type, text, segments: blockSegments, skipped: false })
  }

  return { blocks: out, segments, words }
}

export function estimateSeconds(words: number, rate: number): number {
  if (words <= 0) return 0
  return Math.round((words / (WORDS_PER_MINUTE * Math.max(rate, 0.1))) * 60)
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

/** Words read before the given segment, for elapsed/remaining estimates. */
export function wordsBefore(segments: Segment[], index: number): number {
  let total = 0
  for (let i = 0; i < Math.min(index, segments.length); i += 1) total += segments[i].words
  return total
}

export interface WordRange {
  start: number
  end: number
}

export function wordAt(text: string, charIndex: number, charLength?: number): WordRange | null {
  if (charIndex < 0 || charIndex >= text.length) return null
  if (charLength && charLength > 0) return { start: charIndex, end: Math.min(text.length, charIndex + charLength) }
  const match = /^\S+/.exec(text.slice(charIndex))
  return match ? { start: charIndex, end: charIndex + match[0].length } : null
}

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase()
}

function primaryLang(lang: string): string {
  return normalizeLang(lang).split('-')[0] ?? ''
}

export interface VoiceGroup {
  lang: string
  label: string
  voices: SpeechSynthesisVoice[]
}

function languageName(lang: string, displayLocale: string): string {
  try {
    return new Intl.DisplayNames([displayLocale], { type: 'language' }).of(lang) ?? lang
  } catch {
    return lang
  }
}

/** Groups voices by language, with the preferred languages first and local voices ahead of online ones. */
export function groupVoices(voices: SpeechSynthesisVoice[], preferred: string[], displayLocale = 'en'): VoiceGroup[] {
  const groups = new Map<string, SpeechSynthesisVoice[]>()
  for (const voice of voices) {
    const key = primaryLang(voice.lang) || 'und'
    const list = groups.get(key)
    if (list) list.push(voice)
    else groups.set(key, [voice])
  }
  const order = preferred.map(primaryLang).filter(Boolean)
  return [...groups.entries()]
    .map(([lang, list]) => ({
      lang,
      label: lang === 'und' ? '—' : languageName(lang, displayLocale),
      voices: [...list].sort(
        (a, b) => Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => {
      const rankA = order.indexOf(a.lang)
      const rankB = order.indexOf(b.lang)
      if (rankA !== rankB) return (rankA === -1 ? order.length : rankA) - (rankB === -1 ? order.length : rankB)
      return a.label.localeCompare(b.label)
    })
}

/** "Microsoft Aria Online (Natural) - English (United States)" → "Microsoft Aria Online (Natural)". */
export function voiceLabel(voice: SpeechSynthesisVoice): string {
  return voice.name.replace(/\s+-\s+[^-]+$/, '').trim() || voice.name
}

export function pickAutoVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined
  const wanted = normalizeLang(lang)
  const primary = primaryLang(lang)
  const rank = (voice: SpeechSynthesisVoice) => Number(voice.default) * 2 + Number(voice.localService)
  const best = (list: SpeechSynthesisVoice[]) => [...list].sort((a, b) => rank(b) - rank(a))[0]
  if (wanted) {
    const exact = voices.filter((voice) => normalizeLang(voice.lang) === wanted)
    if (exact.length) return best(exact)
    const sameLanguage = voices.filter((voice) => primaryLang(voice.lang) === primary)
    if (sameLanguage.length) return best(sameLanguage)
  }
  return voices.find((voice) => voice.default)
}
