import md5 from 'md5'
import { describe, expect, it } from 'vitest'

import { compareBlobs, hexWindow } from '@/core/engines/hash/compare'
import { Crc32 } from '@/core/engines/hash/crc32'
import { compareExpected, decodeInput, digestBlob, digestBytes, formatDigest, parseExpected } from '@/core/engines/hash/digests'
import { parseManifest, toManifest, verifyManifest } from '@/core/engines/hash/manifest'
import { Md5 } from '@/core/engines/hash/md5'
import { buildEvidenceReport, toCsv, verifyEvidenceSeal, type EvidenceItem } from '@/core/engines/hash/report'
import { checkExtension, detectSignature } from '@/core/engines/hash/signature'

const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
const bytes = (text: string) => new TextEncoder().encode(text)

function pseudoRandom(length: number, seed = 7): Uint8Array {
  const out = new Uint8Array(length)
  let x = seed
  for (let i = 0; i < length; i += 1) {
    x = (x * 1103515245 + 12345) >>> 0
    out[i] = x >>> 24
  }
  return out
}

describe('streaming digests', () => {
  it('matches reference MD5 across chunk boundaries', () => {
    expect(new Md5().update(bytes('')).digest()).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(new Md5().update(bytes('abc')).digest()).toBe('900150983cd24fb0d6963f7d28e17f72')
    for (const size of [55, 56, 63, 64, 65, 127, 128, 1000, 70_001]) {
      const data = pseudoRandom(size, size)
      const split = new Md5()
      for (let at = 0; at < size; at += 37) split.update(data.subarray(at, at + 37))
      expect(split.digest()).toBe(md5(Array.from(data)))
    }
  })

  it('computes CRC-32 check value', () => {
    expect(new Crc32().update(bytes('123456789')).digest()).toBe('cbf43926')
  })

  it('hashes a file with every algorithm, entropy and type in one pass', async () => {
    const result = await digestBlob(new Blob([bytes('abc')]))
    expect(result.digests['SHA-256']).toBe(SHA256_ABC)
    expect(result.digests.MD5).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(result.digests.CRC32).toBe('352441c2')
    expect(result.signature?.id).toBe('text')

    expect((await digestBlob(new Blob([bytes('aaaa')]))).entropy).toBe(0)
    const everyByte = Uint8Array.from({ length: 256 }, (_, i) => i)
    expect((await digestBlob(new Blob([everyByte]))).entropy).toBeCloseTo(8)
  })

  it('agrees with in-memory digests and reports progress', async () => {
    const data = pseudoRandom(9 * 1024 * 1024)
    const progress: number[] = []
    const streamed = await digestBlob(new Blob([data.slice()]), { onProgress: (p) => progress.push(p) })
    expect(streamed.digests).toEqual(await digestBytes(data))
    expect(progress.at(-1)).toBe(1)
    expect(progress.length).toBeGreaterThan(2)
  })

  it('stops when cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(digestBlob(new Blob([bytes('x')]), { signal: controller.signal })).rejects.toThrow(/cancelled/)
  })
})

describe('input and expected hashes', () => {
  it('decodes hex and Base64 input bytes', () => {
    const decoded = (text: string, encoding: 'hex' | 'base64') => {
      const result = decodeInput(text, encoding)
      return result.ok ? Array.from(result.bytes) : result.error
    }
    expect(decoded('61 62:63', 'hex')).toEqual([0x61, 0x62, 0x63])
    expect(decoded('YWJj', 'base64')).toEqual([0x61, 0x62, 0x63])
    expect(decoded('6', 'hex')).toBe('hex')
  })

  it('formats digests', () => {
    expect(formatDigest('ab01', 'HEX')).toBe('AB01')
    expect(formatDigest(SHA256_ABC, 'base64')).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=')
  })

  it('recognises pasted hashes in any common notation', () => {
    expect(parseExpected(SHA256_ABC.toUpperCase())).toEqual({ hex: SHA256_ABC, candidates: ['SHA-256'] })
    expect(parseExpected(`sha256=${SHA256_ABC}`)?.candidates).toEqual(['SHA-256'])
    expect(parseExpected('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=')?.hex).toBe(SHA256_ABC)
    expect(parseExpected('90:01:50:98:3c:d2:4f:b0:d6:96:3f:7d:28:e1:7f:72')?.candidates).toEqual(['MD5'])
    expect(parseExpected('md5: 900150983cd24fb0d6963f7d28e17f72')?.candidates).toEqual(['MD5'])
    expect(parseExpected('not a hash')).toBeNull()
  })

  it('reports match and mismatch', async () => {
    const digests = await digestBytes(bytes('abc'))
    expect(compareExpected(parseExpected(SHA256_ABC), digests)).toEqual({ state: 'match', algorithm: 'SHA-256' })
    expect(compareExpected(parseExpected('0'.repeat(64)), digests)).toEqual({ state: 'mismatch', algorithms: ['SHA-256'] })
  })
})

describe('file signatures', () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
  const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00])

  it('detects content type and disguised extensions', () => {
    expect(detectSignature(png)?.id).toBe('png')
    expect(checkExtension('photo.png', detectSignature(png))).toBe('match')
    expect(checkExtension('invoice.pdf', detectSignature(png))).toBe('mismatch')
    expect(detectSignature(exe)?.risky).toBe(true)
    expect(checkExtension('holiday.jpg', detectSignature(exe))).toBe('mismatch')
    expect(checkExtension('notes.txt', detectSignature(bytes('hello')))).toBe('match')
    expect(checkExtension('setup.exe', detectSignature(bytes('hello')))).toBe('mismatch')
    expect(detectSignature(bytes('BMW quarterly report'))?.id).toBe('text')
  })
})

describe('byte comparison', () => {
  const original = pseudoRandom(10_000)

  it('finds identical files', async () => {
    const result = await compareBlobs(new Blob([original.slice()]), new Blob([original.slice()]))
    expect(result).toMatchObject({ identical: true, firstDifference: null, differingBytes: 0, ranges: [] })
  })

  it('locates and groups edits', async () => {
    const edited = original.slice()
    edited[100] ^= 1
    edited[105] ^= 1
    edited[5000] ^= 1
    const result = await compareBlobs(new Blob([original.slice()]), new Blob([edited]))
    expect(result.identical).toBe(false)
    expect(result.firstDifference).toBe(100)
    expect(result.differingBytes).toBe(3)
    expect(result.ranges).toEqual([
      { start: 100, end: 106 },
      { start: 5000, end: 5001 },
    ])
    const rows = await hexWindow(new Blob([original.slice()]), new Blob([edited]), 100)
    expect(rows[0].offset).toBe(80)
    expect(rows.some((row) => row.a.some((v, i) => v !== row.b[i]))).toBe(true)
  })

  it('treats appended data as a change at the old end', async () => {
    const longer = new Uint8Array([...original, 1, 2, 3])
    const result = await compareBlobs(new Blob([original.slice()]), new Blob([longer]))
    expect(result).toMatchObject({ identical: false, firstDifference: 10_000, differingBytes: 0 })
  })
})

describe('checksum lists', () => {
  it('parses GNU and BSD formats and verifies files', () => {
    const manifest = parseManifest(
      [
        '# release',
        `${SHA256_ABC}  ./docs/abc.txt`,
        `${'1'.repeat(64)} *changed.bin`,
        'MD5 (gone.txt) = 900150983cd24fb0d6963f7d28e17f72',
        'garbage line',
      ].join('\n'),
    )
    expect(manifest.entries.map((e) => [e.name, e.algorithm])).toEqual([
      ['./docs/abc.txt', 'SHA-256'],
      ['changed.bin', 'SHA-256'],
      ['gone.txt', 'MD5'],
    ])
    expect(manifest.invalidLines).toEqual([5])

    const items = [
      { id: 'a', path: 'docs/abc.txt', digests: { 'SHA-256': SHA256_ABC } },
      { id: 'b', path: 'changed.bin', digests: { 'SHA-256': '2'.repeat(64) } },
      { id: 'c', path: 'extra.txt', digests: { 'SHA-256': '3'.repeat(64) } },
    ]
    const { rows, unlisted } = verifyManifest(manifest, items)
    expect(rows.map((r) => r.status)).toEqual(['verified', 'modified', 'missing'])
    expect(unlisted.map((i) => i.path)).toEqual(['extra.txt'])
    expect(toManifest(items.slice(0, 1), 'SHA-256')).toBe(`${SHA256_ABC}  docs/abc.txt`)
    expect(toManifest(items.slice(0, 1), 'SHA-256', 'bsd')).toBe(`SHA256 (docs/abc.txt) = ${SHA256_ABC}`)
  })
})

describe('evidence report', () => {
  const item: EvidenceItem = {
    path: '=cmd.csv',
    size: 3,
    reportedType: 'text/csv',
    lastModified: 0,
    hashedAt: '2026-10-28T00:00:00.000Z',
    digests: { 'SHA-256': SHA256_ABC },
    detectedType: 'Plain text',
    extension: 'match',
    entropy: 1.5849625,
  }

  it('seals the report so edits are detectable', async () => {
    const report = await buildEvidenceReport([item], { caseReference: 'CASE-7', note: '  ' }, new Date(0))
    expect(report.case).toEqual({ caseReference: 'CASE-7' })
    expect(report.seal).toMatch(/^[0-9a-f]{64}$/)
    expect(await verifyEvidenceSeal(report)).toBe(true)
    expect(await verifyEvidenceSeal({ ...report, items: [{ ...item, size: 4 }] })).toBe(false)
  })

  it('exports CSV without spreadsheet formulas', () => {
    const csv = toCsv([item], ['SHA-256'])
    expect(csv.split('\r\n')[1].startsWith("'=cmd.csv,3,")).toBe(true)
  })
})
