const TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** Incremental CRC-32 (IEEE, as used by ZIP and PNG). A checksum for accidental corruption, not tampering. */
export class Crc32 {
  private crc = 0xffffffff

  update(data: Uint8Array): this {
    let crc = this.crc
    for (let i = 0; i < data.length; i += 1) crc = TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    this.crc = crc
    return this
  }

  digest(): string {
    return ((this.crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
  }
}
