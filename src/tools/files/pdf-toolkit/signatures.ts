export interface SavedSignature {
  id: string
  /** PNG data URL with a transparent background. */
  dataUrl: string
  width: number
  height: number
}

const KEY = 'pdf-toolkit.signatures'
const LIMIT = 6

export function loadSignatures(): SavedSignature[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is SavedSignature =>
            typeof entry === 'object' && entry !== null && typeof entry.dataUrl === 'string' && entry.dataUrl.startsWith('data:image/png'),
        )
      : []
  } catch {
    return []
  }
}

export function storeSignatures(signatures: SavedSignature[]): SavedSignature[] {
  const kept = signatures.slice(0, LIMIT)
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    // Storage full or disabled; the signature still works for this session.
  }
  return kept
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
