import { describe, expect, it } from 'vitest'

import { formatYaml, jsonToYaml, parseYaml, validateYaml, yamlToJson } from '@/core/engines/yaml'
import { buildXml, formatXml, minifyXml, validateXml, xmlToJson } from '@/core/engines/xml'
import { formatSql, minifySql, validateSql, SQL_DIALECTS } from '@/core/engines/sql'
import { csvToJson, csvToMarkdown, csvToRecords, csvToTsv, detectDelimiter, jsonToCsv, parseCsv, tsvToCsv } from '@/core/engines/csv'
import { buildContactPayload, buildEmailPayload, buildPhonePayload, buildWifiPayload, decodeQrFromImage, generateQrDataUrl, generateQrSvg, normalizeQrInput } from '@/core/engines/qrcode'
import { detectContent } from '@/core/engines/detection'

describe('yaml engine', () => {
  it('parses and validates yaml', () => {
    const result = parseYaml('name: Ada\nage: 36\n')
    expect(result).toEqual({ ok: true, value: { name: 'Ada', age: 36 } })
    expect(validateYaml('name: Ada').valid).toBe(true)
    expect(validateYaml('  - a\n - b\n bad: : :').valid).toBe(false)
  })

  it('converts yaml ↔ json', () => {
    const json = yamlToJson('a: 1\nb: [x, y]')
    expect(json.ok).toBe(true)
    if (json.ok) expect(JSON.parse(json.value)).toEqual({ a: 1, b: ['x', 'y'] })
    const yaml = jsonToYaml('{"a":1}')
    expect(yaml.ok).toBe(true)
    if (yaml.ok) expect(yaml.value).toContain('a: 1')
  })

  it('formats yaml and reports errors with position', () => {
    expect(formatYaml('a:  1').ok).toBe(true)
    const bad = formatYaml('a: [1,\n 2')
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toMatch(/line/i)
  })

  it('rejects empty input', () => {
    expect(parseYaml(' ').ok).toBe(false)
    expect(jsonToYaml('').ok).toBe(false)
  })
})

describe('xml engine', () => {
  it('validates well-formed xml', () => {
    expect(validateXml('<root><a>1</a></root>').valid).toBe(true)
    const bad = validateXml('<root><a></root>')
    expect(bad.valid).toBe(false)
    expect(bad.error?.line).toBeGreaterThan(0)
  })

  it('formats and minifies', () => {
    const formatted = formatXml('<root><a>1</a><b/></root>')
    expect(formatted.ok).toBe(true)
    if (formatted.ok) expect(formatted.value).toContain('\n  <a>')
    const minified = minifyXml('<root>\n  <a>1</a>\n</root>')
    expect(minified).toEqual({ ok: true, value: '<root><a>1</a></root>' })
  })

  it('refuses to format invalid xml', () => {
    expect(formatXml('<root><oops></root>').ok).toBe(false)
    expect(minifyXml('<root><oops></root>').ok).toBe(false)
  })

  it('converts xml to json', () => {
    const result = xmlToJson('<root><name>Ada</name><age>36</age></root>')
    expect(result.ok).toBe(true)
    if (result.ok) expect(JSON.parse(result.value)).toEqual({ root: { name: 'Ada', age: 36 } })
  })

  it('escapes text and builds xml from objects', () => {
    const built = buildXml({ name: 'A & B' }, 'person')
    expect(built.ok).toBe(true)
    if (built.ok) expect(built.value).toContain('A &amp; B')
  })
})

describe('sql engine', () => {
  it('formats with uppercase keywords', () => {
    const result = formatSql('select id, name from users where active = true')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain('SELECT')
      expect(result.value).toContain('\n')
    }
  })

  it('supports dialect selection', () => {
    expect(SQL_DIALECTS.length).toBeGreaterThanOrEqual(8)
    const result = formatSql('select top 1 * from users', 'transactsql')
    expect(result.ok).toBe(true)
  })

  it('minifies to a single line', () => {
    const result = minifySql('select id\nfrom users\nwhere active = true')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).not.toContain('\n')
  })

  it('rejects empty input and invalid sql', () => {
    expect(formatSql('').ok).toBe(false)
    expect(validateSql('select from where (((').valid).toBe(false)
  })
})

describe('csv engine', () => {
  it('parses quoted fields with commas and newlines', () => {
    const result = parseCsv('a,b\n"x,y","line1\nline2"')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual([['a', 'b'], ['x,y', 'line1\nline2']])
    }
  })

  it('handles escaped quotes', () => {
    expect(parseCsv('"say ""hi"""')).toEqual({ ok: true, value: [['say "hi"']] })
  })

  it('detects delimiters', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t')
    expect(detectDelimiter('a;b;c')).toBe(';')
  })

  it('fails on unclosed quotes and empty input', () => {
    expect(parseCsv('"open').ok).toBe(false)
    expect(parseCsv('  ').ok).toBe(false)
  })

  it('converts csv to records and json', () => {
    const table = csvToRecords('name,age\nAda,36')
    expect(table.ok).toBe(true)
    if (table.ok) {
      expect(table.value.headers).toEqual(['name', 'age'])
      expect(table.value.records[0]).toEqual({ name: 'Ada', age: '36' })
    }
    const json = csvToJson('name\nAda')
    expect(json.ok).toBe(true)
  })

  it('converts json to csv with escaping', () => {
    const result = jsonToCsv('[{"a":"x,y","b":1}]')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('a,b\n"x,y",1')
    expect(jsonToCsv('{"a":1}').ok).toBe(false)
  })

  it('converts csv ↔ tsv', () => {
    const tsv = csvToTsv('a,b\n1,2')
    expect(tsv).toEqual({ ok: true, value: 'a\tb\n1\t2' })
    expect(tsvToCsv('a\tb\n1\t2')).toEqual({ ok: true, value: 'a,b\n1,2' })
  })

  it('converts csv to markdown tables', () => {
    const result = csvToMarkdown('name|skip\na|b')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('| name | skip |')
  })
})

describe('qrcode engine', () => {
  it('builds wifi payloads with escaping', () => {
    expect(buildWifiPayload({ ssid: 'My;Net', password: 'p:a\\ss', encryption: 'WPA' })).toBe('WIFI:T:WPA;S:My\\;Net;P:p\\:a\\\\ss;;')
    expect(buildWifiPayload({ ssid: 'Open', password: '', encryption: 'nopass', hidden: true })).toBe('WIFI:T:nopass;S:Open;H:true;;')
  })

  it('builds email, phone and contact payloads', () => {
    expect(buildEmailPayload({ to: 'a@b.co', subject: 'Hi there' })).toBe('mailto:a@b.co?subject=Hi+there')
    expect(buildPhonePayload('+1 (555) 123-4567')).toBe('tel:+15551234567')
    const vcard = buildContactPayload({ firstName: 'Ada', lastName: 'L', phone: '+1555', email: 'a@b.co' })
    expect(vcard).toContain('BEGIN:VCARD')
    expect(vcard).toContain('FN:Ada L')
  })

  it('normalizes bare urls', () => {
    expect(normalizeQrInput('example.com/x')).toBe('https://example.com/x')
    expect(normalizeQrInput('https://example.com')).toBe('https://example.com')
    expect(normalizeQrInput('just text')).toBe('just text')
  })

  it('generates data urls and svg', async () => {
    const dataUrl = await generateQrDataUrl('https://example.com')
    expect(dataUrl.ok).toBe(true)
    if (dataUrl.ok) expect(dataUrl.value).toMatch(/^data:image\/png/)
    expect((await generateQrSvg('hi')).ok).toBe(true)
    expect((await generateQrDataUrl('')).ok).toBe(false)
  })

  it('reports when no qr code is present in an image', async () => {
    const result = await decodeQrFromImage({ data: new Uint8ClampedArray(400), width: 20, height: 20 })
    expect(result.ok).toBe(false)
  })
})

describe('detection engine', () => {
  const futureJwt = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ exp: 9999999999 })).replace(/=+$/, '')}.sig`

  it('detects json', () => {
    const hits = detectContent('{"name":"John"}')
    expect(hits[0]).toMatchObject({ kind: 'json', confidence: 'high' })
  })

  it('detects jwt', () => {
    expect(detectContent(futureJwt).map((d) => d.kind)).toContain('jwt')
  })

  it('detects urls', () => {
    expect(detectContent('https://example.com?id=123').map((d) => d.kind)).toContain('url')
  })

  it('detects colors', () => {
    expect(detectContent('#3B82F6').map((d) => d.kind)).toContain('color')
    expect(detectContent('rgb(59, 130, 246)').map((d) => d.kind)).toContain('color')
  })

  it('detects timestamps', () => {
    expect(detectContent('1743256800').map((d) => d.kind)).toContain('timestamp')
  })

  it('detects xml and yaml', () => {
    expect(detectContent('<note><to>Ada</to></note>').map((d) => d.kind)).toContain('xml')
    expect(detectContent('name: Ada\nage: 36\ncity: Paris').map((d) => d.kind)).toContain('yaml')
  })

  it('detects base64', () => {
    expect(detectContent(btoa('Hello world, this is a test!')).map((d) => d.kind)).toContain('base64')
  })

  it('returns nothing for plain prose or empty input', () => {
    expect(detectContent('')).toHaveLength(0)
    expect(detectContent('Just a normal sentence about nothing in particular.')).toHaveLength(0)
  })
})
