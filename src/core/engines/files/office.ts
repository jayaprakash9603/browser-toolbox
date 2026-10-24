import { strFromU8, unzipSync } from 'fflate'

import type { DocBlock, InlineRun } from './document'

/** Office Open XML packages: Word, Excel and PowerPoint files read with the browser's XML parser. */
type Package = Record<string, Uint8Array>

export function openPackage(bytes: Uint8Array): Package {
  try {
    return unzipSync(bytes)
  } catch (cause) {
    throw new Error('This file is not a valid Office document', { cause })
  }
}

function xml(pkg: Package, path: string): Document | null {
  const entry = pkg[path]
  if (!entry) return null
  const doc = new DOMParser().parseFromString(strFromU8(entry), 'application/xml')
  return doc.getElementsByTagName('parsererror').length ? null : doc
}

/** Child elements with this local name, ignoring namespace prefixes. */
function kids(node: Element | Document | null | undefined, name: string): Element[] {
  if (!node) return []
  const parent = node instanceof Document ? node.documentElement : node
  return parent ? [...parent.children].filter((child) => child.localName === name) : []
}

function kid(node: Element | Document | null | undefined, name: string): Element | undefined {
  return kids(node, name)[0]
}

/** Every descendant with this local name. */
function all(node: Element | Document | null | undefined, name: string): Element[] {
  if (!node) return []
  return [...node.getElementsByTagNameNS('*', name)]
}

function attr(node: Element | undefined, name: string): string | null {
  if (!node) return null
  for (const attribute of node.attributes) if (attribute.localName === name) return attribute.value
  return null
}

/** The `r:id` relationship attribute, which can sit beside a plain `id` on the same element. */
function relId(node: Element | undefined): string | null {
  if (!node) return null
  for (const attribute of node.attributes) if (attribute.localName === 'id' && attribute.namespaceURI?.endsWith('relationships')) return attribute.value
  return null
}

function path(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const parts = base.split('/').slice(0, -1)
  for (const part of target.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.') parts.push(part)
  }
  return parts.join('/')
}

/** Relationship id → { target path, external url }. */
function rels(pkg: Package, part: string): Map<string, { target: string; external: boolean }> {
  const slash = part.lastIndexOf('/')
  const relsPath = `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`
  const doc = xml(pkg, relsPath)
  const map = new Map<string, { target: string; external: boolean }>()
  for (const rel of all(doc, 'Relationship')) {
    const id = attr(rel, 'Id')
    const target = attr(rel, 'Target')
    if (!id || !target) continue
    const external = attr(rel, 'TargetMode') === 'External'
    map.set(id, { target: external ? target : path(part, target), external })
  }
  return map
}

function isOn(node: Element | undefined): boolean {
  if (!node) return false
  const value = attr(node, 'val')
  return value === null || !['0', 'false', 'none'].includes(value)
}

// ---------------------------------------------------------------------------
// Word
// ---------------------------------------------------------------------------

export interface WordDocument {
  title: string
  blocks: DocBlock[]
  /** Pictures and charts that were left out. */
  skippedGraphics: number
  tables: number
}

function wordRuns(paragraph: Element, links: Map<string, { target: string; external: boolean }>): InlineRun[] {
  const runs: InlineRun[] = []
  const walk = (node: Element, href?: string) => {
    for (const child of node.children) {
      if (child.localName === 'hyperlink') {
        const id = relId(child)
        walk(child, id ? links.get(id)?.target : undefined)
      } else if (child.localName === 'r') {
        const props = kid(child, 'rPr')
        const style = {
          bold: isOn(kid(props, 'b')) || undefined,
          italic: isOn(kid(props, 'i')) || undefined,
          strike: isOn(kid(props, 'strike')) || isOn(kid(props, 'dstrike')) || undefined,
          href,
        }
        let text = ''
        for (const part of child.children) {
          if (part.localName === 't') text += part.textContent ?? ''
          else if (part.localName === 'tab') text += '\t'
          else if (part.localName === 'br' || part.localName === 'cr') text += '\n'
          else if (part.localName === 'noBreakHyphen') text += '-'
        }
        if (text) runs.push({ text, ...style })
      } else if (['ins', 'smartTag', 'sdt', 'sdtContent', 'customXml', 'fldSimple'].includes(child.localName)) {
        walk(child, href)
      }
    }
  }
  walk(paragraph)
  // Merge neighbours that share a style so the output stays compact.
  return runs.reduce<InlineRun[]>((merged, run) => {
    const last = merged[merged.length - 1]
    if (last && last.bold === run.bold && last.italic === run.italic && last.strike === run.strike && last.href === run.href) last.text += run.text
    else merged.push({ ...run })
    return merged
  }, [])
}

/** Reads paragraphs, headings, lists, emphasis, links and tables from a .docx file. */
export function readDocx(bytes: Uint8Array): WordDocument {
  const pkg = openPackage(bytes)
  const doc = xml(pkg, 'word/document.xml')
  if (!doc) throw new Error('This Word file has no readable document body')
  const links = rels(pkg, 'word/document.xml')

  // Style id → heading level, from names such as "heading 2" or "Title".
  const headingLevels = new Map<string, number>()
  for (const style of all(xml(pkg, 'word/styles.xml'), 'style')) {
    const id = attr(style, 'styleId')
    const name = (attr(kid(style, 'name'), 'val') ?? '').toLowerCase()
    if (!id) continue
    const match = /^heading\s*(\d)$/.exec(name)
    if (match) headingLevels.set(id, Number(match[1]))
    else if (name === 'title') headingLevels.set(id, 1)
    else if (name === 'subtitle') headingLevels.set(id, 2)
  }

  // numId → level → ordered?
  const abstractFormats = new Map<string, Map<number, boolean>>()
  const numbering = xml(pkg, 'word/numbering.xml')
  for (const abstract of all(numbering, 'abstractNum')) {
    const levels = new Map<number, boolean>()
    for (const level of kids(abstract, 'lvl')) {
      const format = attr(kid(level, 'numFmt'), 'val') ?? 'bullet'
      levels.set(Number(attr(level, 'ilvl') ?? 0), format !== 'bullet' && format !== 'none')
    }
    const id = attr(abstract, 'abstractNumId')
    if (id) abstractFormats.set(id, levels)
  }
  const numFormats = new Map<string, Map<number, boolean>>()
  for (const num of kids(numbering, 'num')) {
    const id = attr(num, 'numId')
    const abstract = attr(kid(num, 'abstractNumId'), 'val')
    if (id && abstract) numFormats.set(id, abstractFormats.get(abstract) ?? new Map())
  }

  const blocks: DocBlock[] = []
  const counters = new Map<string, number[]>()
  let listId = 0
  let lastNum: string | null = null
  let skippedGraphics = 0
  let tables = 0
  const title = all(xml(pkg, 'docProps/core.xml'), 'title')[0]?.textContent?.trim() ?? ''

  const paragraph = (node: Element) => {
    skippedGraphics += all(node, 'drawing').length + all(node, 'pict').length
    const props = kid(node, 'pPr')
    const styleId = attr(kid(props, 'pStyle'), 'val') ?? ''
    const runs = wordRuns(node, links)
    const text = runs.map((run) => run.text).join('')
    const numPr = kid(props, 'numPr')
    const numId = attr(kid(numPr, 'numId'), 'val')
    const outline = attr(kid(props, 'outlineLvl'), 'val')
    const level = headingLevels.get(styleId) ?? (outline !== null && Number(outline) < 6 ? Number(outline) + 1 : 0)

    if (numId && numId !== '0' && text.trim()) {
      const depth = Number(attr(kid(numPr, 'ilvl'), 'val') ?? 0)
      const ordered = numFormats.get(numId)?.get(depth) ?? false
      if (numId !== lastNum) listId += 1
      lastNum = numId
      const counter = counters.get(numId) ?? []
      counter[depth] = (counter[depth] ?? 0) + 1
      counter.length = depth + 1
      counters.set(numId, counter)
      blocks.push({ type: 'list', ordered, index: counter[depth], depth: Math.min(depth, 4), listId, runs })
      return
    }
    lastNum = null
    if (!text.trim()) return
    if (level) blocks.push({ type: 'heading', level: Math.min(level, 6), runs: runs.map(({ text: value, href }) => ({ text: value, href })) })
    else if (/quote/i.test(styleId)) blocks.push({ type: 'quote', runs })
    else blocks.push({ type: 'paragraph', runs })
  }

  const table = (node: Element) => {
    tables += 1
    lastNum = null
    for (const row of kids(node, 'tr')) {
      const cells = kids(row, 'tc').map((cell) =>
        kids(cell, 'p')
          .map((p) => wordRuns(p, links).map((run) => run.text).join(''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      if (cells.some(Boolean)) blocks.push({ type: 'line', text: cells.join('   |   ') })
    }
    blocks.push({ type: 'paragraph', runs: [{ text: '' }] })
  }

  const body = kid(doc, 'body')
  const visit = (node: Element) => {
    for (const child of node.children) {
      if (child.localName === 'p') paragraph(child)
      else if (child.localName === 'tbl') table(child)
      else if (child.localName === 'sdt' || child.localName === 'sdtContent' || child.localName === 'customXml') visit(child)
    }
  }
  if (body) visit(body)
  return { title, blocks: blocks.filter((block) => !(block.type === 'paragraph' && !block.runs.some((run) => run.text))), skippedGraphics, tables }
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export interface Sheet {
  name: string
  rows: string[][]
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

function columnIndex(ref: string): number {
  let index = 0
  for (const char of ref.replace(/\d+$/, '')) index = index * 26 + (char.charCodeAt(0) - 64)
  return index - 1
}

function excelDate(serial: number, time: boolean): string {
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
  const iso = date.toISOString()
  return time && serial % 1 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10)
}

function formatNumber(raw: string): string {
  const value = Number(raw)
  if (!Number.isFinite(value)) return raw
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)))
}

/** Reads every worksheet's cell values; formulas give their cached results. */
export function readXlsx(bytes: Uint8Array): Sheet[] {
  const pkg = openPackage(bytes)
  const workbook = xml(pkg, 'xl/workbook.xml')
  if (!workbook) throw new Error('This Excel file has no readable workbook')
  const links = rels(pkg, 'xl/workbook.xml')

  const shared = all(xml(pkg, 'xl/sharedStrings.xml'), 'si').map((si) =>
    all(si, 't')
      .filter((t) => t.parentElement?.localName !== 'rPh')
      .map((t) => t.textContent ?? '')
      .join(''),
  )

  const styles = xml(pkg, 'xl/styles.xml')
  const customDates = new Set<number>()
  for (const format of all(styles, 'numFmt')) {
    const code = (attr(format, 'formatCode') ?? '').replace(/"[^"]*"|\[[^\]]*]/g, '')
    if (/[dy]/i.test(code) || /h.*m/i.test(code)) customDates.add(Number(attr(format, 'numFmtId')))
  }
  const dateStyles = kids(kid(styles, 'cellXfs'), 'xf').map((xf) => {
    const id = Number(attr(xf, 'numFmtId') ?? 0)
    return BUILTIN_DATE_FORMATS.has(id) || customDates.has(id)
  })

  const sheets: Sheet[] = []
  for (const sheet of all(workbook, 'sheet')) {
    if (attr(sheet, 'state') === 'hidden' || attr(sheet, 'state') === 'veryHidden') continue
    const id = relId(sheet)
    const target = id ? links.get(id)?.target : undefined
    const doc = target ? xml(pkg, target) : null
    if (!doc) continue
    const rows: string[][] = []
    for (const row of all(doc, 'row')) {
      const rowIndex = Number(attr(row, 'r') ?? rows.length + 1) - 1
      const values: string[] = []
      let next = 0
      for (const cell of kids(row, 'c')) {
        const ref = attr(cell, 'r')
        const column = ref ? columnIndex(ref) : next
        next = column + 1
        const type = attr(cell, 't')
        const raw = kid(cell, 'v')?.textContent ?? ''
        let value = raw
        if (type === 's') value = shared[Number(raw)] ?? ''
        else if (type === 'inlineStr') value = all(cell, 't').map((t) => t.textContent ?? '').join('')
        else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE'
        else if (type !== 'str' && type !== 'e' && raw) {
          const style = Number(attr(cell, 's') ?? 0)
          value = dateStyles[style] && Number(raw) > 0 ? excelDate(Number(raw), true) : formatNumber(raw)
        }
        values[column] = value
      }
      rows[rowIndex] = Array.from(values, (value) => value ?? '')
    }
    const dense = Array.from(rows, (row) => row ?? [])
    while (dense.length && !dense[dense.length - 1].some(Boolean)) dense.pop()
    sheets.push({ name: attr(sheet, 'name') ?? `Sheet ${sheets.length + 1}`, rows: dense })
  }
  return sheets
}

// ---------------------------------------------------------------------------
// PowerPoint
// ---------------------------------------------------------------------------

export interface SlideParagraph {
  text: string
  size: number
  bold: boolean
  italic: boolean
  color: string
  align: 'left' | 'center' | 'right'
  bullet: boolean
  level: number
}

/** Positions and sizes are in points from the slide's top-left corner. */
export type SlideShape =
  | { kind: 'text'; x: number; y: number; w: number; h: number; fill?: string; line?: string; anchor: 'top' | 'middle' | 'bottom'; paragraphs: SlideParagraph[] }
  | { kind: 'image'; x: number; y: number; w: number; h: number; bytes: Uint8Array; format: 'png' | 'jpg' }
  | { kind: 'box'; x: number; y: number; w: number; h: number; fill?: string; line?: string; ellipse: boolean }

export interface Slide {
  background?: string
  shapes: SlideShape[]
  notes: string
}

export interface Presentation {
  width: number
  height: number
  slides: Slide[]
  skipped: number
}

const EMU_PER_POINT = 12700

function srgb(node: Element | undefined): string | undefined {
  const fill = kid(node, 'solidFill')
  if (!fill) return undefined
  const color = kid(fill, 'srgbClr')
  if (color) return `#${attr(color, 'val') ?? '000000'}`
  const scheme = attr(kid(fill, 'schemeClr'), 'val')
  if (scheme === 'bg1' || scheme === 'lt1') return '#ffffff'
  if (scheme === 'tx1' || scheme === 'dk1') return '#000000'
  if (scheme?.startsWith('accent')) return ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'][Number(scheme.slice(6)) - 1] ?? '#4472c4'
  return undefined
}

interface Frame {
  x: number
  y: number
  w: number
  h: number
}

function xfrm(node: Element | undefined): Frame | null {
  const off = kid(node, 'off')
  const ext = kid(node, 'ext')
  if (!off || !ext) return null
  return {
    x: Number(attr(off, 'x') ?? 0) / EMU_PER_POINT,
    y: Number(attr(off, 'y') ?? 0) / EMU_PER_POINT,
    w: Number(attr(ext, 'cx') ?? 0) / EMU_PER_POINT,
    h: Number(attr(ext, 'cy') ?? 0) / EMU_PER_POINT,
  }
}

interface Placeholder {
  type: string
  idx: string | null
}

function placeholderOf(shape: Element): Placeholder | null {
  const ph = all(shape, 'ph')[0]
  if (!ph) return null
  return { type: attr(ph, 'type') ?? 'body', idx: attr(ph, 'idx') }
}

function findPlaceholder(doc: Document | null, wanted: Placeholder): Element | undefined {
  const shapes = all(doc, 'sp')
  const sameType = (type: string) => type === wanted.type || (['title', 'ctrTitle'].includes(type) && ['title', 'ctrTitle'].includes(wanted.type))
  return (
    (wanted.idx !== null ? shapes.find((shape) => placeholderOf(shape)?.idx === wanted.idx) : undefined) ??
    shapes.find((shape) => {
      const ph = placeholderOf(shape)
      return ph && sameType(ph.type)
    })
  )
}

/** Reads slide text boxes, shapes and pictures, following placeholder positions into layouts and masters. */
export function readPptx(bytes: Uint8Array): Presentation {
  const pkg = openPackage(bytes)
  const presentation = xml(pkg, 'ppt/presentation.xml')
  if (!presentation) throw new Error('This PowerPoint file has no readable presentation')
  const size = kid(presentation, 'sldSz')
  const width = Number(attr(size, 'cx') ?? 9144000) / EMU_PER_POINT
  const height = Number(attr(size, 'cy') ?? 6858000) / EMU_PER_POINT
  const links = rels(pkg, 'ppt/presentation.xml')
  let skipped = 0

  const slides: Slide[] = []
  for (const id of all(presentation, 'sldId')) {
    const rid = relId(id)
    const part = rid ? links.get(rid)?.target : undefined
    const slideDoc = part ? xml(pkg, part) : null
    if (!part || !slideDoc) continue
    if (attr(slideDoc.documentElement, 'show') === '0') continue
    const slideRels = rels(pkg, part)
    const layoutPart = [...slideRels.values()].find((rel) => rel.target.includes('slideLayout'))?.target
    const layoutDoc = layoutPart ? xml(pkg, layoutPart) : null
    const masterPart = layoutPart ? [...rels(pkg, layoutPart).values()].find((rel) => rel.target.includes('slideMaster'))?.target : undefined
    const masterDoc = masterPart ? xml(pkg, masterPart) : null

    const background = (doc: Document | null) => srgb(kid(all(doc, 'bg')[0], 'bgPr'))
    const shapes: SlideShape[] = []

    const visit = (container: Element, offset: { dx: number; dy: number; sx: number; sy: number }) => {
      const place = (frame: Frame): Frame => ({ x: frame.x * offset.sx + offset.dx, y: frame.y * offset.sy + offset.dy, w: frame.w * offset.sx, h: frame.h * offset.sy })
      for (const node of container.children) {
        if (node.localName === 'grpSp') {
          const props = kid(kid(node, 'grpSpPr'), 'xfrm')
          const frame = xfrm(props)
          const chOff = kid(props, 'chOff')
          const chExt = kid(props, 'chExt')
          if (frame && chOff && chExt) {
            const cw = Number(attr(chExt, 'cx') ?? 1) / EMU_PER_POINT || 1
            const ch = Number(attr(chExt, 'cy') ?? 1) / EMU_PER_POINT || 1
            const placed = place(frame)
            const sx = placed.w / cw
            const sy = placed.h / ch
            visit(node, { sx, sy, dx: placed.x - (Number(attr(chOff, 'x') ?? 0) / EMU_PER_POINT) * sx, dy: placed.y - (Number(attr(chOff, 'y') ?? 0) / EMU_PER_POINT) * sy })
          } else visit(node, offset)
        } else if (node.localName === 'pic') {
          const frame = xfrm(kid(kid(node, 'spPr'), 'xfrm'))
          const embed = attr(all(node, 'blip')[0], 'embed')
          const target = embed ? slideRels.get(embed)?.target : undefined
          const data = target ? pkg[target] : undefined
          const ext = target?.split('.').pop()?.toLowerCase()
          if (frame && data && (ext === 'png' || ext === 'jpg' || ext === 'jpeg')) shapes.push({ kind: 'image', ...place(frame), bytes: data, format: ext === 'png' ? 'png' : 'jpg' })
          else skipped += 1
        } else if (node.localName === 'graphicFrame') {
          const frame = xfrm(kid(node, 'xfrm'))
          const rows = all(node, 'tr')
          if (frame && rows.length) {
            const paragraphs: SlideParagraph[] = rows.map((row) => ({
              text: kids(row, 'tc')
                .map((cell) => all(cell, 't').map((t) => t.textContent ?? '').join(''))
                .join('   |   '),
              size: 12,
              bold: false,
              italic: false,
              color: '#000000',
              align: 'left',
              bullet: false,
              level: 0,
            }))
            shapes.push({ kind: 'text', ...place(frame), anchor: 'top', paragraphs, line: '#bfbfbf' })
          } else skipped += 1
        } else if (node.localName === 'sp' || node.localName === 'cxnSp') {
          const spPr = kid(node, 'spPr')
          const ph = placeholderOf(node)
          let frame = xfrm(kid(spPr, 'xfrm'))
          const inherited = ph ? (findPlaceholder(layoutDoc, ph) ?? findPlaceholder(masterDoc, ph)) : undefined
          if (!frame && inherited) frame = xfrm(kid(kid(inherited, 'spPr'), 'xfrm'))
          if (!frame && ph && layoutDoc) {
            const master = findPlaceholder(masterDoc, ph)
            frame = master ? xfrm(kid(kid(master, 'spPr'), 'xfrm')) : null
          }
          if (!frame) continue
          const fill = srgb(spPr)
          const line = srgb(kid(spPr, 'ln'))
          const geometry = attr(kid(spPr, 'prstGeom'), 'prst')
          const body = kid(node, 'txBody')
          const isTitle = ph?.type === 'title' || ph?.type === 'ctrTitle'
          const isBody = ph && !isTitle && ['body', 'obj', 'subTitle'].includes(ph.type)
          const paragraphs: SlideParagraph[] = []
          for (const p of kids(body, 'p')) {
            const pPr = kid(p, 'pPr')
            const level = Number(attr(pPr, 'lvl') ?? 0)
            const runs = [...p.children].filter((child) => child.localName === 'r' || child.localName === 'fld' || child.localName === 'br')
            const text = runs.map((run) => (run.localName === 'br' ? '\n' : (kid(run, 't')?.textContent ?? ''))).join('')
            const first = kid(runs.find((run) => run.localName === 'r'), 'rPr') ?? kid(p, 'endParaRPr')
            const sz = attr(first, 'sz')
            const algn = attr(pPr, 'algn')
            paragraphs.push({
              text,
              size: sz ? Number(sz) / 100 : isTitle ? (ph?.type === 'ctrTitle' ? 40 : 32) : isBody ? Math.max(14, 24 - level * 2) : 16,
              bold: attr(first, 'b') === '1' || (isTitle && attr(first, 'b') !== '0'),
              italic: attr(first, 'i') === '1',
              color: srgb(first) ?? '#000000',
              align: algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : ph?.type === 'ctrTitle' || ph?.type === 'subTitle' ? 'center' : 'left',
              bullet: Boolean(isBody && ph?.type !== 'subTitle' && !kid(pPr, 'buNone') && text.trim()) || Boolean(kid(pPr, 'buChar') || kid(pPr, 'buAutoNum')),
              level,
            })
          }
          const anchorValue = attr(kid(body, 'bodyPr'), 'anchor')
          const anchor = anchorValue === 'ctr' ? 'middle' : anchorValue === 'b' ? 'bottom' : isTitle ? 'middle' : 'top'
          const placed = place(frame)
          if (paragraphs.some((paragraph) => paragraph.text.trim())) shapes.push({ kind: 'text', ...placed, fill, line, anchor, paragraphs })
          else if (fill || line) shapes.push({ kind: 'box', ...placed, fill, line, ellipse: geometry === 'ellipse' })
        }
      }
    }
    const tree = all(slideDoc, 'spTree')[0]
    if (tree) visit(tree, { dx: 0, dy: 0, sx: 1, sy: 1 })

    const notesPart = [...slideRels.values()].find((rel) => rel.target.includes('notesSlide'))?.target
    const notesDoc = notesPart ? xml(pkg, notesPart) : null
    const notes = notesDoc
      ? all(notesDoc, 'sp')
          .filter((shape) => placeholderOf(shape)?.type === 'body')
          .map((shape) => all(shape, 't').map((t) => t.textContent ?? '').join(' '))
          .join('\n')
          .trim()
      : ''

    slides.push({ background: background(slideDoc) ?? background(layoutDoc) ?? background(masterDoc), shapes, notes })
  }
  return { width, height, slides, skipped }
}
