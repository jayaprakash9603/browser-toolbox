import { strFromU8, strToU8, unzipSync } from 'fflate'
import md5 from 'md5'
import { describe, expect, it } from 'vitest'

import {
  gunzipFile,
  gzipFile,
  gzipStoredName,
  isGzip,
  isZip,
  unzipEntries,
  zipEntries,
} from '@/core/engines/files/archive'
import { parseDataSource, serializeData, tableToMarkdown, valueToXml } from '@/core/engines/files/data'
import {
  DEFAULT_DOCUMENT_SETTINGS,
  docToHtmlBody,
  docToPlainText,
  docToRtf,
  documentStem,
  parseDocument,
  parseInline,
} from '@/core/engines/files/document'
import { docToDocx } from '@/core/engines/files/docx'
import {
  base64ToBytes,
  byteProfile,
  bytesToBase64,
  convertLineEndings,
  detectSignature,
  extensionMatches,
  hashBytes,
  hexRows,
  matchHash,
  textProfile,
} from '@/core/engines/files/inspect'
import { familyOf, groupOf, isSameFormat } from '@/core/engines/files/kinds'
import { placeImage } from '@/core/engines/files/pdfImages'
import { toWinAnsi } from '@/core/engines/files/pdfLayout'
import { layoutTablePdf } from '@/core/engines/files/pdfTable'
import { layoutTextDocument } from '@/core/engines/files/pdfText'
import { columnName, rowsToXlsx } from '@/core/engines/files/xlsx'

const MARKDOWN = `# Title

Some **bold** and *italic* text with a [link](https://example.com).

- one
- two
  - nested
- [x] done

1. first
2. second

> quoted

\`\`\`
const x = 1
\`\`\`

---
`

describe('document model', () => {
  it('parses Markdown into headings, lists, quotes, code and rules', () => {
    const blocks = parseDocument(MARKDOWN, true)
    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'list',
      'list',
      'list',
      'list',
      'list',
      'list',
      'quote',
      'code',
      'rule',
    ])
    const nested = blocks[4]
    expect(nested.type === 'list' && nested.depth).toBe(1)
    const task = blocks[5]
    expect(task.type === 'list' && task.checked).toBe(true)
    const ordered = blocks[7]
    expect(ordered.type === 'list' && ordered.ordered && ordered.index).toBe(2)
  })

  it('keeps inline styles and only allows safe links', () => {
    expect(parseInline('a **b** `c` [d](javascript:void) [e](https://x.dev)')).toEqual([
      { text: 'a ' },
      { text: 'b', bold: true },
      { text: ' ' },
      { text: 'c', code: true },
      { text: ' d ' },
      { text: 'e', href: 'https://x.dev' },
    ])
  })

  it('preserves plain text line by line, including indentation', () => {
    const blocks = parseDocument('line one\n    indented\n\n# not a heading', false)
    expect(blocks).toEqual([
      { type: 'line', text: 'line one' },
      { type: 'line', text: '    indented' },
      { type: 'line', text: '' },
      { type: 'line', text: '# not a heading' },
    ])
  })

  it('exports plain text, escaped HTML and RTF', () => {
    const blocks = parseDocument('# Café <b>\n\n- **x**', true)
    expect(docToPlainText(blocks, 'Doc')).toContain('Café <b>')
    const html = docToHtmlBody(blocks, { title: '', lineNumbers: false })
    expect(html).toContain('&lt;b&gt;')
    expect(html).not.toContain('<b>')
    const rtf = docToRtf(blocks, DEFAULT_DOCUMENT_SETTINGS)
    expect(rtf.startsWith('{\\rtf1')).toBe(true)
    expect(rtf).toContain('\\u233?')
    expect(rtf).toContain('\\b ')
  })

  it('derives a file stem from the title or first line', () => {
    expect(documentStem('My Report: Q3', '', 'document')).toBe('My Report Q3')
    expect(documentStem('', '# Release notes\nbody', 'document')).toBe('Release notes')
    expect(documentStem('', '   ', 'document')).toBe('document')
  })
})

describe('office files', () => {
  it('writes a DOCX with styles, numbering and a page-number footer', () => {
    const files = unzipSync(docToDocx(parseDocument(MARKDOWN, true), { ...DEFAULT_DOCUMENT_SETTINGS, title: 'Report' }))
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['[Content_Types].xml', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/footer1.xml']),
    )
    const document = strFromU8(files['word/document.xml'])
    expect(document).toContain('<w:pStyle w:val="Title"/>')
    expect(document).toContain('<w:numPr>')
    expect(document).toContain('const x = 1')
    expect(strFromU8(files['word/_rels/document.xml.rels'])).toContain('https://example.com')
  })

  it('names spreadsheet columns like Excel', () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA'])
  })

  it('writes an XLSX with numeric cells and a frozen header', () => {
    const files = unzipSync(rowsToXlsx([['name', 'qty'], ['apple', '42'], ['pear', '007']], 'Fruit'))
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
    expect(sheet).toContain('<c r="B2"><v>42</v></c>')
    expect(sheet).toContain('<t xml:space="preserve">007</t>')
    expect(sheet).toContain('state="frozen"')
    expect(strFromU8(files['xl/workbook.xml'])).toContain('name="Fruit"')
  })
})

describe('data conversion', () => {
  it('turns CSV into JSON, YAML, XML and Markdown', () => {
    const parsed = parseDataSource('name,age\nAda,36\nAlan,41\n', 'csv')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const json = serializeData(parsed.value, 'json')
    expect(json.ok && JSON.parse(json.value)).toEqual([
      { name: 'Ada', age: '36' },
      { name: 'Alan', age: '41' },
    ])
    const yaml = serializeData(parsed.value, 'yaml')
    expect(yaml.ok && yaml.value).toContain('- name: Ada')
    const xml = serializeData(parsed.value, 'xml')
    expect(xml.ok && xml.value).toContain('<item>\n    <name>Ada</name>')
    expect(tableToMarkdown([['a|b'], ['1']])).toBe('| a\\|b |\n| --- |\n| 1 |')
  })

  it('reads JSON Lines and flattens objects into a table', () => {
    const parsed = parseDataSource('{"a":1}\n{"a":2,"b":true}\n', 'json', 'rows.jsonl')
    expect(parsed.ok && parsed.value.table).toEqual([
      ['a', 'b'],
      ['1', ''],
      ['2', 'true'],
    ])
  })

  it('writes attributes and repeated elements back to XML', () => {
    const xml = valueToXml({ catalog: { '@_id': '7', book: [{ title: 'A' }, { title: 'B' }] } })
    expect(xml).toContain('<catalog id="7">')
    expect(xml.match(/<book>/g)).toHaveLength(2)
  })

  it('reports parse errors instead of throwing', () => {
    const parsed = parseDataSource('{oops', 'json')
    expect(parsed.ok).toBe(false)
  })
})

describe('archives', () => {
  it('round-trips gzip and keeps the original file name', () => {
    const bytes = strToU8('hello '.repeat(200))
    const gz = gzipFile(bytes, 'notes.txt', 9, Date.UTC(2024, 0, 1))
    expect(isGzip(gz)).toBe(true)
    expect(gz.length).toBeLessThan(bytes.length)
    expect(gzipStoredName(gz)).toBe('notes.txt')
    const out = gunzipFile(gz, 'download.gz')
    expect(out.name).toBe('notes.txt')
    expect(strFromU8(out.bytes)).toBe('hello '.repeat(200))
  })

  it('zips files with unique names and unzips them sorted', () => {
    const zip = zipEntries([
      { name: 'b.txt', bytes: strToU8('B') },
      { name: 'a.txt', bytes: strToU8('A1') },
      { name: 'a.txt', bytes: strToU8('A2') },
    ])
    expect(isZip(zip)).toBe(true)
    const entries = unzipEntries(zip)
    expect(entries.map((entry) => entry.path)).toEqual(['a (2).txt', 'a.txt', 'b.txt'])
    expect(strFromU8(entries[0].bytes)).toBe('A2')
  })
})

describe('inspection', () => {
  it('detects formats from magic bytes rather than names', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
    const signature = detectSignature(png)
    expect(signature?.ext).toBe('png')
    expect(extensionMatches('photo.png', signature)).toBe(true)
    expect(extensionMatches('photo.jpg', signature)).toBe(false)
    expect(detectSignature(strToU8('%PDF-1.7\n'))?.ext).toBe('pdf')
    expect(detectSignature(docToDocx(parseDocument('hi', true), DEFAULT_DOCUMENT_SETTINGS))?.ext).toBe('docx')
    expect(detectSignature(strToU8('{"a": 1}'))?.ext).toBe('json')
  })

  it('computes and matches checksums', async () => {
    const bytes = strToU8('abc')
    expect(await hashBytes(bytes, 'MD5')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(await hashBytes(new Uint8Array(0), 'MD5')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    for (const length of [55, 56, 63, 64, 65, 1000]) {
      const sample = Array.from({ length }, (_, index) => (index * 37 + 11) & 0xff)
      expect(await hashBytes(Uint8Array.from(sample), 'MD5')).toBe(md5(sample))
    }
    expect(await hashBytes(bytes, 'SHA-256')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await hashBytes(bytes, 'CRC32')).toBe('352441c2')
    expect(matchHash(' BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD ', { 'SHA-256': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' })).toBe('SHA-256')
  })

  it('profiles text encoding and line endings', () => {
    const profile = textProfile(strToU8('\ufeffone\r\ntwo\r\n'))
    expect(profile).toMatchObject({ bom: 'utf-8', validUtf8: true, lineEnding: 'CRLF', lines: 2, words: 2 })
    expect(textProfile(strToU8('a\nb\r\nc'))?.lineEnding).toBe('mixed')
    expect(textProfile(new Uint8Array([0, 1, 2, 3]))).toBeNull()
    expect(convertLineEndings('a\r\nb\nc', 'CRLF')).toBe('a\r\nb\r\nc')
    expect(convertLineEndings('a\r\nb\rc', 'LF')).toBe('a\nb\nc')
  })

  it('measures entropy and renders hex rows', () => {
    expect(byteProfile(new Uint8Array(64)).entropy).toBe(0)
    expect(byteProfile(Uint8Array.from({ length: 256 }, (_, index) => index)).entropy).toBeCloseTo(8)
    const [row] = hexRows(strToU8('Hi!\n'))
    expect(row).toEqual({ offset: 0, hex: ['48', '69', '21', '0a'], ascii: 'Hi!·' })
  })

  it('round-trips Base64, including data URLs and URL-safe input', () => {
    const bytes = new Uint8Array([251, 255, 0, 10])
    const encoded = bytesToBase64(bytes)
    expect(encoded).toBe('+/8ACg==')
    expect(base64ToBytes(encoded).bytes).toEqual(bytes)
    expect(base64ToBytes('-_8ACg').bytes).toEqual(bytes)
    expect(base64ToBytes('data:image/png;base64,+/8ACg==').mime).toBe('image/png')
    expect(() => base64ToBytes('not base64!')).toThrow()
  })
})

describe('file families', () => {
  it('groups files by extension first, then MIME type', () => {
    expect(familyOf({ name: 'report.MD', type: '' })).toBe('markdown')
    expect(familyOf({ name: 'export', type: 'text/csv' })).toBe('csv')
    expect(familyOf({ name: 'logo.svg', type: 'image/svg+xml' })).toBe('image')
    expect(familyOf({ name: 'blob.bin', type: '' })).toBe('binary')
    expect(groupOf('yaml')).toBe('data')
    expect(isSameFormat('photo.jpeg', 'image', 'jpg')).toBe(true)
    expect(isSameFormat('notes.md', 'markdown', 'txt')).toBe(false)
  })
})

describe('PDF layout', () => {
  it('places images inside page margins and picks orientation automatically', () => {
    const landscape = placeImage(1600, 900, { pageSize: 'a4', orientation: 'auto', margin: 'small', fit: 'contain' })
    expect(landscape.pageWidth).toBeGreaterThan(landscape.pageHeight)
    expect(landscape.x).toBeGreaterThanOrEqual(18)
    expect(landscape.x * 2 + landscape.w).toBeCloseTo(landscape.pageWidth)
    const fitted = placeImage(400, 300, { pageSize: 'fit', orientation: 'auto', margin: 'none', fit: 'contain' })
    expect(fitted).toMatchObject({ pageWidth: 300, pageHeight: 225, x: 0, y: 0 })
  })

  it('flags characters the built-in fonts cannot draw', () => {
    expect(toWinAnsi('Café — “ok”')).toEqual({ text: 'Café — “ok”', lossy: false })
    expect(toWinAnsi('hi 👋').lossy).toBe(true)
  })

  it('wraps long text across pages and numbers them', async () => {
    const source = Array.from({ length: 80 }, (_, index) => `Paragraph ${index + 1} ${'lorem ipsum dolor sit amet '.repeat(6)}`).join('\n\n')
    const layout = await layoutTextDocument(parseDocument(source, true), { ...DEFAULT_DOCUMENT_SETTINGS, title: 'Long' })
    expect(layout.pages.length).toBeGreaterThan(2)
    const lastPage = layout.pages[layout.pages.length - 1]
    const texts = lastPage.items.flatMap((item) => (item.kind === 'text' ? [item.text] : []))
    expect(texts).toContain(`${layout.pages.length} / ${layout.pages.length}`)
    for (const page of layout.pages) {
      for (const item of page.items) {
        if (item.kind === 'text') expect(item.x + item.width).toBeLessThanOrEqual(page.width - 72 + 1)
      }
    }
  })

  it('repeats the table header on every page', async () => {
    const rows = [['id', 'name'], ...Array.from({ length: 120 }, (_, index) => [String(index), `Item ${index}`])]
    const layout = await layoutTablePdf(rows, { pageSize: 'a4', margin: 'normal', title: 'Items' })
    expect(layout.pages.length).toBeGreaterThan(1)
    for (const page of layout.pages) {
      expect(page.items.some((item) => item.kind === 'text' && item.text === 'name')).toBe(true)
    }
  })
})
