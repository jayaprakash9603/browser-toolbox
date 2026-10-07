import { describe, expect, it } from 'vitest'

import { UNIT_CATEGORIES, convertUnit, getUnitCategory } from '@/core/engines/unit'
import { BASE_LABELS, bitRepresentation, formatBaseValue, parseBaseValue } from '@/core/engines/base'
import { generateIds, generateNanoId, generateUuidV4, generateUuidV7, isValidUuid, uuidVersion } from '@/core/engines/id'
import { generatePassword, generatePasswords, randomHex, randomInt, randomString, DEFAULT_PASSWORD_OPTIONS } from '@/core/engines/password'
import { convertToTimeZones, formatInTimeZone, formatOffset, isValidTimeZone, timeZoneOffsetMinutes } from '@/core/engines/timezone'

describe('unit engine', () => {
  it('covers all 13 categories with a base unit each', () => {
    expect(UNIT_CATEGORIES).toHaveLength(13)
    for (const category of UNIT_CATEGORIES) {
      expect(category.units.some((unit) => unit.toBase === 1 && unit.id === category.base.toLowerCase().replace(/[^a-z]/g, '') || category.units.some((u) => u.toBase === 1))).toBe(true)
    }
  })

  it('converts length', () => {
    expect(convertUnit('length', 1, 'km', 'm')).toEqual({ ok: true, value: 1000 })
    const feet = convertUnit('length', 12, 'in', 'ft')
    expect(feet.ok).toBe(true)
    if (feet.ok) expect(feet.value).toBeCloseTo(1)
  })

  it('converts temperature with offsets', () => {
    expect(convertUnit('temperature', 32, 'f', 'c')).toEqual({ ok: true, value: 0 })
    expect(convertUnit('temperature', 100, 'c', 'f')).toEqual({ ok: true, value: 212 })
    const kelvin = convertUnit('temperature', 0, 'c', 'k')
    expect(kelvin.ok).toBe(true)
    if (kelvin.ok) expect(kelvin.value).toBeCloseTo(273.15)
  })

  it('converts data with both SI and IEC units', () => {
    expect(convertUnit('data', 1, 'KB', 'B')).toEqual({ ok: true, value: 1000 })
    expect(convertUnit('data', 1, 'KiB', 'B')).toEqual({ ok: true, value: 1024 })
    expect(convertUnit('data', 8, 'b', 'B')).toEqual({ ok: true, value: 1 })
  })

  it('rejects invalid input', () => {
    expect(convertUnit('length', Number.NaN, 'm', 'km').ok).toBe(false)
    expect(convertUnit('nope', 1, 'a', 'b').ok).toBe(false)
    expect(getUnitCategory('nope')).toBeUndefined()
  })
})

describe('base engine', () => {
  it('converts between bases', () => {
    const value = parseBaseValue('ff', 16)
    expect(value).toEqual({ ok: true, value: 255n })
    if (value.ok) {
      expect(formatBaseValue(value.value, 2)).toBe('11111111')
      expect(formatBaseValue(value.value, 8)).toBe('377')
      expect(formatBaseValue(value.value, 10)).toBe('255')
    }
  })

  it('handles prefixes, underscores and negatives', () => {
    expect(parseBaseValue('0b1010', 2)).toEqual({ ok: true, value: 10n })
    expect(parseBaseValue('1_000', 10)).toEqual({ ok: true, value: 1000n })
    expect(parseBaseValue('-10', 10)).toEqual({ ok: true, value: -10n })
    expect(formatBaseValue(-255n, 16)).toBe('-ff')
  })

  it('rejects invalid digits per base', () => {
    expect(parseBaseValue('2', 2).ok).toBe(false)
    expect(parseBaseValue('', 10).ok).toBe(false)
  })

  it('formats bit representations in nibbles', () => {
    expect(bitRepresentation(255n)).toBe('1111 1111')
    expect(bitRepresentation(5n)).toBe('0000 0101')
  })

  it('has labels for all bases', () => {
    expect(BASE_LABELS[2]).toBe('Binary')
    expect(BASE_LABELS[16]).toBe('Hexadecimal')
  })
})

describe('id engine', () => {
  it('generates valid v4 uuids', () => {
    const id = generateUuidV4()
    expect(isValidUuid(id)).toBe(true)
    expect(uuidVersion(id)).toBe(4)
  })

  it('generates valid v7 uuids with the timestamp prefix', () => {
    const id = generateUuidV7(0)
    expect(isValidUuid(id)).toBe(true)
    expect(uuidVersion(id)).toBe(7)
    expect(id.startsWith('00000000-0000')).toBe(true)
  })

  it('rejects invalid uuids', () => {
    expect(isValidUuid('nope')).toBe(false)
    expect(uuidVersion('nope')).toBeNull()
  })

  it('generates nanoids of the requested length', () => {
    expect(generateNanoId(10)).toHaveLength(10)
    expect(generateNanoId()).toHaveLength(21)
  })

  it('generates unique bulk ids', () => {
    const ids = generateIds('uuid-v4', 50)
    expect(new Set(ids).size).toBe(50)
    expect(generateIds('nanoid', 1000, 8)).toHaveLength(500)
  })
})

describe('password engine', () => {
  it('generates passwords with the requested length and charset', () => {
    const result = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 24, symbols: false })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(24)
      expect(result.value).toMatch(/^[A-Za-z0-9]+$/)
    }
  })

  it('excludes ambiguous characters when asked', () => {
    const result = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 200, excludeAmbiguous: true, symbols: false })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).not.toMatch(/[Il1O0]/)
  })

  it('requires at least one charset', () => {
    const result = generatePassword({ length: 10, uppercase: false, lowercase: false, numbers: false, symbols: false, excludeAmbiguous: false })
    expect(result.ok).toBe(false)
  })

  it('generates bulk passwords and random values', () => {
    expect(generatePasswords(DEFAULT_PASSWORD_OPTIONS, 5)).toHaveLength(5)
    expect(randomString(32)).toHaveLength(32)
    expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/)
    const value = randomInt(5, 5)
    expect(value).toBe(5)
    expect(randomInt(1, 6)).toBeGreaterThanOrEqual(1)
  })
})

describe('timezone engine', () => {
  it('validates timezones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true)
    expect(isValidTimeZone('Nowhere/land')).toBe(false)
  })

  it('formats dates in a target zone', () => {
    const date = new Date('2026-10-07T12:00:00Z')
    const result = formatInTimeZone(date, 'Asia/Kolkata')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('17:30')
    expect(formatInTimeZone(date, 'bad/zone').ok).toBe(false)
  })

  it('computes offsets', () => {
    const date = new Date('2026-10-07T12:00:00Z')
    expect(timeZoneOffsetMinutes(date, 'UTC')).toEqual({ ok: true, value: 0 })
    expect(timeZoneOffsetMinutes(date, 'Asia/Kolkata')).toEqual({ ok: true, value: 330 })
    expect(formatOffset(330)).toBe('UTC+05:30')
    expect(formatOffset(-300)).toBe('UTC-05:00')
  })

  it('converts to multiple zones and skips invalid ones', () => {
    const date = new Date('2026-10-07T12:00:00Z')
    const results = convertToTimeZones(date, ['UTC', 'Asia/Kolkata', 'bad/zone'])
    expect(results).toHaveLength(2)
    expect(results[1].formatted).toContain('17:30')
  })
})
