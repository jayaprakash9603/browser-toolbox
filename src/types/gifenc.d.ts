declare module 'gifenc' {
  export function quantize(
    data: Uint8ClampedArray,
    maxColors: number,
  ): { palette: number[]; indices: Uint8Array }
  export function GIFEncoder(): {
    writeFrame(indices: Uint8Array, width: number, height: number, opts: { palette: number[] }): void
    finish(): void
    bytes(): Uint8Array
  }
}
