import { parse, stringify, YAMLParseError } from 'yaml'

export type YamlResult<T> = { ok: true; value: T } | { ok: false; error: string }

function describeError(cause: unknown): string {
  if (cause instanceof YAMLParseError) {
    const line = cause.linePos?.[0]?.line
    const column = cause.linePos?.[0]?.col
    const position = line ? ` (line ${line}, column ${column})` : ''
    return `${cause.message.split('\n')[0]}${position}`
  }
  return cause instanceof Error ? cause.message : 'Invalid YAML.'
}

export function parseYaml(source: string): YamlResult<unknown> {
  if (!source.trim()) return { ok: false, error: 'Input is empty.' }
  try {
    return { ok: true, value: parse(source) }
  } catch (cause) {
    return { ok: false, error: describeError(cause) }
  }
}

export function validateYaml(source: string): { valid: boolean; error?: string } {
  const result = parseYaml(source)
  return result.ok ? { valid: true } : { valid: false, error: result.error }
}

export function formatYaml(source: string, indent = 2): YamlResult<string> {
  const parsed = parseYaml(source)
  if (!parsed.ok) return parsed
  return { ok: true, value: stringify(parsed.value, { indent }) }
}

export function yamlToJson(source: string, indent: number | string = 2): YamlResult<string> {
  const parsed = parseYaml(source)
  if (!parsed.ok) return parsed
  return { ok: true, value: JSON.stringify(parsed.value, null, indent) }
}

export function jsonToYaml(source: string, indent = 2): YamlResult<string> {
  if (!source.trim()) return { ok: false, error: 'Input is empty.' }
  try {
    return { ok: true, value: stringify(JSON.parse(source), { indent }) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Invalid JSON.' }
  }
}
