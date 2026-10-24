export type QuarterTurn = 0 | 90 | 180 | 270

/** A page's visible box in PDF user space plus its clockwise /Rotate value. */
export interface PageBox {
  x: number
  y: number
  width: number
  height: number
  rotation: QuarterTurn
}

export interface Point {
  x: number
  y: number
}

export function normalizeRotation(angle: number): QuarterTurn {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as QuarterTurn
}

/** Size of the page as a viewer shows it, after rotation. */
export function displaySize(box: PageBox): { width: number; height: number } {
  return box.rotation % 180 === 0 ? { width: box.width, height: box.height } : { width: box.height, height: box.width }
}

/**
 * Maps a point given as fractions of the displayed page (origin top-left) to PDF user space,
 * so edits land where the user placed them even on rotated pages.
 */
export function toPdfPoint(box: PageBox, u: number, v: number): Point {
  const { x, y, width: w, height: h } = box
  switch (box.rotation) {
    case 90:
      return { x: x + v * w, y: y + u * h }
    case 180:
      return { x: x + (1 - u) * w, y: y + v * h }
    case 270:
      return { x: x + (1 - v) * w, y: y + (1 - u) * h }
    default:
      return { x: x + u * w, y: y + (1 - v) * h }
  }
}

/** Maps points measured upward from the displayed page's bottom-left corner to PDF user space. */
export function localToPdf(box: PageBox, lx: number, ly: number): Point {
  const display = displaySize(box)
  return toPdfPoint(box, lx / display.width, 1 - ly / display.height)
}

/** Corner a line or arrow starts from: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left. */
export type LineDirection = 0 | 1 | 2 | 3

/** Ends of a line across a `w` × `h` box, with y growing downward. */
export function lineEnds(direction: LineDirection, w: number, h: number): [Point, Point] {
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
  return [corners[direction], corners[(direction + 2) % 4]]
}

/** The two barbs of an arrowhead at `to`. */
export function arrowBarbs(from: Point, to: Point, size: number): [Point, Point] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const spread = Math.PI / 7
  return [
    { x: to.x - size * Math.cos(angle - spread), y: to.y - size * Math.sin(angle - spread) },
    { x: to.x - size * Math.cos(angle + spread), y: to.y - size * Math.sin(angle + spread) },
  ]
}

/** Four cubic Bézier segments approximating an ellipse inside a `w` × `h` box: start point, then [c1, c2, end] triples. */
export function ellipseCurves(w: number, h: number): { start: Point; curves: [Point, Point, Point][] } {
  const k = 0.5522847498
  const rx = w / 2
  const ry = h / 2
  const cx = rx
  const cy = ry
  return {
    start: { x: cx + rx, y: cy },
    curves: [
      [{ x: cx + rx, y: cy + k * ry }, { x: cx + k * rx, y: cy + ry }, { x: cx, y: cy + ry }],
      [{ x: cx - k * rx, y: cy + ry }, { x: cx - rx, y: cy + k * ry }, { x: cx - rx, y: cy }],
      [{ x: cx - rx, y: cy - k * ry }, { x: cx - k * rx, y: cy - ry }, { x: cx, y: cy - ry }],
      [{ x: cx + k * rx, y: cy - ry }, { x: cx + rx, y: cy - k * ry }, { x: cx + rx, y: cy }],
    ],
  }
}

/** Rotates (dx, dy) counter-clockwise by `degrees`. */
export function rotateVector(dx: number, dy: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

export type NumberPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

/** Baseline start of a page-number label, in display points from the bottom-left corner. */
export function numberAnchor(
  display: { width: number; height: number },
  textWidth: number,
  fontSize: number,
  position: NumberPosition,
  margin: number,
): Point {
  const [vertical, horizontal] = position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right']
  const x =
    horizontal === 'left' ? margin : horizontal === 'right' ? display.width - margin - textWidth : (display.width - textWidth) / 2
  const y = vertical === 'top' ? display.height - margin - fontSize * 0.72 : margin
  return { x, y }
}

/**
 * Baseline starts for a watermark label, in display points from the bottom-left corner.
 * `height` is the label's visual height; it is centred on each anchor.
 */
export function watermarkAnchors(
  display: { width: number; height: number },
  width: number,
  height: number,
  angle: number,
  layout: 'center' | 'tile',
): Point[] {
  const offset = rotateVector(-width / 2, -height / 2, angle)
  if (layout === 'center') return [{ x: display.width / 2 + offset.x, y: display.height / 2 + offset.y }]
  const stepX = Math.max(width * 1.35, height * 6, 120)
  const stepY = Math.max(height * 4.5, 90)
  const anchors: Point[] = []
  let row = 0
  for (let cy = stepY / 2 - stepY; cy < display.height + stepY; cy += stepY, row += 1) {
    const shift = row % 2 === 0 ? 0 : stepX / 2
    for (let cx = stepX / 2 - stepX + shift; cx < display.width + stepX; cx += stepX) {
      anchors.push({ x: cx + offset.x, y: cy + offset.y })
    }
  }
  return anchors
}

export function pageNumberLabel(template: string, page: number, total: number): string {
  return template.replaceAll('{n}', String(page)).replaceAll('{total}', String(total))
}
