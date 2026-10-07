export type IdKind = 'uuid-v4' | 'uuid-v7' | 'nanoid'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function formatUuid(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function generateUuidV4(): string {
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return formatUuid(toHex(bytes))
}

export function generateUuidV7(now: number = Date.now()): string {
  const bytes = randomBytes(16)
  const timestamp = BigInt(now)
  for (let index = 0; index < 6; index += 1) {
    bytes[index] = Number((timestamp >> BigInt(8 * (5 - index))) & 0xffn)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return formatUuid(toHex(bytes))
}

export function isValidUuid(input: string): boolean {
  return UUID_REGEX.test(input.trim())
}

export function uuidVersion(input: string): number | null {
  const trimmed = input.trim()
  if (!isValidUuid(trimmed)) return null
  return Number(trimmed[14])
}

const NANOID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

export function generateNanoId(length = 21, alphabet: string = NANOID_ALPHABET): string {
  const size = Math.max(1, Math.trunc(length))
  const chars = alphabet.length > 1 ? alphabet : NANOID_ALPHABET
  const bytes = randomBytes(size)
  let id = ''
  for (const byte of bytes) id += chars[byte % chars.length]
  return id
}

export function generateIds(kind: IdKind, count: number, nanoLength = 21): string[] {
  const total = Math.min(Math.max(1, Math.trunc(count)), 500)
  return Array.from({ length: total }, () => {
    switch (kind) {
      case 'uuid-v4':
        return generateUuidV4()
      case 'uuid-v7':
        return generateUuidV7()
      case 'nanoid':
        return generateNanoId(nanoLength)
    }
  })
}
