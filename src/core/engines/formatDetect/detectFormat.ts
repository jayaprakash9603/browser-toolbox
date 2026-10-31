export type DetectedFormat = 'json' | 'xml' | 'yaml' | 'sql' | 'regex' | 'uuid'

export type DetectionConfidence = 'high' | 'medium' | 'low'

export interface FormatDetection {
  format: DetectedFormat
  confidence: DetectionConfidence
  validJson?: boolean
}

const UUID_LINE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ULID_OR_NANOID_LINE = /^[0-9A-HJKMNP-TV-Z]{26}$/
const SQL_START =
  /^\s*(select\b|insert\s+into\b|update\s+\w+\s+set\b|delete\s+from\b|create\s+(or\s+replace\s+)?(table|index|view|database|schema)\b|alter\s+table\b|drop\s+(table|index|view|database)\b|with\s+\w+\s+as\s*\(|merge\s+into\b|truncate\s+table\b)/i
const REGEX_LITERAL = /^\/(.+)\/([dgimsuvy]*)$/s
const YAML_KEY = /^\s*(?:-\s+)?[\w.\-"']+\s*:(?:\s|$)/
const YAML_LIST = /^\s*-\s+\S/

function detectJson(text: string): FormatDetection | null {
  if (!/^[[{]/.test(text)) return null
  try {
    JSON.parse(text)
    return { format: 'json', confidence: 'high', validJson: true }
  } catch {
    return { format: 'json', confidence: 'medium', validJson: false }
  }
}

function detectXml(text: string): FormatDetection | null {
  if (!/^<[?!a-zA-Z]/.test(text) || !text.endsWith('>')) return null
  return { format: 'xml', confidence: 'high' }
}

function detectIds(text: string): FormatDetection | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const allIds = lines.every((line) => UUID_LINE.test(line) || ULID_OR_NANOID_LINE.test(line))
  return allIds ? { format: 'uuid', confidence: 'high' } : null
}

function detectRegex(text: string): FormatDetection | null {
  const match = REGEX_LITERAL.exec(text)
  if (!match || text.includes('\n')) return null
  try {
    new RegExp(match[1], match[2])
    return { format: 'regex', confidence: 'medium' }
  } catch {
    return null
  }
}

function detectYaml(text: string): FormatDetection | null {
  if (/^---\s*(\r?\n|$)/.test(text)) return { format: 'yaml', confidence: 'high' }
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'))
  if (lines.length === 0) return null
  const structured = lines.filter((line) => YAML_KEY.test(line) || YAML_LIST.test(line)).length
  if (structured === lines.length && lines.length > 1) return { format: 'yaml', confidence: 'medium' }
  if (structured === 1 && lines.length === 1 && YAML_KEY.test(lines[0])) {
    return { format: 'yaml', confidence: 'low' }
  }
  return null
}

export function detectFormat(input: string): FormatDetection | null {
  const text = input.trim()
  if (!text) return null
  if (SQL_START.test(text)) return { format: 'sql', confidence: 'high' }
  return (
    detectJson(text) ??
    detectXml(text) ??
    detectIds(text) ??
    detectRegex(text) ??
    detectYaml(text)
  )
}
