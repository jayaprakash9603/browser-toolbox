import { MAX_LABEL_SOURCE } from './constants'

export const clip = (value: string, max = 120) =>
  value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

/** Required stars, colons, sort arrows and other symbols around a caption are decoration. */
export const trimLabel = (value: string) => value.replace(/^[\s*\p{S}]+|[\s:*\uFF1A\p{S}]+$/gu, '')
export const hasWords = (value: string) => /[\p{L}\p{N}]/u.test(value)
export const norm = (value: string | undefined) => (value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Screen-reader suffixes such as "First Name . Required" or "Phone (optional)". */
const REQUIRED_MARK = /[\s.,:;*()[\]-]*\b(required|optional|mandatory)\b[\s.,:;*()[\]-]*$/iu

/** A caption as it is shown and stored: without decoration or a required marker. */
export const cleanLabel = (value: string) => trimLabel(trimLabel(value).replace(REQUIRED_MARK, ''))

/** How two captions are compared: case, punctuation and required markers do not tell fields apart. */
export const labelKey = (value: string | undefined) => norm((value ?? '').replace(REQUIRED_MARK, ''))

export const wordCount = (value: string) => value.split(/\s+/).filter(hasWords).length

/** The words in an element's class, id and given attributes: `uno_choice_filter`, `MuiFormHelperText` and so on. */
export function hintWords(el: Element, attributes: string[] = []): string[] {
  const tokens = [el.getAttribute('class') ?? '', el.id, ...attributes.map((name) => el.getAttribute(name) ?? '')]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
  // Whole tokens too, so compounds such as `form-text` and `help-block` read as `formtext` and `helpblock`.
  const whole = tokens.map((token) => token.replace(/[^\p{L}\p{N}]+/gu, ''))
  const parts = tokens.flatMap((token) => token.split(/[^\p{L}\p{N}]+|(?<=\p{Ll})(?=\p{Lu})/u))
  return [...parts, ...whole].filter(Boolean).map((word) => word.toLowerCase())
}
export const same = (a: string, b: string) => clip(a, 500).toLowerCase() === clip(b, 500).toLowerCase()
export const quote = (value: string) => value.replace(/["\\]/g, '\\$&')
export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
export const looksLikeDate = (value: string) =>
  value.length <= 40 && /\d{1,4}\s*[-/.,\s]\s*(\d{1,2}|\p{L}{3,9})\.?\s*[-/.,\s]\s*\d{2,4}/u.test(value)

/** Generated ids (React `:r1:`, `ext-comp-1042`, hashes) change between loads, so they cannot key a field. */
export function stableId(id: string): string {
  return id && !/\d{3,}|:|[0-9a-f]{8,}/i.test(id) ? id : ''
}

export function humanize(raw: string): string {
  const words = raw
    .replace(/\[\]$/, '')
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/[_\-.[\]]+/g, ' ')
    .trim()
  if (!hasWords(words) || /\d{3,}/.test(words)) return ''
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
}

/** Short text that reads like a caption, or '' for paragraphs and punctuation. */
export function shortText(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length > MAX_LABEL_SOURCE) return ''
  const label = cleanLabel(text)
  return hasWords(label) ? label : ''
}
