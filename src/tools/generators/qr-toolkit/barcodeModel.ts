import type { BarcodeFormat, BarcodeStyle } from '@/core/engines/barcode'

export const BARCODE_FORMATS: BarcodeFormat[] = ['EAN13', 'UPC', 'CODE128', 'CODE39']

const STORAGE_KEY = 'tbx.barcode.style'

export const DEFAULT_BARCODE_STYLE: BarcodeStyle = {
  lineColor: '#0f172a',
  background: '#ffffff',
  height: 72,
  margin: 12,
  moduleWidth: 2,
  displayValue: true,
  fontSize: 13,
}

export const BARCODE_SAMPLES: Record<BarcodeFormat, string> = {
  EAN13: '5901234123457',
  UPC: '036000291452',
  CODE128: 'TOOLBOX-2026',
  CODE39: 'SAMPLE-39',
}

export function loadBarcodeStyle(): BarcodeStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BARCODE_STYLE
    const parsed = JSON.parse(raw) as Partial<BarcodeStyle>
    return { ...DEFAULT_BARCODE_STYLE, ...parsed }
  } catch {
    return DEFAULT_BARCODE_STYLE
  }
}

export function saveBarcodeStyle(style: BarcodeStyle) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style))
  } catch {
    /* preference only */
  }
}

export async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(image, 0, 0, width, height)
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not rasterize barcode'))
    img.src = url
  })
}
