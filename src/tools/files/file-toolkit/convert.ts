import { gunzipFile, gzipFile, type CompressionLevel } from '@/core/engines/files/archive'
import { parseDataSource, serializeData, type DataFormat } from '@/core/engines/files/data'
import {
  docToHtmlDocument,
  docToPlainText,
  docToRtf,
  parseDocument,
  type DocumentSettings,
} from '@/core/engines/files/document'
import { docToDocx } from '@/core/engines/files/docx'
import { bytesToBase64 } from '@/core/engines/files/inspect'
import { stemOf, TARGET_META, type FileFamily, type TargetFormat } from '@/core/engines/files/kinds'
import { renderPdf } from '@/core/engines/files/pdfLayout'
import { DEFAULT_IMAGE_PDF_OPTIONS, layoutImagesPdf, type PdfImageSource } from '@/core/engines/files/pdfImages'
import { layoutTablePdf } from '@/core/engines/files/pdfTable'
import { layoutTextDocument } from '@/core/engines/files/pdfText'
import { rowsToXlsx } from '@/core/engines/files/xlsx'
import { artifactFromBytes, bytesBlob, createArtifact, type FileArtifact } from '@/shared/components/files'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'

export interface ConvertOptions {
  document: DocumentSettings
  /** 0–1, used by JPG and WebP. */
  imageQuality: number
  /** Longest edge in pixels; 0 keeps the original size. */
  imageMaxEdge: number
  gzipLevel: CompressionLevel
}

export async function readText(file: Blob): Promise<string> {
  const text = await file.text()
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } catch {
    throw new Error('This image could not be decoded by the browser.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

const FALLBACK_EDGE = 1024

export function imageDimensions(image: HTMLImageElement): { width: number; height: number } {
  return { width: image.naturalWidth || FALLBACK_EDGE, height: image.naturalHeight || FALLBACK_EDGE }
}

interface DrawOptions {
  maxEdge?: number
  /** Quarter turns clockwise. */
  rotation?: number
  background?: string
}

export function drawImage(image: HTMLImageElement, { maxEdge = 0, rotation = 0, background }: DrawOptions = {}): HTMLCanvasElement {
  const { width, height } = imageDimensions(image)
  const scale = maxEdge > 0 && Math.max(width, height) > maxEdge ? maxEdge / Math.max(width, height) : 1
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const turns = ((rotation % 4) + 4) % 4
  const canvas = document.createElement('canvas')
  canvas.width = turns % 2 ? h : w
  canvas.height = turns % 2 ? w : h
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser.')
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((turns * Math.PI) / 2)
  context.drawImage(image, -w / 2, -h / 2, w, h)
  return canvas
}

export function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('The browser could not encode this image.'))
        else if (blob.type !== mime) reject(new Error(`This browser cannot save ${mime.replace('image/', '').toUpperCase()} images.`))
        else resolve(blob)
      },
      mime,
      quality,
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image.'))
    reader.readAsDataURL(blob)
  })
}

export interface PdfImageOptions {
  rotation?: number
  /** Re-encode as JPEG to shrink large photos. */
  compress?: boolean
}

/** PNG and JPEG embed as-is; everything else is redrawn so jsPDF can read it. */
export async function imageToPdfSource(file: Blob, { rotation = 0, compress = false }: PdfImageOptions = {}): Promise<PdfImageSource> {
  const image = await loadImage(file)
  const { width, height } = imageDimensions(image)
  const native = file.type === 'image/jpeg' ? 'JPEG' : file.type === 'image/png' ? 'PNG' : null
  if (native && !rotation && !compress) {
    return { src: await blobToDataUrl(file), width, height, format: native }
  }
  if (compress) {
    const canvas = drawImage(image, { rotation, maxEdge: 2400, background: '#ffffff' })
    return { src: canvas.toDataURL('image/jpeg', 0.82), width: canvas.width, height: canvas.height, format: 'JPEG' }
  }
  const canvas = drawImage(image, { rotation })
  return { src: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height, format: 'PNG' }
}

const DATA_LANGUAGE: Partial<Record<TargetFormat, EditorLanguage>> = {
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  htmltable: 'html',
}

function outputName(file: File, target: TargetFormat): string {
  const stem = stemOf(file.name)
  if (target === 'htmltable') return `${stem}.table.html`
  if (target === 'gz') return `${file.name}.gz`
  if (target === 'base64') return `${file.name}.base64.txt`
  return `${stem}.${TARGET_META[target].ext}`
}

function textBlob(text: string, target: TargetFormat): Blob {
  return new Blob([text], { type: TARGET_META[target].mime })
}

async function convertDocument(file: File, family: FileFamily, target: TargetFormat, options: ConvertOptions) {
  const source = await readText(file)
  const settings: DocumentSettings = { ...options.document, markdown: family === 'markdown', title: '' }
  const blocks = parseDocument(source, settings.markdown)
  const name = outputName(file, target)
  const base = { name, format: TARGET_META[target].label, source: { name: file.name, size: file.size } }
  switch (target) {
    case 'pdf': {
      const layout = await layoutTextDocument(blocks, settings)
      return createArtifact({ ...base, blob: await renderPdf(layout), preview: { kind: 'pdf', layout } })
    }
    case 'docx':
      return createArtifact({
        ...base,
        blob: bytesBlob(docToDocx(blocks, settings), TARGET_META.docx.mime),
        preview: { kind: 'document', blocks, settings },
        note: 'Word paginates the document itself; the preview shows the flowing text.',
      })
    case 'rtf':
      return createArtifact({
        ...base,
        blob: textBlob(docToRtf(blocks, settings), 'rtf'),
        preview: { kind: 'document', blocks, settings },
        note: 'RTF opens in Word, WordPad, Pages and LibreOffice.',
      })
    case 'html': {
      const html = docToHtmlDocument(blocks, settings)
      return createArtifact({ ...base, blob: textBlob(html, 'html'), preview: { kind: 'html', html } })
    }
    default: {
      const text = settings.markdown ? docToPlainText(blocks) : source
      return createArtifact({ ...base, blob: textBlob(text, 'txt'), preview: { kind: 'text', text, language: 'text' } })
    }
  }
}

async function convertData(file: File, family: FileFamily, target: TargetFormat, options: ConvertOptions) {
  const parsed = parseDataSource(await readText(file), family as DataFormat, file.name)
  if (!parsed.ok) throw new Error(parsed.error)
  const { table } = parsed.value
  const stem = stemOf(file.name)
  const name = outputName(file, target)
  const base = { name, format: TARGET_META[target].label, source: { name: file.name, size: file.size } }
  if (target === 'xlsx') {
    return createArtifact({
      ...base,
      blob: bytesBlob(rowsToXlsx(table, stem), TARGET_META.xlsx.mime),
      preview: { kind: 'table', rows: table },
    })
  }
  if (target === 'pdf') {
    const layout = await layoutTablePdf(table, {
      pageSize: options.document.pageSize,
      margin: options.document.margin,
      title: stem,
    })
    return createArtifact({ ...base, blob: await renderPdf(layout), preview: { kind: 'pdf', layout } })
  }
  const output = serializeData(parsed.value, target as Parameters<typeof serializeData>[1], stem)
  if (!output.ok) throw new Error(output.error)
  const text = output.value
  if (target === 'htmltable') {
    return createArtifact({ ...base, blob: textBlob(text, target), preview: { kind: 'html', html: text } })
  }
  const rows = target === 'csv' || target === 'tsv' ? table : undefined
  return createArtifact({
    ...base,
    blob: textBlob(text, target),
    preview: { kind: 'text', text, language: DATA_LANGUAGE[target] ?? 'text', rows },
  })
}

async function convertImage(file: File, target: TargetFormat, options: ConvertOptions) {
  const name = outputName(file, target)
  const base = { name, format: TARGET_META[target].label, source: { name: file.name, size: file.size } }
  if (target === 'pdf') {
    const source = await imageToPdfSource(file)
    const layout = layoutImagesPdf([source], DEFAULT_IMAGE_PDF_OPTIONS, stemOf(file.name))
    return createArtifact({ ...base, blob: await renderPdf(layout), preview: { kind: 'pdf', layout } })
  }
  const image = await loadImage(file)
  const mime = TARGET_META[target].mime
  const canvas = drawImage(image, {
    maxEdge: options.imageMaxEdge,
    background: target === 'jpg' ? '#ffffff' : undefined,
  })
  const blob = await canvasBlob(canvas, mime, target === 'png' ? undefined : options.imageQuality)
  return createArtifact({ ...base, blob, preview: { kind: 'image', width: canvas.width, height: canvas.height } })
}

export async function convertFile(
  file: File,
  family: FileFamily,
  target: TargetFormat,
  options: ConvertOptions,
): Promise<FileArtifact> {
  const source = { name: file.name, size: file.size }
  if (target === 'gz') {
    const bytes = gzipFile(await readBytes(file), file.name, options.gzipLevel, file.lastModified)
    return createArtifact({
      name: outputName(file, target),
      format: 'GZIP',
      blob: bytesBlob(bytes, TARGET_META.gz.mime),
      source,
      preview: { kind: 'archive', entries: [{ path: file.name, size: file.size }] },
    })
  }
  if (target === 'gunzip') {
    const { bytes, name } = gunzipFile(await readBytes(file), file.name)
    return artifactFromBytes(name, bytes, { source })
  }
  if (target === 'base64') {
    const text = bytesToBase64(await readBytes(file))
    return createArtifact({
      name: outputName(file, target),
      format: 'Base64',
      blob: textBlob(text, 'base64'),
      source,
      preview: { kind: 'text', text, language: 'text' },
    })
  }
  if (family === 'text' || family === 'markdown') return convertDocument(file, family, target, options)
  if (family === 'image') return convertImage(file, target, options)
  return convertData(file, family, target, options)
}
