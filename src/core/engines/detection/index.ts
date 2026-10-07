import { validateJson } from '../json'
import { looksLikeJwt } from '../jwt'
import { looksLikeUrl } from '../url'
import { looksLikeTimestamp } from '../date'
import { parseColor } from '../color'

export type DetectionKind =
  'json' | 'jwt' | 'url' | 'color' | 'timestamp' | 'xml' | 'yaml' | 'base64'

export interface Detection {
  kind: DetectionKind
  label: string
  confidence: 'high' | 'medium' | 'low'
}

function looksLikeXml(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed.startsWith('<')) return false
  return /<\/?[a-zA-Z][^>]*>/.test(trimmed) && trimmed.endsWith('>')
}

function looksLikeYaml(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return false
  const lines = trimmed.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return false
  const keyValueLines = lines.filter(
    (line) => /^[\w.-]+:\s*\S*|^-\s+\S+/.test(line.trim()) || /^[\w.-]+:\s*$/.test(line.trim()),
  )
  return keyValueLines.length >= Math.max(1, lines.length * 0.7) && !trimmed.includes('{')
}

function looksLikeBase64(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length < 16 || trimmed.length % 4 !== 0) return false
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) return false
  try {
    const decoded = atob(trimmed)
    const printable = [...decoded].filter((char) => {
      const code = char.charCodeAt(0)
      return code >= 32 || code === 9 || code === 10 || code === 13
    }).length
    return printable / decoded.length > 0.85
  } catch {
    return false
  }
}

export function detectContent(input: string): Detection[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  const detections: Detection[] = []

  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && validateJson(trimmed).valid) {
    detections.push({ kind: 'json', label: 'Looks like JSON', confidence: 'high' })
  }
  if (looksLikeJwt(trimmed)) {
    detections.push({ kind: 'jwt', label: 'Looks like a JWT', confidence: 'high' })
  }
  if (looksLikeUrl(trimmed)) {
    detections.push({ kind: 'url', label: 'Looks like a URL', confidence: 'high' })
  }
  if (trimmed.length <= 40 && parseColor(trimmed).ok) {
    detections.push({ kind: 'color', label: 'Looks like a color', confidence: 'high' })
  }
  if (looksLikeTimestamp(trimmed)) {
    detections.push({
      kind: 'timestamp',
      label: 'Looks like a Unix timestamp',
      confidence: 'medium',
    })
  }
  if (detections.length === 0 && looksLikeXml(trimmed)) {
    detections.push({ kind: 'xml', label: 'Looks like XML', confidence: 'medium' })
  }
  if (detections.length === 0 && looksLikeYaml(trimmed)) {
    detections.push({ kind: 'yaml', label: 'Looks like YAML', confidence: 'low' })
  }
  if (detections.length === 0 && looksLikeBase64(trimmed)) {
    detections.push({ kind: 'base64', label: 'Looks like Base64', confidence: 'low' })
  }
  return detections
}
