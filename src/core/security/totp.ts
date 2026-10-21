const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function normalizeBase32Secret(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase()
}

export function decodeBase32(secret: string): Uint8Array {
  const normalized = normalizeBase32Secret(secret)
  let bits = ''
  for (const ch of normalized) {
    const val = BASE32_ALPHABET.indexOf(ch)
    if (val < 0) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2))
  }
  return new Uint8Array(bytes)
}

function counterBytes(counter: number): ArrayBuffer {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setUint32(4, counter, false)
  return buf
}

export async function generateTotp(secret: string, timeMs = Date.now(), stepSec = 30, digits = 6): Promise<string> {
  const key = decodeBase32(secret)
  if (!key.length) throw new Error('Invalid secret')
  const keyBytes = new Uint8Array(key)
  const counter = Math.floor(timeMs / 1000 / stepSec)
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBytes(counter)))
  const offset = sig[sig.length - 1] & 0x0f
  const code =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff)
  return String(code % 10 ** digits).padStart(digits, '0')
}

export function secondsRemaining(timeMs = Date.now(), stepSec = 30): number {
  const elapsed = Math.floor(timeMs / 1000) % stepSec
  return stepSec - elapsed
}

export type TotpAccount = {
  id: string
  label: string
  secret: string
}
