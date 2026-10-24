import {
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  COUNTRIES,
  CURRENCIES,
  FEMALE_NAMES,
  FILE_EXTENSIONS,
  HTTP_METHODS,
  HTTP_STATUSES,
  JOB_TITLES,
  LAST_NAMES,
  LOREM_WORDS,
  MALE_NAMES,
  MIME_TYPES,
  PRIORITIES,
  SAFE_EMAIL_DOMAINS,
  STATUSES,
  USER_AGENTS,
  type CityInfo,
  type CountryInfo,
} from './catalog'
import {
  CARD_BRAND_LABELS,
  generateCardNumber,
  generateIban,
  IBAN_COUNTRIES,
  type CardBrand,
} from './payments'
import { createRng, type Rng } from './random'

export type FieldValue = string | number | boolean | null
export type DataRow = Record<string, FieldValue>

export type FieldCategory =
  | 'person'
  | 'location'
  | 'internet'
  | 'finance'
  | 'identifiers'
  | 'datetime'
  | 'text'
  | 'misc'

export const FIELD_CATEGORIES: readonly FieldCategory[] = [
  'person',
  'location',
  'internet',
  'finance',
  'identifiers',
  'datetime',
  'text',
  'misc',
]

export type ValueKind = 'text' | 'integer' | 'decimal' | 'boolean'

interface Person {
  first: string
  last: string
  gender: 'female' | 'male' | 'non-binary'
  birth: Date
}

interface Place {
  country: CountryInfo
  city: CityInfo
  houseNumber: number
  street: string
}

interface Card {
  brand: CardBrand
  number: string
}

export interface RowContext {
  rng: Rng
  index: number
  now: number
  person(): Person
  place(): Place
  card(): Card
}

export interface FieldType {
  id: string
  label: string
  category: FieldCategory
  kind: ValueKind
  generate(ctx: RowContext): FieldValue
}

const DAY_MS = 86_400_000
const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function fillPattern(rng: Rng, pattern: string): string {
  return [...pattern]
    .map((char) =>
      char === '#'
        ? rng.chars('0123456789', 1)
        : char === 'A'
          ? rng.chars('ABCDEFGHJKLMNPRSTUVWXYZ', 1)
          : char,
    )
    .join('')
}

function isoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

function between(rng: Rng, from: number, to: number): number {
  return from + Math.floor(rng.next() * (to - from))
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function words(rng: Rng, count: number): string[] {
  return Array.from({ length: count }, () => rng.pick(LOREM_WORDS))
}

function sentence(rng: Rng): string {
  return `${capitalize(words(rng, rng.int(6, 12)).join(' '))}.`
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index)
    ;[items[index], items[swap]] = [items[swap], items[index]]
  }
  return items
}

function strongPassword(rng: Rng): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*-_=+?']
  const required = sets.map((set) => rng.chars(set, 1))
  const rest = [...rng.chars(sets.join(''), 10)]
  return shuffle(rng, [...required, ...rest]).join('')
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function uuidV4(rng: Rng): string {
  const hex = [...rng.hex(32)]
  hex[12] = '4'
  hex[16] = '89ab'[rng.int(0, 3)]
  const joined = hex.join('')
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`
}

function ulid(rng: Rng, time: number): string {
  let stamp = ''
  let remaining = time
  for (let index = 0; index < 10; index += 1) {
    stamp = CROCKFORD[remaining % 32] + stamp
    remaining = Math.floor(remaining / 32)
  }
  return stamp + rng.chars(CROCKFORD, 16)
}

function ean13(rng: Rng, prefix = ''): string {
  const body = prefix + rng.chars('0123456789', 12 - prefix.length)
  let sum = 0
  for (let index = 0; index < 12; index += 1) sum += Number(body[index]) * (index % 2 === 0 ? 1 : 3)
  return body + String((10 - (sum % 10)) % 10)
}

function domainName(rng: Rng): string {
  return `${rng.pick(LOREM_WORDS)}${rng.pick(LOREM_WORDS)}.${rng.pick(['example', 'test', 'local'])}`
}

function slug(rng: Rng): string {
  return words(rng, rng.int(2, 4)).join('-')
}

function createContext(rng: Rng, index: number, now: number): RowContext {
  let person: Person | undefined
  let place: Place | undefined
  let card: Card | undefined
  return {
    rng,
    index,
    now,
    person() {
      if (!person) {
        const roll = rng.next()
        const gender = roll < 0.48 ? 'female' : roll < 0.96 ? 'male' : 'non-binary'
        const first =
          gender === 'female'
            ? rng.pick(FEMALE_NAMES)
            : gender === 'male'
              ? rng.pick(MALE_NAMES)
              : rng.pick([...FEMALE_NAMES, ...MALE_NAMES])
        const ageDays = between(rng, 18 * 365, 80 * 365)
        person = { first, last: rng.pick(LAST_NAMES), gender, birth: new Date(now - ageDays * DAY_MS) }
      }
      return person
    },
    place() {
      if (!place) {
        const country = rng.pick(COUNTRIES)
        place = {
          country,
          city: rng.pick(country.cities),
          houseNumber: rng.int(1, 2400),
          street: rng.pick(country.streets),
        }
      }
      return place
    },
    card() {
      if (!card) {
        const brand = rng.pick<CardBrand>(['visa', 'visa', 'mastercard', 'mastercard', 'amex', 'discover'])
        card = { brand, number: generateCardNumber(rng, brand) }
      }
      return card
    },
  }
}

function streetLine(place: Place): string {
  return place.country.streetFormat
    .replace('{n}', String(place.houseNumber))
    .replace('{s}', place.street)
}

function ageAt(birth: Date, now: number): number {
  const today = new Date(now)
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

function field(
  id: string,
  label: string,
  category: FieldCategory,
  generate: (ctx: RowContext) => FieldValue,
  kind: ValueKind = 'text',
): FieldType {
  return { id, label, category, kind, generate }
}

export const FIELD_TYPES: readonly FieldType[] = [
  field('fullName', 'Full name', 'person', (c) => `${c.person().first} ${c.person().last}`),
  field('firstName', 'First name', 'person', (c) => c.person().first),
  field('lastName', 'Last name', 'person', (c) => c.person().last),
  field('gender', 'Gender', 'person', (c) => c.person().gender),
  field('username', 'Username', 'person', ({ rng, person }) => {
    const p = person()
    return `${fold(p.first)}${rng.pick(['', '.', '_'])}${fold(p.last)}${rng.bool(0.6) ? rng.int(1, 999) : ''}`
  }),
  field('email', 'Email', 'person', ({ rng, person }) => {
    const p = person()
    return `${fold(p.first)}.${fold(p.last)}${rng.bool(0.4) ? rng.int(1, 99) : ''}@${rng.pick(SAFE_EMAIL_DOMAINS)}`
  }),
  field('phone', 'Phone', 'person', (c) => fillPattern(c.rng, c.place().country.phone)),
  field('birthDate', 'Date of birth', 'person', (c) => isoDate(c.person().birth.getTime())),
  field('age', 'Age', 'person', (c) => ageAt(c.person().birth, c.now), 'integer'),
  field('jobTitle', 'Job title', 'person', (c) => c.rng.pick(JOB_TITLES)),
  field('company', 'Company', 'person', (c) => `${c.rng.pick(COMPANY_PREFIXES)} ${c.rng.pick(COMPANY_SUFFIXES)}`),
  field('avatarUrl', 'Avatar URL', 'person', (c) => {
    const p = c.person()
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(`${p.first} ${p.last}`)}`
  }),

  field('street', 'Street address', 'location', (c) => streetLine(c.place())),
  field('city', 'City', 'location', (c) => c.place().city.city),
  field('state', 'State / region', 'location', (c) => c.place().city.region),
  field('zip', 'Postal code', 'location', (c) => fillPattern(c.rng, c.place().country.postal)),
  field('country', 'Country', 'location', (c) => c.place().country.name),
  field('countryCode', 'Country code', 'location', (c) => c.place().country.code),
  field('address', 'Full address', 'location', (c) => {
    const p = c.place()
    return `${streetLine(p)}, ${p.city.city}, ${p.city.region} ${fillPattern(c.rng, p.country.postal)}, ${p.country.name}`
  }),
  field('latitude', 'Latitude', 'location', (c) => Number((c.place().city.lat + c.rng.float(-0.05, 0.05, 6)).toFixed(6)), 'decimal'),
  field('longitude', 'Longitude', 'location', (c) => Number((c.place().city.lng + c.rng.float(-0.05, 0.05, 6)).toFixed(6)), 'decimal'),
  field('timezone', 'Time zone', 'location', (c) => c.place().city.tz),

  field('url', 'URL', 'internet', (c) => `https://${domainName(c.rng)}/${slug(c.rng)}`),
  field('domain', 'Domain', 'internet', (c) => domainName(c.rng)),
  field('ipv4', 'IPv4', 'internet', ({ rng }) => `${rng.int(1, 223)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`),
  field('ipv6', 'IPv6', 'internet', ({ rng }) =>
    Array.from({ length: 8 }, () => rng.int(0, 0xffff).toString(16)).join(':'),
  ),
  field('mac', 'MAC address', 'internet', ({ rng }) =>
    Array.from({ length: 6 }, () => rng.hex(2).toUpperCase()).join(':'),
  ),
  field('userAgent', 'User agent', 'internet', (c) => c.rng.pick(USER_AGENTS)),
  field('password', 'Strong password', 'internet', (c) => strongPassword(c.rng)),
  field('jwt', 'JWT (unsigned)', 'internet', ({ rng, now, person }) => {
    const p = person()
    const iat = Math.floor(now / 1000)
    const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = base64Url(
      JSON.stringify({ sub: uuidV4(rng), name: `${p.first} ${p.last}`, role: rng.pick(['admin', 'editor', 'viewer']), iat, exp: iat + 3600 }),
    )
    return `${header}.${payload}.${rng.chars(BASE64URL, 43)}`
  }),
  field('slug', 'Slug', 'internet', (c) => slug(c.rng)),
  field('port', 'Port', 'internet', (c) => c.rng.int(1024, 65535), 'integer'),
  field('httpMethod', 'HTTP method', 'internet', (c) => c.rng.pick(HTTP_METHODS)),
  field('httpStatus', 'HTTP status', 'internet', (c) => c.rng.pick(HTTP_STATUSES), 'integer'),
  field('mimeType', 'MIME type', 'internet', (c) => c.rng.pick(MIME_TYPES)),
  field('fileName', 'File name', 'internet', ({ rng }) => `${slug(rng)}.${rng.pick(FILE_EXTENSIONS)}`),

  field('creditCard', 'Card number', 'finance', (c) => c.card().number),
  field('cardBrand', 'Card brand', 'finance', (c) => CARD_BRAND_LABELS[c.card().brand]),
  field('cardExpiry', 'Card expiry', 'finance', ({ rng, now }) => {
    const date = new Date(now + between(rng, 60, 5 * 365) * DAY_MS)
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCFullYear()).slice(2)}`
  }),
  field('cvv', 'CVV', 'finance', (c) => c.rng.chars('0123456789', c.card().brand === 'amex' ? 4 : 3)),
  field('iban', 'IBAN', 'finance', (c) => generateIban(c.rng, c.rng.pick(IBAN_COUNTRIES).code)),
  field('bic', 'BIC / SWIFT', 'finance', ({ rng }) =>
    `${rng.chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)}${rng.pick(IBAN_COUNTRIES).code}${rng.chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 2)}${rng.bool() ? 'XXX' : ''}`,
  ),
  field('currency', 'Currency', 'finance', (c) => c.rng.pick(CURRENCIES).code),
  field('amount', 'Amount', 'finance', (c) => c.rng.float(1, 5000, 2), 'decimal'),
  field('price', 'Price (formatted)', 'finance', ({ rng }) => {
    const currency = rng.pick(CURRENCIES)
    return `${currency.symbol}${rng.float(0.99, 999.99, 2).toFixed(2)}`
  }),

  field('uuid', 'UUID v4', 'identifiers', (c) => uuidV4(c.rng)),
  field('ulid', 'ULID', 'identifiers', ({ rng, now }) => ulid(rng, now - between(rng, 0, 365) * DAY_MS)),
  field('nanoid', 'Nano ID', 'identifiers', (c) => c.rng.chars(BASE64URL, 21)),
  field('objectId', 'Mongo ObjectId', 'identifiers', ({ rng, now }) =>
    Math.floor((now - between(rng, 0, 365) * DAY_MS) / 1000).toString(16).padStart(8, '0') + rng.hex(16),
  ),
  field('autoIncrement', 'Auto-increment ID', 'identifiers', (c) => c.index + 1, 'integer'),
  field('sku', 'SKU', 'identifiers', ({ rng }) => `SKU-${rng.chars('ABCDEFGHJKLMNPQRSTUVWXYZ', 3)}-${rng.chars('0123456789', 5)}`),
  field('orderId', 'Order number', 'identifiers', ({ rng, now }) =>
    `ORD-${new Date(now).getUTCFullYear()}-${rng.chars('0123456789', 6)}`,
  ),
  field('isbn', 'ISBN-13', 'identifiers', (c) => ean13(c.rng, '978')),
  field('ean', 'EAN-13 barcode', 'identifiers', (c) => ean13(c.rng)),
  field('semver', 'Semantic version', 'identifiers', ({ rng }) => `${rng.int(0, 5)}.${rng.int(0, 20)}.${rng.int(0, 40)}`),

  field('date', 'Date', 'datetime', ({ rng, now }) => isoDate(now + between(rng, -3 * 365, 3 * 365) * DAY_MS)),
  field('datetime', 'Date-time (ISO 8601)', 'datetime', ({ rng, now }) =>
    new Date(now + between(rng, -3 * 365 * DAY_MS, 3 * 365 * DAY_MS)).toISOString(),
  ),
  field('time', 'Time', 'datetime', ({ rng }) =>
    [rng.int(0, 23), rng.int(0, 59), rng.int(0, 59)].map((part) => String(part).padStart(2, '0')).join(':'),
  ),
  field('timestamp', 'Unix timestamp', 'datetime', ({ rng, now }) =>
    Math.floor((now + between(rng, -3 * 365 * DAY_MS, 3 * 365 * DAY_MS)) / 1000), 'integer',
  ),
  field('pastDate', 'Past date', 'datetime', ({ rng, now }) => isoDate(now - between(rng, 1, 2 * 365) * DAY_MS)),
  field('futureDate', 'Future date', 'datetime', ({ rng, now }) => isoDate(now + between(rng, 1, 2 * 365) * DAY_MS)),

  field('word', 'Word', 'text', (c) => c.rng.pick(LOREM_WORDS)),
  field('title', 'Title', 'text', ({ rng }) => words(rng, rng.int(3, 6)).map(capitalize).join(' ')),
  field('sentence', 'Sentence', 'text', (c) => sentence(c.rng)),
  field('paragraph', 'Paragraph', 'text', ({ rng }) =>
    Array.from({ length: rng.int(3, 5) }, () => sentence(rng)).join(' '),
  ),

  field('boolean', 'Boolean', 'misc', (c) => c.rng.bool(), 'boolean'),
  field('integer', 'Integer', 'misc', (c) => c.rng.int(0, 10_000), 'integer'),
  field('decimal', 'Decimal', 'misc', (c) => c.rng.float(0, 1000, 2), 'decimal'),
  field('percentage', 'Percentage', 'misc', (c) => c.rng.int(0, 100), 'integer'),
  field('rating', 'Rating (1–5)', 'misc', (c) => c.rng.int(1, 5), 'integer'),
  field('status', 'Status', 'misc', (c) => c.rng.pick(STATUSES)),
  field('priority', 'Priority', 'misc', (c) => c.rng.pick(PRIORITIES)),
  field('hexColor', 'Hex color', 'misc', (c) => `#${c.rng.hex(6)}`),
]

const FIELD_INDEX = new Map(FIELD_TYPES.map((type) => [type.id, type]))

export function getFieldType(id: string): FieldType | undefined {
  return FIELD_INDEX.get(id)
}

export function fieldsByCategory(category: FieldCategory): FieldType[] {
  return FIELD_TYPES.filter((type) => type.category === category)
}

export interface ColumnSpec {
  id: string
  name: string
  type: string
  nullable?: boolean
}

export interface DatasetOptions {
  seed: string | number
  /** 0–100; only applied to columns marked nullable. */
  nullPercent?: number
  now?: number
}

export const MAX_DATASET_ROWS = 10_000

/** Column names as they appear in output: blanks get a fallback and duplicates a numeric suffix. */
export function uniqueColumnNames(columns: readonly ColumnSpec[]): string[] {
  const seen = new Map<string, number>()
  return columns.map((column, index) => {
    const base = column.name.trim() || `column_${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

export function generateDataset(
  columns: readonly ColumnSpec[],
  count: number,
  { seed, nullPercent = 0, now = Date.now() }: DatasetOptions,
): DataRow[] {
  const rng = createRng(seed)
  const names = uniqueColumnNames(columns)
  const total = Math.min(Math.max(0, Math.floor(count)), MAX_DATASET_ROWS)
  const nullChance = Math.min(Math.max(nullPercent, 0), 100) / 100
  return Array.from({ length: total }, (_, index) => {
    const ctx = createContext(rng, index, now)
    const row: DataRow = {}
    columns.forEach((column, columnIndex) => {
      const type = getFieldType(column.type)
      const value = type ? type.generate(ctx) : null
      row[names[columnIndex]] = column.nullable && nullChance > 0 && rng.next() < nullChance ? null : value
    })
    return row
  })
}

/** One coherent record (same person, place and card) for a set of field types. */
export function generateRecord(typeIds: readonly string[], rng: Rng, now = Date.now()): DataRow {
  const ctx = createContext(rng, 0, now)
  const record: DataRow = {}
  for (const id of typeIds) record[id] = getFieldType(id)?.generate(ctx) ?? null
  return record
}
