/** Minimal single-page PDF with one embedded JPEG (DCTDecode). */

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function padOffset(n: number): string {
  return String(n).padStart(10, '0')
}

export function jpegToPdf(jpeg: Uint8Array, widthPx: number, heightPx: number): Uint8Array {
  const w = Math.max(1, Math.round(widthPx))
  const h = Math.max(1, Math.round(heightPx))
  const contents = `q ${w} 0 0 ${h} 0 0 cm /Im1 Do Q`

  const parts: { id: number; bytes: Uint8Array }[] = []
  const push = (id: number, text: string) => parts.push({ id, bytes: enc(text) })

  push(1, `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`)
  push(2, `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`)
  push(
    3,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  )

  const imgHeader = enc(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  const imgFooter = enc(`\nendstream\nendobj\n`)
  parts.push({ id: 4, bytes: concat([imgHeader, jpeg, imgFooter]) })

  push(5, `5 0 obj\n<< /Length ${contents.length} >>\nstream\n${contents}\nendstream\nendobj\n`)

  const header = enc('%PDF-1.4\n')
  const offsets: number[] = []
  let pos = header.length
  for (const p of parts) {
    offsets[p.id] = pos
    pos += p.bytes.length
  }
  const body = concat([header, ...parts.map((p) => p.bytes)])
  const xrefPos = body.length
  let xref = `xref\n0 6\n0000000000 65535 f \n`
  for (let i = 1; i <= 5; i++) xref += `${padOffset(offsets[i])} 00000 n \n`
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  return concat([body, enc(xref), enc(trailer)])
}
