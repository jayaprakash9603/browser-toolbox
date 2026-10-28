/** Incremental MD5 over bytes, so large files can be hashed chunk by chunk with progress. */

const SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
const K = Int32Array.from(
  { length: 64 },
  (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0,
)

export class Md5 {
  private readonly state = new Int32Array([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476])
  private readonly buffer = new Uint8Array(64)
  private readonly words = new Int32Array(16)
  private buffered = 0
  private length = 0

  update(data: Uint8Array): this {
    let offset = 0
    this.length += data.length
    if (this.buffered > 0) {
      const take = Math.min(64 - this.buffered, data.length)
      this.buffer.set(data.subarray(0, take), this.buffered)
      this.buffered += take
      offset = take
      if (this.buffered < 64) return this
      this.block(this.buffer, 0)
      this.buffered = 0
    }
    for (; offset + 64 <= data.length; offset += 64) this.block(data, offset)
    if (offset < data.length) {
      this.buffer.set(data.subarray(offset), 0)
      this.buffered = data.length - offset
    }
    return this
  }

  digest(): string {
    const bits = this.length * 8
    const tail = new Uint8Array(this.buffered < 56 ? 64 : 128)
    tail.set(this.buffer.subarray(0, this.buffered))
    tail[this.buffered] = 0x80
    const view = new DataView(tail.buffer)
    view.setUint32(tail.length - 8, bits >>> 0, true)
    view.setUint32(tail.length - 4, Math.floor(bits / 2 ** 32), true)
    for (let offset = 0; offset < tail.length; offset += 64) this.block(tail, offset)
    let hex = ''
    for (const word of this.state) {
      for (let byte = 0; byte < 4; byte += 1)
        hex += ((word >>> (byte * 8)) & 0xff).toString(16).padStart(2, '0')
    }
    return hex
  }

  private block(bytes: Uint8Array, offset: number) {
    const m = this.words
    for (let i = 0; i < 16; i += 1) {
      const j = offset + i * 4
      m[i] = bytes[j] | (bytes[j + 1] << 8) | (bytes[j + 2] << 16) | (bytes[j + 3] << 24)
    }
    const s = this.state
    let a = s[0]
    let b = s[1]
    let c = s[2]
    let d = s[3]
    for (let i = 0; i < 64; i += 1) {
      let f: number
      let g: number
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }
      const shift = SHIFTS[(i >> 4) * 4 + (i % 4)]
      const sum = (a + f + K[i] + m[g]) | 0
      a = d
      d = c
      c = b
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0
    }
    s[0] = (s[0] + a) | 0
    s[1] = (s[1] + b) | 0
    s[2] = (s[2] + c) | 0
    s[3] = (s[3] + d) | 0
  }
}
