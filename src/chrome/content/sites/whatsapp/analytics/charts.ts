import type { DualSeriesPoint, SeriesPoint } from '@/core/sites/whatsapp/analytics'

const GREEN = '#25d366'
const MUTED = 'rgba(128,128,128,0.35)'

export function svgBarChart(points: SeriesPoint[], width = 280, height = 120): SVGSVGElement {
  const max = Math.max(1, ...points.map((p) => p.value))
  const pad = 8
  const barW = points.length ? (width - pad * 2) / points.length - 2 : 0
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('class', 'tbx-cp-chart')
  points.forEach((p, i) => {
    const h = ((height - pad * 2) * p.value) / max
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', String(pad + i * (barW + 2)))
    rect.setAttribute('y', String(height - pad - h))
    rect.setAttribute('width', String(Math.max(1, barW)))
    rect.setAttribute('height', String(h))
    rect.setAttribute('fill', GREEN)
    rect.setAttribute('rx', '2')
    svg.appendChild(rect)
  })
  return svg
}

export function svgDualBar(points: DualSeriesPoint[], width = 320, height = 140): SVGSVGElement {
  const max = Math.max(1, ...points.flatMap((p) => [p.sent, p.received]))
  const pad = 10
  const groupW = points.length ? (width - pad * 2) / points.length : 0
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('class', 'tbx-cp-chart')
  points.forEach((p, i) => {
    const x = pad + i * groupW
    const w = Math.max(2, groupW / 2 - 2)
    for (const [val, color, off] of [
      [p.sent, GREEN, 0],
      [p.received, '#128c7e', w + 2],
    ] as const) {
      const h = ((height - pad * 2) * val) / max
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', String(x + off))
      rect.setAttribute('y', String(height - pad - h))
      rect.setAttribute('width', String(w))
      rect.setAttribute('height', String(h))
      rect.setAttribute('fill', color)
      rect.setAttribute('rx', '2')
      svg.appendChild(rect)
    }
  })
  return svg
}

export function svgDonut(sent: number, received: number, size = 120): SVGSVGElement {
  const total = sent + received || 1
  const r = size / 2 - 8
  const cx = size / 2
  const cy = size / 2
  const sentAngle = (sent / total) * Math.PI * 2
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  svg.setAttribute('class', 'tbx-cp-chart tbx-cp-donut')
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  bg.setAttribute('cx', String(cx))
  bg.setAttribute('cy', String(cy))
  bg.setAttribute('r', String(r))
  bg.setAttribute('fill', 'none')
  bg.setAttribute('stroke', MUTED)
  bg.setAttribute('stroke-width', '14')
  svg.appendChild(bg)
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const x1 = cx + r * Math.sin(0)
  const y1 = cy - r * Math.cos(0)
  const x2 = cx + r * Math.sin(sentAngle)
  const y2 = cy - r * Math.cos(sentAngle)
  const large = sentAngle > Math.PI ? 1 : 0
  arc.setAttribute(
    'd',
    `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
  )
  arc.setAttribute('fill', 'none')
  arc.setAttribute('stroke', GREEN)
  arc.setAttribute('stroke-width', '14')
  arc.setAttribute('stroke-linecap', 'round')
  svg.appendChild(arc)
  return svg
}

export function svgGauge(value: number, max: number, size = 140): SVGSVGElement {
  const pct = Math.min(1, value / Math.max(1, max))
  const r = size / 2 - 10
  const cx = size / 2
  const cy = size / 2
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  svg.setAttribute('class', 'tbx-cp-chart')
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  track.setAttribute('d', describeArc(cx, cy, r, -120, 120))
  track.setAttribute('fill', 'none')
  track.setAttribute('stroke', MUTED)
  track.setAttribute('stroke-width', '10')
  svg.appendChild(track)
  const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  fill.setAttribute('d', describeArc(cx, cy, r, -120, -120 + 240 * pct))
  fill.setAttribute('fill', 'none')
  fill.setAttribute('stroke', GREEN)
  fill.setAttribute('stroke-width', '10')
  fill.setAttribute('stroke-linecap', 'round')
  svg.appendChild(fill)
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('x', String(cx))
  text.setAttribute('y', String(cy + 4))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('class', 'tbx-cp-gauge-val')
  text.textContent = String(Math.round(value))
  svg.appendChild(text)
  return svg
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, startDeg)
  const end = polar(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function svgHeatGrid(cells: number[], cols = 24, cell = 10): SVGSVGElement {
  const rows = Math.ceil(cells.length / cols)
  const max = Math.max(1, ...cells)
  const width = cols * cell + 2
  const height = rows * cell + 2
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('class', 'tbx-cp-chart')
  cells.forEach((v, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', String(col * cell + 1))
    rect.setAttribute('y', String(row * cell + 1))
    rect.setAttribute('width', String(cell - 2))
    rect.setAttribute('height', String(cell - 2))
    rect.setAttribute('rx', '1')
    const alpha = 0.15 + (0.85 * v) / max
    rect.setAttribute('fill', `rgba(37, 211, 102, ${alpha})`)
    svg.appendChild(rect)
  })
  return svg
}

export function progressBars(items: SeriesPoint[]): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'tbx-cp-bars'
  const max = Math.max(1, ...items.map((i) => i.value))
  for (const item of items) {
    const row = document.createElement('div')
    row.className = 'tbx-cp-barrow'
    const label = document.createElement('span')
    label.className = 'tbx-cp-barrow__label'
    label.textContent = item.label
    const track = document.createElement('div')
    track.className = 'tbx-cp-barrow__track'
    const fill = document.createElement('div')
    fill.className = 'tbx-cp-barrow__fill'
    fill.style.width = `${(item.value / max) * 100}%`
    track.appendChild(fill)
    const val = document.createElement('span')
    val.className = 'tbx-cp-barrow__val'
    val.textContent = String(item.value)
    row.append(label, track, val)
    wrap.appendChild(row)
  }
  return wrap
}
