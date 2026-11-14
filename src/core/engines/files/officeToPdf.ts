import { renderPresentation } from '@/core/engines/pdf/slidesPdf'

import { DEFAULT_DOCUMENT_SETTINGS, type DocumentSettings, type MarginPreset, type PageSize } from './document'
import { readDocx, readPptx, readXlsx } from './office'
import { renderPdf, type PdfLayout } from './pdfLayout'
import { layoutTablePdf } from './pdfTable'
import { layoutTextDocument } from './pdfText'

export type OfficeKind = 'word' | 'powerpoint' | 'excel'

const OFFICE_MIMES: Record<OfficeKind, string> = {
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  powerpoint: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const OFFICE_EXTENSIONS: Record<OfficeKind, string> = {
  word: '.docx',
  powerpoint: '.pptx',
  excel: '.xlsx',
}

export const OFFICE_FILE_ACCEPT = [
  ...Object.values(OFFICE_MIMES),
  ...Object.values(OFFICE_EXTENSIONS),
].join(',')

export function detectOfficeKind(name: string, mimeType = ''): OfficeKind | null {
  const lower = name.toLowerCase()
  const mime = mimeType.toLowerCase()
  for (const kind of Object.keys(OFFICE_MIMES) as OfficeKind[]) {
    if (lower.endsWith(OFFICE_EXTENSIONS[kind])) return kind
    if (mime === OFFICE_MIMES[kind]) return kind
  }
  return null
}

export interface OfficeToPdfOptions {
  wordSettings?: DocumentSettings
  excel?: { pageSize?: PageSize; margin?: MarginPreset; allSheets?: boolean }
  powerpoint?: { notes?: boolean }
}

const layoutBytes = async (layout: PdfLayout) => new Uint8Array(await (await renderPdf(layout)).arrayBuffer())

function fileStem(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(0, index) : name
}

/** Renders Word, PowerPoint or Excel bytes to a PDF the merge and convert tools can use. */
export async function officeBytesToPdf(
  name: string,
  bytes: Uint8Array,
  kind: OfficeKind,
  options: OfficeToPdfOptions = {},
): Promise<Uint8Array> {
  const stem = fileStem(name)
  if (kind === 'word') {
    const settings = options.wordSettings ?? { ...DEFAULT_DOCUMENT_SETTINGS, markdown: true }
    const docx = readDocx(bytes)
    const layout = await layoutTextDocument(docx.blocks, settings)
    return layoutBytes(layout)
  }
  if (kind === 'excel') {
    const { pageSize = 'a4', margin = 'narrow', allSheets = true } = options.excel ?? {}
    const sheets = readXlsx(bytes).filter((sheet) => sheet.rows.length)
    if (!sheets.length) throw new Error('empty workbook')
    const chosen = allSheets ? sheets : sheets.slice(0, 1)
    const layouts = await Promise.all(
      chosen.map((sheet) => layoutTablePdf(sheet.rows, { pageSize, margin, title: chosen.length > 1 ? sheet.name : stem })),
    )
    const merged: PdfLayout = {
      title: stem,
      lossyGlyphs: layouts.some((layout) => layout.lossyGlyphs),
      pages: layouts.flatMap((layout) => layout.pages),
    }
    return layoutBytes(merged)
  }
  const { notes = false } = options.powerpoint ?? {}
  const presentation = readPptx(bytes)
  const { bytes: pdf } = await renderPresentation(presentation, { notes })
  return pdf
}

export async function officeFileToPdf(file: File, options?: OfficeToPdfOptions): Promise<Uint8Array> {
  const kind = detectOfficeKind(file.name, file.type)
  if (!kind) throw new Error('unsupported office file')
  return officeBytesToPdf(file.name, new Uint8Array(await file.arrayBuffer()), kind, options)
}