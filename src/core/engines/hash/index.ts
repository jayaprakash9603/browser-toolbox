import md5 from 'md5'

export type SecureHashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
export type LegacyHashAlgorithm = 'MD5'
export type HashAlgorithm = SecureHashAlgorithm | LegacyHashAlgorithm

export interface HashAlgorithmInfo {
  id: HashAlgorithm
  legacy: boolean
  secure: boolean
  note?: string
}

export const HASH_ALGORITHMS: HashAlgorithmInfo[] = [
  { id: 'SHA-256', legacy: false, secure: true },
  { id: 'SHA-384', legacy: false, secure: true },
  { id: 'SHA-512', legacy: false, secure: true },
  {
    id: 'SHA-1',
    legacy: true,
    secure: false,
    note: 'Legacy — collision-prone, avoid for security.',
  },
  { id: 'MD5', legacy: true, secure: false, note: 'Legacy — broken for security; checksums only.' },
]

export type HashResult = { ok: true; value: string } | { ok: false; error: string }

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return [...view].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function requireCrypto(): Crypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto is not available in this environment.')
  }
  return crypto
}

export async function hash(algorithm: HashAlgorithm, input: string): Promise<HashResult> {
  if (algorithm === 'MD5') return { ok: true, value: md5(input) }
  try {
    const subtle = requireCrypto().subtle
    const digest = await subtle.digest(algorithm, new TextEncoder().encode(input))
    return { ok: true, value: bytesToHex(digest) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Hashing failed.' }
  }
}

export type HmacAlgorithm = Exclude<SecureHashAlgorithm, 'SHA-1'> | 'SHA-1'

export async function hmac(
  algorithm: HmacAlgorithm,
  message: string,
  secret: string,
): Promise<HashResult> {
  if (!secret) return { ok: false, error: 'Secret is required for HMAC.' }
  try {
    const subtle = requireCrypto().subtle
    const key = await subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign'],
    )
    const signature = await subtle.sign('HMAC', key, new TextEncoder().encode(message))
    return { ok: true, value: bytesToHex(signature) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'HMAC failed.' }
  }
}

export * from './compare'
export * from './digests'
export * from './manifest'
export * from './report'
export { checkExtension, detectSignature, extensionOf } from './signature'
