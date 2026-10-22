/** Encode RGBA bitmap as 24-bit BMP. */
export function encodeBmp(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const rowBytes = Math.ceil((width * 3) / 4) * 4
  const pixelBytes = rowBytes * height
  const fileSize = 14 + 40 + pixelBytes
  const out = new Uint8Array(fileSize)
  const view = new DataView(out.buffer)

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 14 + 40, true)

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelBytes, true)

  let offset = 14 + 40
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      out[offset++] = rgba[i + 2]
      out[offset++] = rgba[i + 1]
      out[offset++] = rgba[i]
    }
    const pad = rowBytes - width * 3
    for (let p = 0; p < pad; p++) offset++
  }
  return out
}
