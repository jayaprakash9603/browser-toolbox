// Generates simple PNG toolbar icons (rounded dark square with a lighter
// centered glyph block) without any native dependencies.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BG = [24, 24, 27] // zinc-900
const FG = [250, 250, 250] // zinc-50

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = Array.from({ length: 256 }, (_, n) => {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      return c >>> 0
    })
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const radius = Math.max(2, Math.round(size * 0.22))
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = [0]
    for (let x = 0; x < size; x++) {
      // rounded-corner alpha mask
      const dx = Math.max(radius - x - 1, 0, x - (size - radius))
      const dy = Math.max(radius - y - 1, 0, y - (size - radius))
      const insideCorner = dx * dx + dy * dy <= radius * radius
      const inGlyph =
        x >= size * 0.28 && x < size * 0.72 && y >= size * 0.28 && y < size * 0.72
      const color = inGlyph ? FG : BG
      const alpha = insideCorner ? 255 : 0
      row.push(color[0], color[1], color[2], alpha)
    }
    rows.push(Buffer.from(row))
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = new URL('../public/icons', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
mkdirSync(outDir, { recursive: true })
for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon${size}.png`), png(size))
  console.log(`icon${size}.png`)
}
