/** Instagram collapses blank lines; insert zero-width space between newlines. */
const ZWSP = '\u200B'

export function formatCaptionForInstagram(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.trim() === '' ? ZWSP : line))
    .join('\n')
}

export function toUnicodeBold(text: string): string {
  const boldA = 0x1d5d4
  const bolda = 0x1d5ee
  const bold0 = 0x1d7ce
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 0x41 && code <= 0x5a) out += String.fromCodePoint(boldA + (code - 0x41))
    else if (code >= 0x61 && code <= 0x7a) out += String.fromCodePoint(bolda + (code - 0x61))
    else if (code >= 0x30 && code <= 0x39) out += String.fromCodePoint(bold0 + (code - 0x30))
    else out += ch
  }
  return out
}

export function toUnicodeItalic(text: string): string {
  const italicA = 0x1d608
  const italica = 0x1d622
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 0x41 && code <= 0x5a) out += String.fromCodePoint(italicA + (code - 0x41))
    else if (code >= 0x61 && code <= 0x7a) out += String.fromCodePoint(italica + (code - 0x61))
    else out += ch
  }
  return out
}
