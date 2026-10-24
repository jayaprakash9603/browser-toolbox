import { PDFArray, PDFDict, PDFHeader, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFStream, PDFString } from '@cantoo/pdf-lib'

import { loadPdf, type PdfSource } from './edit'

// ---------------------------------------------------------------------------
// A small ICC v2 display profile with the sRGB primaries and tone curve
// ---------------------------------------------------------------------------

function s15Fixed16(value: number): number {
  return Math.round(value * 65536) | 0
}

/** Builds an sRGB IEC61966-2.1 compatible ICC profile, used as the PDF/A output intent. */
export function srgbIccProfile(): Uint8Array {
  const description = 'sRGB IEC61966-2.1'
  const copyright = 'No copyright, use freely'
  const xyz = (x: number, y: number, z: number) => {
    const bytes = new DataView(new ArrayBuffer(20))
    bytes.setUint32(0, 0x58595a20) // 'XYZ '
    bytes.setInt32(8, s15Fixed16(x))
    bytes.setInt32(12, s15Fixed16(y))
    bytes.setInt32(16, s15Fixed16(z))
    return new Uint8Array(bytes.buffer)
  }
  const curve = (() => {
    const entries = 256
    const bytes = new DataView(new ArrayBuffer(12 + entries * 2))
    bytes.setUint32(0, 0x63757276) // 'curv'
    bytes.setUint32(8, entries)
    for (let index = 0; index < entries; index += 1) {
      const c = index / (entries - 1)
      const linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      bytes.setUint16(12 + index * 2, Math.round(linear * 65535))
    }
    return new Uint8Array(bytes.buffer)
  })()
  const desc = (() => {
    const ascii = new TextEncoder().encode(description)
    const bytes = new Uint8Array(12 + ascii.length + 1 + 4 + 4 + 2 + 1 + 67)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, 0x64657363) // 'desc'
    view.setUint32(8, ascii.length + 1)
    bytes.set(ascii, 12)
    return bytes
  })()
  const text = (() => {
    const ascii = new TextEncoder().encode(copyright)
    const bytes = new Uint8Array(8 + ascii.length + 1)
    new DataView(bytes.buffer).setUint32(0, 0x74657874) // 'text'
    bytes.set(ascii, 8)
    return bytes
  })()

  const tags: [string, Uint8Array][] = [
    ['desc', desc],
    ['cprt', text],
    ['wtpt', xyz(0.9642, 1, 0.8249)],
    ['rXYZ', xyz(0.4361, 0.2225, 0.0139)],
    ['gXYZ', xyz(0.3851, 0.7169, 0.0971)],
    ['bXYZ', xyz(0.1431, 0.0606, 0.7141)],
    ['rTRC', curve],
    ['gTRC', curve],
    ['bTRC', curve],
  ]
  const align = (value: number) => (value + 3) & ~3
  const tableEnd = 128 + 4 + tags.length * 12
  const offsets = new Map<Uint8Array, number>()
  let cursor = align(tableEnd)
  for (const [, data] of tags) {
    if (offsets.has(data)) continue
    offsets.set(data, cursor)
    cursor = align(cursor + data.length)
  }
  const out = new Uint8Array(cursor)
  const view = new DataView(out.buffer)
  const tag = (offset: number, value: string) => {
    for (let index = 0; index < 4; index += 1) out[offset + index] = value.charCodeAt(index)
  }
  view.setUint32(0, out.length)
  view.setUint32(8, 0x02100000)
  tag(12, 'mntr')
  tag(16, 'RGB ')
  tag(20, 'XYZ ')
  const now = new Date()
  ;[now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()].forEach((value, index) =>
    view.setUint16(24 + index * 2, value),
  )
  tag(36, 'acsp')
  view.setInt32(68, s15Fixed16(0.9642))
  view.setInt32(72, s15Fixed16(1))
  view.setInt32(76, s15Fixed16(0.8249))
  view.setUint32(128, tags.length)
  tags.forEach(([signature, data], index) => {
    const entry = 132 + index * 12
    tag(entry, signature)
    view.setUint32(entry + 4, offsets.get(data) ?? 0)
    view.setUint32(entry + 8, data.length)
  })
  for (const [data, offset] of offsets) out.set(data, offset)
  return out
}

// ---------------------------------------------------------------------------
// PDF/A conversion
// ---------------------------------------------------------------------------

export type PdfAPart = 1 | 2 | 3

export interface PdfAReport {
  /** Fonts drawn from the viewer's own copy, which PDF/A does not allow. */
  unembeddedFonts: string[]
  removedJavaScript: boolean
  removedEncryption: boolean
  /** Soft masks or alpha, which PDF/A-1 does not allow. */
  transparency: boolean
}

function xmlEscape(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`)
}

function xmpPacket(part: PdfAPart, info: { title: string; author: string; producer: string; creator: string; date: string }): string {
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
<pdfaid:part>${part}</pdfaid:part>
<pdfaid:conformance>B</pdfaid:conformance>
<dc:format>application/pdf</dc:format>
${info.title ? `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(info.title)}</rdf:li></rdf:Alt></dc:title>` : ''}
${info.author ? `<dc:creator><rdf:Seq><rdf:li>${xmlEscape(info.author)}</rdf:li></rdf:Seq></dc:creator>` : ''}
<xmp:CreateDate>${info.date}</xmp:CreateDate>
<xmp:ModifyDate>${info.date}</xmp:ModifyDate>
<xmp:MetadataDate>${info.date}</xmp:MetadataDate>
<xmp:CreatorTool>${xmlEscape(info.creator)}</xmp:CreatorTool>
<pdf:Producer>${xmlEscape(info.producer)}</pdf:Producer>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
}

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const FONT_FILES = ['FontFile', 'FontFile2', 'FontFile3'].map((name) => PDFName.of(name))

/**
 * Adds what PDF/A-1b, 2b or 3b require at the document level: XMP identification,
 * an sRGB output intent, a file ID, printable annotations, and no JavaScript or
 * encryption. Fonts and transparency are reported rather than changed; pages
 * rendered to images beforehand pass both.
 */
export async function convertToPdfA(source: PdfSource, part: PdfAPart): Promise<{ bytes: Uint8Array; report: PdfAReport }> {
  const doc = await loadPdf(source)
  const { context, catalog } = doc
  const report: PdfAReport = { unembeddedFonts: [], removedJavaScript: false, removedEncryption: doc.isEncrypted, transparency: false }

  // JavaScript and automatic actions.
  const names = catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
  if (names?.has(PDFName.of('JavaScript'))) {
    names.delete(PDFName.of('JavaScript'))
    report.removedJavaScript = true
  }
  if (part !== 3) names?.delete(PDFName.of('EmbeddedFiles'))
  for (const key of ['OpenAction', 'AA']) {
    if (catalog.has(PDFName.of(key))) {
      catalog.delete(PDFName.of(key))
      report.removedJavaScript = true
    }
  }

  const seenFonts = new Set<string>()
  for (const [, object] of context.enumerateIndirectObjects()) {
    const dict = object instanceof PDFDict ? object : object instanceof PDFStream ? object.dict : null
    if (!dict) continue
    const type = dict.lookupMaybe(PDFName.of('Type'), PDFName)?.asString()
    if (type === '/Font') {
      const subtype = dict.lookupMaybe(PDFName.of('Subtype'), PDFName)?.asString()
      if (subtype === '/Type0' || subtype === '/Type3') continue
      const descriptor = dict.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict)
      const embedded = descriptor && FONT_FILES.some((name) => descriptor.has(name))
      if (!embedded) {
        const name = dict.lookupMaybe(PDFName.of('BaseFont'), PDFName)?.decodeText().replace(/^[A-Z]{6}\+/, '') ?? 'Unnamed font'
        if (!seenFonts.has(name)) {
          seenFonts.add(name)
          report.unembeddedFonts.push(name)
        }
      }
    } else if (type === '/ExtGState') {
      const ca = dict.lookupMaybe(PDFName.of('ca'), PDFNumber)?.asNumber() ?? 1
      const CA = dict.lookupMaybe(PDFName.of('CA'), PDFNumber)?.asNumber() ?? 1
      const smask = dict.get(PDFName.of('SMask'))
      if (ca < 1 || CA < 1 || (smask && !(smask instanceof PDFName && smask.asString() === '/None'))) report.transparency = true
    } else if (object instanceof PDFRawStream && dict.lookupMaybe(PDFName.of('Subtype'), PDFName)?.asString() === '/Image' && dict.has(PDFName.of('SMask'))) {
      report.transparency = true
    }
  }

  // Annotations must print and must not be hidden.
  for (const page of doc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
    if (!annots) continue
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = annots.lookupMaybe(index, PDFDict)
      if (!annot) continue
      const flags = annot.lookupMaybe(PDFName.of('F'), PDFNumber)?.asNumber() ?? 0
      annot.set(PDFName.of('F'), PDFNumber.of((flags | 4) & ~(1 | 2 | 32)))
    }
  }

  const date = new Date(Math.floor(Date.now() / 1000) * 1000)
  const title = doc.getTitle() ?? ''
  const author = doc.getAuthor() ?? ''
  const creator = doc.getCreator() || 'Browser Toolbox'
  const producer = 'Browser Toolbox PDF/A'
  doc.setCreator(creator)
  doc.setProducer(producer)
  doc.setCreationDate(date)
  doc.setModificationDate(date)
  if (title) doc.setTitle(title, { showInWindowTitleBar: true })

  const xmp = new Uint8Array(new TextEncoder().encode(xmpPacket(part, { title, author, producer, creator, date: date.toISOString().replace(/\.\d{3}Z$/, 'Z') })))
  const metadata = context.stream(xmp, { Type: 'Metadata', Subtype: 'XML', Length: xmp.length })
  catalog.set(PDFName.of('Metadata'), context.register(metadata))

  const icc = context.flateStream(srgbIccProfile(), { N: 3 })
  const intent = context.obj({
    Type: 'OutputIntent',
    S: 'GTS_PDFA1',
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    RegistryName: PDFString.of('http://www.color.org'),
    DestOutputProfile: context.register(icc),
  })
  catalog.set(PDFName.of('OutputIntents'), context.obj([context.register(intent)]))
  catalog.delete(PDFName.of('Perms'))

  const id = PDFHexString.of(randomHex(16))
  context.trailerInfo.ID = context.obj([id, id])
  context.header = part === 1 ? PDFHeader.forVersion(1, 4) : PDFHeader.forVersion(1, 7)

  const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false })
  return { bytes, report }
}