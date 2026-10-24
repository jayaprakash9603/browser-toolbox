import { strToU8, zipSync } from 'fflate'

import { pageGeometry, type DocBlock, type DocumentSettings, type InlineRun } from './document'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const FONT_NAMES = { sans: 'Arial', serif: 'Times New Roman', mono: 'Courier New' } as const
const HEADING_SCALE = [1.75, 1.45, 1.25, 1.1, 1, 0.95]
const TWIPS_PER_PT = 20

export function xmlEscape(text: string): string {
  return text
    .replace(/[^\t\n\r\u0020-\ud7ff\ud800-\udfff\ue000-\ufffd]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textRuns(text: string, rPr: string): string {
  const props = rPr ? `<w:rPr>${rPr}</w:rPr>` : ''
  return text
    .split('\n')
    .map((line, index) => {
      const parts = line
        .split('\t')
        .map((part) => (part ? `<w:t xml:space="preserve">${xmlEscape(part)}</w:t>` : ''))
        .join('<w:tab/>')
      return `${index > 0 ? `<w:r>${props}<w:br/></w:r>` : ''}${parts ? `<w:r>${props}${parts}</w:r>` : ''}`
    })
    .join('')
}

class DocxWriter {
  private readonly links: string[] = []
  private readonly orderedLists = new Map<number, { numId: number; start: number }>()

  runs(runs: InlineRun[], extra = ''): string {
    return runs
      .map((run) => {
        const rPr = [
          run.href ? '<w:rStyle w:val="Hyperlink"/>' : run.code ? '<w:rStyle w:val="InlineCode"/>' : '',
          run.bold ? '<w:b/>' : '',
          run.italic ? '<w:i/>' : '',
          run.strike ? '<w:strike/>' : '',
          extra,
        ].join('')
        const body = textRuns(run.text, rPr)
        if (!run.href) return body
        this.links.push(run.href)
        return `<w:hyperlink r:id="rIdLink${this.links.length}" w:history="1">${body}</w:hyperlink>`
      })
      .join('')
  }

  numIdFor(block: Extract<DocBlock, { type: 'list' }>): number {
    if (!block.ordered) return 1
    let entry = this.orderedLists.get(block.listId * 10 + block.depth)
    if (!entry) {
      entry = { numId: this.orderedLists.size + 2, start: block.index }
      this.orderedLists.set(block.listId * 10 + block.depth, entry)
    }
    return entry.numId
  }

  body(blocks: DocBlock[], settings: DocumentSettings): string {
    const out: string[] = []
    const p = (pPr: string, content: string) => out.push(`<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content}</w:p>`)
    if (settings.title.trim()) p('<w:pStyle w:val="Title"/>', textRuns(settings.title.trim(), ''))
    const lineCount = blocks.filter((block) => block.type === 'line').length
    const numberWidth = String(lineCount).length
    let lineNumber = 0
    for (const block of blocks) {
      switch (block.type) {
        case 'line': {
          lineNumber += 1
          const number = settings.lineNumbers
            ? textRuns(`${String(lineNumber).padStart(numberWidth, ' ')}  `, '<w:color w:val="94A3B8"/>')
            : ''
          p('<w:pStyle w:val="PlainLine"/>', number + textRuns(block.text, ''))
          break
        }
        case 'heading':
          p(`<w:pStyle w:val="Heading${Math.min(6, block.level)}"/>`, this.runs(block.runs))
          break
        case 'paragraph':
          p('', this.runs(block.runs))
          break
        case 'quote':
          p('<w:pStyle w:val="Quote"/>', this.runs(block.runs))
          break
        case 'code':
          p('<w:pStyle w:val="Code"/>', textRuns(block.text, ''))
          break
        case 'rule':
          p('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>', '')
          break
        case 'list':
          if (block.checked !== undefined) {
            p(
              `<w:pStyle w:val="ListParagraph"/><w:ind w:left="${360 * (block.depth + 1)}"/>`,
              textRuns(block.checked ? '\u2612 ' : '\u2610 ', '') + this.runs(block.runs),
            )
          } else {
            p(
              `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${block.depth}"/><w:numId w:val="${this.numIdFor(block)}"/></w:numPr>`,
              this.runs(block.runs),
            )
          }
          break
      }
    }
    if (out.length === 0) out.push('<w:p/>')
    return out.join('')
  }

  documentRels(pageNumbers: boolean): string {
    const rels = [
      `<Relationship Id="rIdStyles" Type="${R_NS}/styles" Target="styles.xml"/>`,
      `<Relationship Id="rIdNumbering" Type="${R_NS}/numbering" Target="numbering.xml"/>`,
      pageNumbers ? `<Relationship Id="rIdFooter" Type="${R_NS}/footer" Target="footer1.xml"/>` : '',
      ...this.links.map(
        (href, index) =>
          `<Relationship Id="rIdLink${index + 1}" Type="${R_NS}/hyperlink" Target="${xmlEscape(href)}" TargetMode="External"/>`,
      ),
    ]
    return `${XML_HEAD}<Relationships xmlns="${REL_NS}">${rels.join('')}</Relationships>`
  }

  numbering(): string {
    const bulletGlyphs = ['\u2022', '\u25e6', '\u25aa']
    const numberFormats = [
      ['decimal', '%1.'],
      ['lowerLetter', '%2.'],
      ['lowerRoman', '%3.'],
    ]
    const level = (index: number, format: string, text: string, font = '') =>
      `<w:lvl w:ilvl="${index}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (index + 1)}" w:hanging="360"/></w:pPr>${font}</w:lvl>`
    const bullets = bulletGlyphs
      .map((glyph, index) => level(index, 'bullet', glyph, '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>'))
      .join('')
    const numbers = numberFormats.map(([format, text], index) => level(index, format, text)).join('')
    const nums = [...this.orderedLists.entries()]
      .map(
        ([key, { numId, start }]) =>
          `<w:num w:numId="${numId}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="${key % 10}"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`,
      )
      .join('')
    return `${XML_HEAD}<w:numbering xmlns:w="${W_NS}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${bullets}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${numbers}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nums}</w:numbering>`
  }
}

function stylesXml(settings: DocumentSettings): string {
  const font = FONT_NAMES[settings.font]
  const size = Math.round(settings.fontSize * 2)
  const line = Math.round(240 * settings.lineHeight)
  const heading = (level: number) =>
    `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${level <= 2 ? 280 : 200}" w:after="80"/><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="${Math.round(size * (HEADING_SCALE[level - 1] ?? 1))}"/></w:rPr></w:style>`
  return `${XML_HEAD}<w:styles xmlns:w="${W_NS}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/><w:color w:val="0F172A"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="${line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="4F46E5"/></w:pBdr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="${Math.round(size * 1.9)}"/></w:rPr></w:style>
${[1, 2, 3, 4, 5, 6].map(heading).join('\n')}
<w:style w:type="paragraph" w:styleId="PlainLine"><w:name w:val="Plain Line"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="A5B4FC"/></w:pBdr><w:ind w:left="360"/></w:pPr><w:rPr><w:i/><w:color w:val="475569"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:spacing w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="${Math.max(16, size - 2)}"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="4338CA"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="InlineCode"><w:name w:val="Inline Code"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:rPr></w:style>
</w:styles>`
}

function footerXml(): string {
  return `${XML_HEAD}<w:ftr xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`
}

/** Builds a real Word document (Office Open XML) from parsed blocks. */
export function docToDocx(blocks: DocBlock[], settings: DocumentSettings, now = new Date()): Uint8Array {
  const writer = new DocxWriter()
  const body = writer.body(blocks, settings)
  const { width, height, margin } = pageGeometry(settings)
  const marginTwips = Math.round(margin * TWIPS_PER_PT)
  const sectPr = `<w:sectPr>${settings.pageNumbers ? '<w:footerReference w:type="default" r:id="rIdFooter"/>' : ''}<w:pgSz w:w="${Math.round(width * TWIPS_PER_PT)}" w:h="${Math.round(height * TWIPS_PER_PT)}"${settings.orientation === 'landscape' ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`
  const document = `${XML_HEAD}<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}${sectPr}</w:body></w:document>`
  const created = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const title = xmlEscape(settings.title.trim() || 'Document')

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>${settings.pageNumbers ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    ),
    '_rels/.rels': strToU8(
      `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${R_NS}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    ),
    'docProps/core.xml': strToU8(
      `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title}</dc:title><dc:creator>One Panel</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`,
    ),
    'word/document.xml': strToU8(document),
    'word/styles.xml': strToU8(stylesXml(settings)),
    'word/numbering.xml': strToU8(writer.numbering()),
    'word/_rels/document.xml.rels': strToU8(writer.documentRels(settings.pageNumbers)),
  }
  if (settings.pageNumbers) files['word/footer1.xml'] = strToU8(footerXml())
  return zipSync(files, { level: 6 })
}
