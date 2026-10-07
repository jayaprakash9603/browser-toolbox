export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}

const SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/',
}

const AMBIGUOUS = new Set([...'Il1O0'])

function buildCharset(options: PasswordOptions): string {
  let charset = ''
  if (options.uppercase) charset += SETS.uppercase
  if (options.lowercase) charset += SETS.lowercase
  if (options.numbers) charset += SETS.numbers
  if (options.symbols) charset += SETS.symbols
  if (options.excludeAmbiguous) charset = [...charset].filter((char) => !AMBIGUOUS.has(char)).join('')
  return charset
}

function randomBelow(max: number): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] % max
}

export type PasswordResult = { ok: true; value: string } | { ok: false; error: string }

export function generatePassword(options: PasswordOptions): PasswordResult {
  const charset = buildCharset(options)
  if (!charset) return { ok: false, error: 'Select at least one character set.' }
  const length = Math.min(Math.max(1, Math.trunc(options.length)), 256)
  let password = ''
  for (let index = 0; index < length; index += 1) password += charset[randomBelow(charset.length)]
  return { ok: true, value: password }
}

export function generatePasswords(options: PasswordOptions, count: number): PasswordResult[] {
  const total = Math.min(Math.max(1, Math.trunc(count)), 50)
  return Array.from({ length: total }, () => generatePassword(options))
}

export function randomInt(min: number, max: number): number {
  const low = Math.ceil(Math.min(min, max))
  const high = Math.floor(Math.max(min, max))
  return low + randomBelow(high - low + 1)
}

export function randomString(length: number, alphabet?: string): string {
  const chars = alphabet && alphabet.length > 1 ? alphabet : `${SETS.lowercase}${SETS.uppercase}${SETS.numbers}`
  const size = Math.min(Math.max(1, Math.trunc(length)), 1024)
  let output = ''
  for (let index = 0; index < size; index += 1) output += chars[randomBelow(chars.length)]
  return output
}

export function randomHex(byteCount: number): string {
  const size = Math.min(Math.max(1, Math.trunc(byteCount)), 512)
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
