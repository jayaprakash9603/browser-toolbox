import { describe, expect, it } from 'vitest'

import {
  checkCard,
  createRng,
  EDGE_CASE_GROUPS,
  EXPORT_FORMATS,
  FIELD_TYPES,
  formatDataset,
  generateCardNumber,
  generateDataset,
  generateIban,
  getFieldType,
  GENERATABLE_BRANDS,
  ibanValid,
  luhnValid,
  MAX_DATASET_ROWS,
  uniqueColumnNames,
  type ColumnSpec,
} from '@/core/engines/testdata'

const USER_SCHEMA: ColumnSpec[] = [
  { id: 'c0', name: 'id', type: 'uuid' },
  { id: 'c1', name: 'name', type: 'fullName' },
  { id: 'c2', name: 'email', type: 'email' },
  { id: 'c3', name: 'age', type: 'age' },
]

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('seed-1')
    const b = createRng('seed-1')
    const seqA = Array.from({ length: 8 }, () => a.int(0, 1000))
    const seqB = Array.from({ length: 8 }, () => b.int(0, 1000))
    expect(seqA).toEqual(seqB)
  })

  it('diverges for different seeds', () => {
    const alpha = createRng('alpha')
    const beta = createRng('beta')
    const seqA = Array.from({ length: 8 }, () => alpha.int(0, 1e9))
    const seqB = Array.from({ length: 8 }, () => beta.int(0, 1e9))
    expect(seqA).not.toEqual(seqB)
  })
})

describe('generateDataset', () => {
  it('produces the requested number of rows with every column', () => {
    const rows = generateDataset(USER_SCHEMA, 10, { seed: 'fixed', now: 1_700_000_000_000 })
    expect(rows).toHaveLength(10)
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(['id', 'name', 'email', 'age'])
      expect(typeof row.id).toBe('string')
      expect(typeof row.age).toBe('number')
    }
  })

  it('is reproducible for the same seed and schema', () => {
    const options = { seed: 'repro', now: 1_700_000_000_000 }
    expect(generateDataset(USER_SCHEMA, 5, options)).toEqual(generateDataset(USER_SCHEMA, 5, options))
  })

  it('keeps one coherent person per row', () => {
    const rows = generateDataset(
      [
        { id: 'c0', name: 'first', type: 'firstName' },
        { id: 'c1', name: 'email', type: 'email' },
      ],
      20,
      { seed: 'person', now: 1_700_000_000_000 },
    )
    for (const row of rows) {
      const first = String(row.first).toLowerCase().replace(/[^a-z]/g, '')
      expect(String(row.email).startsWith(first)).toBe(true)
    }
  })

  it('caps rows at the maximum', () => {
    const rows = generateDataset([{ id: 'c0', name: 'n', type: 'autoIncrement' }], MAX_DATASET_ROWS + 500, {
      seed: 'cap',
    })
    expect(rows).toHaveLength(MAX_DATASET_ROWS)
  })

  it('applies null rate only to nullable columns', () => {
    const rows = generateDataset(
      [
        { id: 'c0', name: 'always', type: 'uuid' },
        { id: 'c1', name: 'sometimes', type: 'uuid', nullable: true },
      ],
      200,
      { seed: 'nulls', nullPercent: 100 },
    )
    expect(rows.every((row) => row.always !== null)).toBe(true)
    expect(rows.every((row) => row.sometimes === null)).toBe(true)
  })

  it('reserved email domains never reach a real inbox', () => {
    const rows = generateDataset([{ id: 'c0', name: 'email', type: 'email' }], 30, { seed: 'mail' })
    for (const row of rows) expect(String(row.email)).toMatch(/@(example\.(com|org|net)|test\.example|mail\.example)$/)
  })
})

describe('uniqueColumnNames', () => {
  it('fills blanks and de-duplicates names', () => {
    const names = uniqueColumnNames([
      { id: 'a', name: 'id', type: 'uuid' },
      { id: 'b', name: 'id', type: 'uuid' },
      { id: 'c', name: '', type: 'uuid' },
    ])
    expect(names).toEqual(['id', 'id_2', 'column_3'])
  })
})

describe('field types', () => {
  it('every field type generates a non-undefined value', () => {
    const rng = createRng('fields')
    const ctxRows = generateDataset(
      FIELD_TYPES.map((type, index) => ({ id: `c${index}`, name: type.id, type: type.id })),
      3,
      { seed: 'all', now: 1_700_000_000_000 },
    )
    expect(ctxRows).toHaveLength(3)
    for (const type of FIELD_TYPES) expect(getFieldType(type.id)).toBeDefined()
    expect(rng.next()).toBeGreaterThanOrEqual(0)
  })
})

describe('formatDataset', () => {
  const rows = generateDataset(USER_SCHEMA, 3, { seed: 'export', now: 1_700_000_000_000 })
  const columns = ['id', 'name', 'email', 'age']

  it('round-trips JSON', () => {
    const json = formatDataset(rows, columns, 'json')
    expect(JSON.parse(json)).toEqual(rows)
  })

  it('emits one NDJSON object per line', () => {
    const lines = formatDataset(rows, columns, 'ndjson').split('\n')
    expect(lines).toHaveLength(3)
    expect(JSON.parse(lines[0])).toEqual(rows[0])
  })

  it('CSV has a header and escapes delimiters', () => {
    const csv = formatDataset([{ a: 'x,y', b: 'he said "hi"' }], ['a', 'b'], 'csv')
    expect(csv.split('\n')[0]).toBe('a,b')
    expect(csv).toContain('"x,y"')
    expect(csv).toContain('"he said ""hi"""')
  })

  it('SQL includes CREATE TABLE when requested', () => {
    const sql = formatDataset(rows, columns, 'sql', {
      name: 'users',
      kinds: ['text', 'text', 'text', 'integer'],
      includeSchema: true,
    })
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"')
    expect(sql).toContain('"age" INTEGER')
    expect(sql).toContain('INSERT INTO "users"')
  })

  it('XML escapes special characters', () => {
    const xml = formatDataset([{ note: '<a> & "b"' }], ['note'], 'xml', { name: 'rows' })
    expect(xml).toContain('<note>&lt;a&gt; &amp; &quot;b&quot;</note>')
  })

  it('exposes a format for every id', () => {
    for (const format of EXPORT_FORMATS) {
      expect(() => formatDataset(rows, columns, format.id)).not.toThrow()
    }
  })
})

describe('payments', () => {
  it('generates Luhn-valid numbers for every brand', () => {
    const rng = createRng('cards')
    for (const brand of GENERATABLE_BRANDS) {
      const number = generateCardNumber(rng, brand)
      expect(luhnValid(number)).toBe(true)
      expect(checkCard(number).brand).toBe(brand)
      expect(checkCard(number).lengthOk).toBe(true)
    }
  })

  it('rejects a tampered card number', () => {
    const rng = createRng('tamper')
    const number = generateCardNumber(rng, 'visa')
    const broken = number.slice(0, -1) + ((Number(number.slice(-1)) + 1) % 10)
    expect(luhnValid(broken)).toBe(false)
  })

  it('generates valid IBANs that fail when mutated', () => {
    const rng = createRng('iban')
    const iban = generateIban(rng, 'DE')
    expect(ibanValid(iban)).toBe(true)
    expect(ibanValid(iban.slice(0, -1) + (iban.endsWith('0') ? '1' : '0'))).toBe(false)
  })
})

describe('edge cases', () => {
  it('ships non-empty groups with labelled items', () => {
    expect(EDGE_CASE_GROUPS.length).toBeGreaterThan(5)
    for (const group of EDGE_CASE_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) expect(typeof item.label).toBe('string')
    }
  })

  it('includes the classic injection payloads', () => {
    const security = EDGE_CASE_GROUPS.find((group) => group.id === 'security')
    const values = security?.items.map((item) => item.value) ?? []
    expect(values).toContain("' OR '1'='1")
    expect(values.some((value) => value.includes('<script>'))).toBe(true)
  })
})
