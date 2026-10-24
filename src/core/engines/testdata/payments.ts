import type { Rng } from './random'

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners' | 'unionpay'

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  diners: 'Diners Club',
  unionpay: 'UnionPay',
}

export type CardScenario = 'success' | 'declined' | 'insufficient' | '3ds' | 'expired' | 'cvc' | 'fraud'

export interface TestCard {
  brand: CardBrand
  number: string
  scenario: CardScenario
  description: string
}

/** Publicly documented sandbox numbers; they only work against payment test modes. */
export const TEST_CARDS: readonly TestCard[] = [
  { brand: 'visa', number: '4242424242424242', scenario: 'success', description: 'Succeeds' },
  { brand: 'visa', number: '4000056655665556', scenario: 'success', description: 'Visa debit, succeeds' },
  { brand: 'mastercard', number: '5555555555554444', scenario: 'success', description: 'Succeeds' },
  { brand: 'mastercard', number: '2223003122003222', scenario: 'success', description: '2-series BIN, succeeds' },
  { brand: 'amex', number: '378282246310005', scenario: 'success', description: '4-digit CVC, succeeds' },
  { brand: 'discover', number: '6011111111111117', scenario: 'success', description: 'Succeeds' },
  { brand: 'jcb', number: '3566002020360505', scenario: 'success', description: 'Succeeds' },
  { brand: 'diners', number: '3056930009020004', scenario: 'success', description: '14 digits, succeeds' },
  { brand: 'unionpay', number: '6200000000000005', scenario: 'success', description: 'Succeeds' },
  { brand: 'visa', number: '4000000000000002', scenario: 'declined', description: 'Generic decline' },
  { brand: 'visa', number: '4000000000009995', scenario: 'insufficient', description: 'Insufficient funds' },
  { brand: 'visa', number: '4000002500003155', scenario: '3ds', description: 'Requires 3-D Secure authentication' },
  { brand: 'visa', number: '4000000000000069', scenario: 'expired', description: 'Expired card' },
  { brand: 'visa', number: '4000000000000127', scenario: 'cvc', description: 'Incorrect CVC' },
  { brand: 'visa', number: '4100000000000019', scenario: 'fraud', description: 'Blocked as high risk' },
]

const BRAND_RULES: { brand: CardBrand; pattern: RegExp; lengths: number[] }[] = [
  { brand: 'amex', pattern: /^3[47]/, lengths: [15] },
  { brand: 'diners', pattern: /^3(0[0-5]|[689])/, lengths: [14, 16] },
  { brand: 'jcb', pattern: /^35(2[89]|[3-8])/, lengths: [16, 19] },
  { brand: 'visa', pattern: /^4/, lengths: [13, 16, 19] },
  { brand: 'mastercard', pattern: /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/, lengths: [16] },
  { brand: 'discover', pattern: /^(6011|65|64[4-9])/, lengths: [16, 19] },
  { brand: 'unionpay', pattern: /^62/, lengths: [16, 17, 18, 19] },
]

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function luhnValid(value: string): boolean {
  const digits = digitsOnly(value)
  if (digits.length < 12 || digits.length > 19) return false
  let sum = 0
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

export function luhnCheckDigit(partial: string): string {
  for (let digit = 0; digit <= 9; digit += 1) {
    if (luhnValid(`${partial}${digit}`)) return String(digit)
  }
  return '0'
}

export function detectCardBrand(value: string): CardBrand | null {
  const digits = digitsOnly(value)
  return BRAND_RULES.find((rule) => rule.pattern.test(digits))?.brand ?? null
}

export interface CardCheck {
  digits: string
  brand: CardBrand | null
  luhn: boolean
  lengthOk: boolean
}

export function checkCard(value: string): CardCheck {
  const digits = digitsOnly(value)
  const brand = detectCardBrand(digits)
  const lengths = BRAND_RULES.find((rule) => rule.brand === brand)?.lengths
  return {
    digits,
    brand,
    luhn: luhnValid(digits),
    lengthOk: lengths ? lengths.includes(digits.length) : digits.length >= 12 && digits.length <= 19,
  }
}

const BRAND_PREFIXES: Record<CardBrand, { prefixes: string[]; length: number }> = {
  visa: { prefixes: ['4'], length: 16 },
  mastercard: { prefixes: ['51', '52', '53', '54', '55', '2221', '2720'], length: 16 },
  amex: { prefixes: ['34', '37'], length: 15 },
  discover: { prefixes: ['6011', '65'], length: 16 },
  jcb: { prefixes: ['3528', '3589'], length: 16 },
  diners: { prefixes: ['36', '38'], length: 14 },
  unionpay: { prefixes: ['62'], length: 16 },
}

export const GENERATABLE_BRANDS = Object.keys(BRAND_PREFIXES) as CardBrand[]

/** A Luhn-valid number with a real brand prefix; for form validation, never for real charges. */
export function generateCardNumber(rng: Rng, brand: CardBrand = 'visa'): string {
  const { prefixes, length } = BRAND_PREFIXES[brand]
  const prefix = rng.pick(prefixes)
  const body = prefix + rng.chars('0123456789', length - prefix.length - 1)
  return body + luhnCheckDigit(body)
}

export function formatCardNumber(value: string): string {
  const digits = digitsOnly(value)
  if (digits.length === 15) return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`
  if (digits.length === 14) return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export interface IbanCountry {
  code: string
  name: string
  /** `9` digit, `A` uppercase letter, `C` alphanumeric. */
  bban: string
}

export const IBAN_COUNTRIES: readonly IbanCountry[] = [
  { code: 'DE', name: 'Germany', bban: '999999999999999999' },
  { code: 'GB', name: 'United Kingdom', bban: 'AAAA99999999999999' },
  { code: 'NL', name: 'Netherlands', bban: 'AAAA9999999999' },
  { code: 'FR', name: 'France', bban: '9999999999CCCCCCCCCCC99' },
  { code: 'ES', name: 'Spain', bban: '99999999999999999999' },
  { code: 'IT', name: 'Italy', bban: 'A9999999999CCCCCCCCCCCC' },
  { code: 'CH', name: 'Switzerland', bban: '99999CCCCCCCCCCCC' },
  { code: 'AT', name: 'Austria', bban: '9999999999999999' },
]

function ibanMod97(rearranged: string): number {
  let remainder = 0
  for (const char of rearranged) {
    const code = char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char
    for (const digit of code) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function ibanValid(value: string): boolean {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban)) return false
  const country = IBAN_COUNTRIES.find((entry) => entry.code === iban.slice(0, 2))
  if (country && iban.length !== country.bban.length + 4) return false
  return ibanMod97(iban.slice(4) + iban.slice(0, 4)) === 1
}

export function generateIban(rng: Rng, countryCode = 'DE'): string {
  const country = IBAN_COUNTRIES.find((entry) => entry.code === countryCode) ?? IBAN_COUNTRIES[0]
  const bban = [...country.bban]
    .map((slot) =>
      slot === '9'
        ? rng.chars('0123456789', 1)
        : slot === 'A'
          ? rng.chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1)
          : rng.chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1),
    )
    .join('')
  const check = 98 - ibanMod97(`${bban}${country.code}00`)
  return `${country.code}${String(check).padStart(2, '0')}${bban}`
}

export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ')
}
