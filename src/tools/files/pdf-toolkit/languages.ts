/** Languages Chrome's on-device translator commonly supports. */
export const LANGUAGES = [
  'ar', 'bg', 'bn', 'cs', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'iw', 'ja', 'kn', 'ko', 'lt', 'mr', 'nl', 'no', 'pl', 'pt',
  'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'vi', 'zh', 'zh-Hant',
] as const

const RTL = new Set(['ar', 'iw', 'he', 'fa', 'ur'])

export const isRtl = (language: string) => RTL.has(language.split('-')[0])

export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code === 'iw' ? 'he' : code) ?? code
  } catch {
    return code
  }
}

export function preferredTarget(source: string | null): string {
  const browser = (typeof navigator !== 'undefined' ? navigator.language : 'en').split('-')[0]
  if (browser && browser !== source && (LANGUAGES as readonly string[]).includes(browser)) return browser
  return source === 'en' ? 'es' : 'en'
}
