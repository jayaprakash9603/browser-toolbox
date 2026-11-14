import { normalizeDetectedFormat } from '@/core/engines/barcode/parse'
import type { QrPoint } from '@/core/engines/qrcode'

import type { DecodedCode } from './decode'

function rgbaToLuminance(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const size = width * height
  const out = new Uint8ClampedArray(size)
  for (let j = 0, i = 0; j < size; j += 1, i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    out[j] = (r + g + g + b) >> 2
  }
  return out
}

function cornersFromResult(points: { getX(): number; getY(): number }[]): QrPoint[] {
  return points.map((point) => ({ x: point.getX(), y: point.getY() }))
}

/** Software decoder for linear barcodes when the native BarcodeDetector is missing or fails. */
export async function detectBarcodesWithZxing(image: {
  data: Uint8ClampedArray
  width: number
  height: number
}): Promise<DecodedCode[]> {
  if (image.width < 8 || image.height < 8) return []
  const luminance = rgbaToLuminance(image.data, image.width, image.height)
  const {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    GlobalHistogramBinarizer,
    HybridBinarizer,
    MultiFormatReader,
    RGBLuminanceSource,
  } = await import('@zxing/library')

  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
      BarcodeFormat.DATA_MATRIX,
    ],
  )

  const source = new RGBLuminanceSource(luminance, image.width, image.height)
  const binarizers = [
    new HybridBinarizer(source),
    new GlobalHistogramBinarizer(source),
    new HybridBinarizer(source.invert()),
  ]

  const reader = new MultiFormatReader()
  reader.setHints(hints)

  for (const binarizer of binarizers) {
    try {
      const result = reader.decode(new BinaryBitmap(binarizer))
      const rawFormat = BarcodeFormat[result.getBarcodeFormat()]
      const format = normalizeDetectedFormat(typeof rawFormat === 'string' ? rawFormat : 'unknown')
      if (format === 'qr_code') continue
      const text = result.getText()?.trim()
      if (!text) continue
      const points = result.getResultPoints() ?? []
      return [
        {
          family: 'barcode',
          format,
          data: text,
          corners: cornersFromResult(points),
        },
      ]
    } catch {
      // NotFoundException — try the next binarizer.
    }
  }
  return []
}