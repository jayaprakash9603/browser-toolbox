export type NumberBase = 2 | 8 | 10 | 16

export const BASE_LABELS: Record<NumberBase, string> = {
  2: 'Binary',
  8: 'Octal',
  10: 'Decimal',
  16: 'Hexadecimal',
}

export type BaseResult = { ok: true; value: bigint } | { ok: false; error: string }

const DIGITS = '0123456789abcdef'

export function parseBaseValue(input: string, base: NumberBase): BaseResult {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return { ok: false, error: 'Input is empty.' }
  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const stripped = unsigned.replace(/^0[box]/, '').replace(/[\s_]/g, '')
  if (!stripped) return { ok: false, error: 'Input is empty.' }
  for (const char of stripped) {
    const digit = DIGITS.indexOf(char)
    if (digit === -1 || digit >= base) {
      return {
        ok: false,
        error: `"${char}" is not a valid ${BASE_LABELS[base].toLowerCase()} digit.`,
      }
    }
  }
  try {
    return { ok: true, value: parseBigInt(stripped, base, negative) }
  } catch {
    return { ok: false, error: 'Could not parse the number.' }
  }
}

function parseBigInt(digits: string, base: NumberBase, negative: boolean): bigint {
  let value = 0n
  const radix = BigInt(base)
  for (const char of digits) {
    value = value * radix + BigInt(DIGITS.indexOf(char))
  }
  return negative ? -value : value
}

export function formatBaseValue(value: bigint, base: NumberBase, groupDigits = false): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const radix = BigInt(base)
  let digits = ''
  let remaining = absolute
  do {
    digits = DIGITS[Number(remaining % radix)] + digits
    remaining /= radix
  } while (remaining > 0n)
  if (groupDigits && base === 16) digits = digits.replace(/\B(?=(?:[\da-f]{2})+(?![\da-f]))/g, ' ')
  if (groupDigits && base === 2) digits = digits.replace(/\B(?=(?:[01]{4})+(?![01]))/g, ' ')
  return `${negative ? '-' : ''}${digits}`
}

export function bitRepresentation(value: bigint): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const bits = absolute.toString(2)
  const padded = bits.padStart(Math.ceil(bits.length / 8) * 8, '0')
  const grouped = padded.replace(/\B(?=(?:[01]{4})+(?![01]))/g, ' ')
  return negative ? `-${grouped}` : grouped
}
