import { normalizeDetectedFormat, type DetectedBarcodeFormat } from '@/core/engines/barcode/parse'
import { decodeQrWithLocation, type QrPoint } from '@/core/engines/qrcode'

export type CodeFamily = 'qr' | 'barcode'

export interface DecodedCode {
  family: CodeFamily
  format: DetectedBarcodeFormat
  data: string
  corners: QrPoint[]
}

interface NativeDetectedBarcode {
  rawValue: string
  format: string
  boundingBox?: { x: number; y: number; width: number; height: number }
  cornerPoints?: { x: number; y: number }[]
}

interface NativeBarcodeDetector {
  detect: (source: CanvasImageSource | ImageData) => Promise<NativeDetectedBarcode[]>
}

type DetectorCtor = new (options?: { formats?: string[] }) => NativeBarcodeDetector

const PREFERRED_FORMATS = [
  'qr_code',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'itf',
  'pdf417',
  'aztec',
  'data_matrix',
]

function detectorCtor(): DetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
  return ctor ?? null
}

function cornersFromBox(box: { x: number; y: number; width: number; height: number }): QrPoint[] {
  const x2 = box.x + box.width
  const y2 = box.y + box.height
  return [
    { x: box.x, y: box.y },
    { x: x2, y: box.y },
    { x: x2, y: y2 },
    { x: box.x, y: y2 },
  ]
}

function scaleCorners(corners: QrPoint[], scale: number): QrPoint[] {
  if (scale === 1) return corners
  return corners.map((point) => ({ x: point.x / scale, y: point.y / scale }))
}

function samePayload(left: DecodedCode, right: { format: string; data: string }): boolean {
  return left.data === right.data && left.format === normalizeDetectedFormat(right.format)
}

async function detectNative(source: CanvasImageSource | ImageData): Promise<DecodedCode[]> {
  const Ctor = detectorCtor()
  if (!Ctor) return []
  try {
    const withFormats = Ctor as DetectorCtor & { getSupportedFormats?: () => Promise<string[]> }
    const listed =
      typeof withFormats.getSupportedFormats === 'function'
        ? await withFormats.getSupportedFormats()
        : PREFERRED_FORMATS
    const formats = PREFERRED_FORMATS.filter((format) => listed.includes(format))
    const detector = new Ctor(formats.length ? { formats } : undefined)
    const found = await detector.detect(source)
    return found
      .map((item) => {
        const format = normalizeDetectedFormat(item.format)
        const corners =
          item.cornerPoints && item.cornerPoints.length >= 3
            ? item.cornerPoints.map((point) => ({ x: point.x, y: point.y }))
            : item.boundingBox
              ? cornersFromBox(item.boundingBox)
              : []
        return {
          family: format === 'qr_code' ? 'qr' : 'barcode',
          format,
          data: item.rawValue,
          corners,
        } satisfies DecodedCode
      })
      .filter((item) => item.data)
  } catch {
    return []
  }
}

export async function decodeCodesFromImage(image: {
  data: Uint8ClampedArray
  width: number
  height: number
  canvas?: HTMLCanvasElement
  scale?: number
}): Promise<DecodedCode[]> {
  const scale = image.scale && image.scale > 0 ? image.scale : 1
  const nativeSource = image.canvas ?? ({ data: image.data, width: image.width, height: image.height } as ImageData)
  const codes = await detectNative(nativeSource)
  const hasQr = codes.some((code) => code.family === 'qr')
  if (!hasQr) {
    const qr = await decodeQrWithLocation({ data: image.data, width: image.width, height: image.height })
    if (qr.ok && !codes.some((code) => code.data === qr.value.data)) {
      codes.unshift({
        family: 'qr',
        format: 'qr_code',
        data: qr.value.data,
        corners: qr.value.corners,
      })
    }
  }
  const unique: DecodedCode[] = []
  for (const code of codes) {
    if (unique.some((item) => samePayload(item, code))) continue
    unique.push({ ...code, corners: scaleCorners(code.corners, scale) })
  }
  return unique
}
