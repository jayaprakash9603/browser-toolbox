export type EncodingKind = 'base64' | 'url' | 'html' | 'unicode' | 'hex'
export type EncodingDirection = 'encode' | 'decode'

export type EncodingResult = { ok: true; value: string } | { ok: false; error: string }

function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(input: string): EncodingResult {
  const cleaned = input.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    return {
      ok: false,
      error: 'Invalid Base64 — only A–Z, a–z, 0–9, +, / and padding are allowed.',
    }
  }
  try {
    const binary = atob(cleaned)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return { ok: true, value: new TextDecoder().decode(bytes) }
  } catch {
    return { ok: false, error: 'Invalid Base64 padding or length.' }
  }
}

function encodeUrl(input: string): string {
  return encodeURIComponent(input)
}

function decodeUrl(input: string): EncodingResult {
  try {
    return { ok: true, value: decodeURIComponent(input) }
  } catch {
    return { ok: false, error: 'Malformed percent-encoding (e.g. a stray % sign).' }
  }
}

const HTML_ENTITIES: [RegExp, string][] = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&#39;'],
]

function encodeHtml(input: string): string {
  return HTML_ENTITIES.reduce((text, [pattern, entity]) => text.replace(pattern, entity), input)
}

function decodeHtml(input: string): string {
  if (typeof document === 'undefined') {
    return input
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/g, '&')
  }
  const template = document.createElement('template')
  template.innerHTML = input
  return template.content.textContent ?? ''
}

function encodeUnicode(input: string): string {
  return [...input]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0
      return code > 127
        ? code > 0xffff
          ? `\\u{${code.toString(16)}}`
          : `\\u${code.toString(16).padStart(4, '0')}`
        : char
    })
    .join('')
}

function decodeUnicode(input: string): EncodingResult {
  try {
    const value = input
      .replace(/\\u\{([\da-fA-F]+)\}/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/\\u([\da-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\x([\da-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    return { ok: true, value }
  } catch {
    return { ok: false, error: 'Invalid unicode escape sequence.' }
  }
}

function encodeHex(input: string): string {
  const bytes = new TextEncoder().encode(input)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function decodeHex(input: string): EncodingResult {
  const cleaned = input.replace(/[\s:,-]/g, '').replace(/^0x/i, '')
  if (cleaned.length % 2 !== 0 || /[^0-9a-fA-F]/.test(cleaned)) {
    return { ok: false, error: 'Hex input must be an even number of hex digits.' }
  }
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let index = 0; index < cleaned.length; index += 2) {
    bytes[index / 2] = parseInt(cleaned.slice(index, index + 2), 16)
  }
  return { ok: true, value: new TextDecoder().decode(bytes) }
}

export function encode(kind: EncodingKind, input: string): EncodingResult {
  switch (kind) {
    case 'base64':
      return { ok: true, value: toBase64(input) }
    case 'url':
      return { ok: true, value: encodeUrl(input) }
    case 'html':
      return { ok: true, value: encodeHtml(input) }
    case 'unicode':
      return { ok: true, value: encodeUnicode(input) }
    case 'hex':
      return { ok: true, value: encodeHex(input) }
  }
}

export function decode(kind: EncodingKind, input: string): EncodingResult {
  switch (kind) {
    case 'base64':
      return fromBase64(input)
    case 'url':
      return decodeUrl(input)
    case 'html':
      return { ok: true, value: decodeHtml(input) }
    case 'unicode':
      return decodeUnicode(input)
    case 'hex':
      return decodeHex(input)
  }
}
