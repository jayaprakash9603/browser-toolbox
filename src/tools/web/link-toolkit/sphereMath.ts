import type { LayoutPoint } from '@/core/engines/links/graphLayout'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Projected {
  id: string
  x: number
  y: number
  z: number
  scale: number
}

const FOCAL = 2.4

export function rotateY(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return { x: point.x * cos - point.z * sin, y: point.y, z: point.x * sin + point.z * cos }
}

export function projectPoint(point: Vec3, width: number, height: number, zoom: number, pan: Vec3): Projected | null {
  const z = point.z + FOCAL
  if (z < 0.2) return null
  const perspective = FOCAL / z
  const cx = width / 2 + pan.x
  const cy = height / 2 + pan.y
  const size = Math.min(width, height) * 0.38 * zoom
  return {
    id: '',
    x: cx + point.x * size * perspective,
    y: cy + point.y * size * perspective,
    z,
    scale: perspective,
  }
}

export function projectLayout(
  points: Map<string, LayoutPoint>,
  angle: number,
  width: number,
  height: number,
  zoom: number,
  pan: Vec3,
): Map<string, Projected> {
  const out = new Map<string, Projected>()
  for (const point of points.values()) {
    const rotated = rotateY(point, angle)
    const projected = projectPoint(rotated, width, height, zoom, pan)
    if (!projected) continue
    projected.id = point.id
    out.set(point.id, projected)
  }
  return out
}

export function hitTest(projected: Map<string, Projected>, x: number, y: number, radius = 14): string | null {
  let best: { id: string; dist: number; z: number } | null = null
  for (const point of projected.values()) {
    const dx = point.x - x
    const dy = point.y - y
    const dist = Math.hypot(dx, dy)
    if (dist > radius + point.scale * 10) continue
    if (!best || point.z < best.z || (point.z === best.z && dist < best.dist)) {
      best = { id: point.id, dist, z: point.z }
    }
  }
  return best?.id ?? null
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}
