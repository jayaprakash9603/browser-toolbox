import { GIFEncoder, quantize, applyPalette } from 'gifenc'

export function encodeGifFromRgba(
  frames: { rgba: Uint8ClampedArray; width: number; height: number; delayMs?: number }[],
): Uint8Array {
  const gif = GIFEncoder()
  for (const frame of frames) {
    const palette = quantize(frame.rgba, 256)
    const index = applyPalette(frame.rgba, palette)
    gif.writeFrame(index, frame.width, frame.height, { palette })
  }
  gif.finish()
  return gif.bytes()
}
