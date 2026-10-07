import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser'

export type XmlResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface XmlValidationError {
  message: string
  line?: number
  column?: number
}

export function validateXml(source: string): { valid: boolean; error?: XmlValidationError } {
  if (!source.trim()) return { valid: false, error: { message: 'Input is empty.' } }
  const result = XMLValidator.validate(source)
  if (result === true) return { valid: true }
  return {
    valid: false,
    error: { message: result.err.msg, line: result.err.line, column: result.err.col },
  }
}

export function parseXml(source: string): XmlResult<unknown> {
  const validation = validateXml(source)
  if (!validation.valid) {
    const position = validation.error?.line
      ? ` (line ${validation.error.line}, column ${validation.error.column})`
      : ''
    return { ok: false, error: `${validation.error?.message ?? 'Invalid XML.'}${position}` }
  }
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    return { ok: true, value: parser.parse(source) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Invalid XML.' }
  }
}

const INDENT = '  '

function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatXml(source: string): XmlResult<string> {
  const validation = validateXml(source)
  if (!validation.valid) {
    return { ok: false, error: validation.error?.message ?? 'Invalid XML.' }
  }
  const tokens = source
    .replace(/>\s+</g, '><')
    .replace(/</g, '\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let depth = 0
  const lines: string[] = []
  for (const token of tokens) {
    const isClosing = token.startsWith('</')
    const isSelfClosing = token.endsWith('/>') || token.startsWith('<?') || token.startsWith('<!') || /^<[^>]+>[^<]*<\/[^>]+>$/.test(token)
    if (isClosing) depth -= 1
    lines.push(`${INDENT.repeat(Math.max(0, depth))}${token}`)
    if (!isClosing && !isSelfClosing && token.startsWith('<')) depth += 1
  }
  return { ok: true, value: lines.join('\n') }
}

export function minifyXml(source: string): XmlResult<string> {
  const validation = validateXml(source)
  if (!validation.valid) {
    return { ok: false, error: validation.error?.message ?? 'Invalid XML.' }
  }
  return {
    ok: true,
    value: source
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  }
}

export function xmlToJson(source: string, indent: number | string = 2): XmlResult<string> {
  const parsed = parseXml(source)
  if (!parsed.ok) return parsed
  return { ok: true, value: JSON.stringify(parsed.value, null, indent) }
}

export function escapeXml(source: string): string {
  return escapeXmlText(source)
}

export function buildXml(value: unknown, rootTag = 'root'): XmlResult<string> {
  try {
    const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true })
    return { ok: true, value: builder.build({ [rootTag]: value }) as string }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not build XML.' }
  }
}
