import type { LinkGraph, PageNode } from './graph'

type Vec3 = { x: number; y: number; z: number }

export type GraphLayoutKind = 'spherical' | 'hierarchical' | 'radial' | 'force'

export interface LayoutPoint {
  id: string
  x: number
  y: number
  z: number
}

const DEPTH_RADIUS = 0.28
const BASE_RADIUS = 0.18
const ORPHAN_EXTRA = 0.4
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const FORCE_ITERATIONS = 40
const FORCE_NODE_CAP = 220
const REPULSION = 0.04
const SPRING = 0.015
const DAMPING = 0.82

export function layoutLinkGraph(graph: LinkGraph, kind: GraphLayoutKind): Map<string, LayoutPoint> {
  if (kind === 'hierarchical') return ringLayout(graph, 0)
  if (kind === 'radial') return ringLayout(graph, 0.35)
  const spherical = sphericalLayout(graph)
  if (kind === 'force') return forceLayout(graph, spherical)
  return spherical
}

function sphericalLayout(graph: LinkGraph): Map<string, LayoutPoint> {
  const points = new Map<string, LayoutPoint>()
  const groups = groupByShell(graph.nodes)
  for (const [shell, nodes] of groups) {
    const radius = shellRadius(shell, graph)
    placeOnSphere(nodes, radius, points, clusterBias(nodes))
  }
  return points
}

function ringLayout(graph: LinkGraph, tilt: number): Map<string, LayoutPoint> {
  const points = new Map<string, LayoutPoint>()
  const groups = groupByShell(graph.nodes)
  for (const [shell, nodes] of groups) {
    const radius = shellRadius(shell, graph)
    const y = shell === 'external' ? -radius * 0.35 : -shellIndex(shell) * DEPTH_RADIUS
    nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2
      points.set(node.id, {
        id: node.id,
        x: Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius * tilt,
        z: Math.sin(angle) * radius,
      })
    })
  }
  return points
}

function forceLayout(graph: LinkGraph, initial: Map<string, LayoutPoint>): Map<string, LayoutPoint> {
  if (graph.nodes.length > FORCE_NODE_CAP) return initial
  const points = new Map([...initial.entries()].map(([id, point]) => [id, { ...point }]))
  const ids = graph.nodes.map((node) => node.id)
  for (let step = 0; step < FORCE_ITERATIONS; step += 1) {
    const velocity = new Map(ids.map((id) => [id, { x: 0, y: 0, z: 0 }]))
    applyRepulsion(ids, points, velocity)
    applySprings(graph, points, velocity)
    for (const id of ids) integrate(points.get(id)!, velocity.get(id)!)
  }
  return points
}

function applyRepulsion(ids: string[], points: Map<string, LayoutPoint>, velocity: Map<string, Vec3>) {
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = points.get(ids[i])!
      const b = points.get(ids[j])!
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z
      const distSq = Math.max(0.0004, dx * dx + dy * dy + dz * dz)
      const force = REPULSION / distSq
      const va = velocity.get(ids[i])!
      const vb = velocity.get(ids[j])!
      va.x += dx * force
      va.y += dy * force
      va.z += dz * force
      vb.x -= dx * force
      vb.y -= dy * force
      vb.z -= dz * force
    }
  }
}

function applySprings(graph: LinkGraph, points: Map<string, LayoutPoint>, velocity: Map<string, Vec3>) {
  for (const edge of graph.edges) {
    if (!edge.destinationPageId) continue
    const a = points.get(edge.sourcePageId)
    const b = points.get(edge.destinationPageId)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dz = b.z - a.z
    const va = velocity.get(edge.sourcePageId)!
    const vb = velocity.get(edge.destinationPageId)!
    va.x += dx * SPRING
    va.y += dy * SPRING
    va.z += dz * SPRING
    vb.x -= dx * SPRING
    vb.y -= dy * SPRING
    vb.z -= dz * SPRING
  }
}

function integrate(point: LayoutPoint, velocity: Vec3) {
  point.x = (point.x + velocity.x) * DAMPING
  point.y = (point.y + velocity.y) * DAMPING
  point.z = (point.z + velocity.z) * DAMPING
}

type Shell = number | 'orphan' | 'external' | 'unknown'

function groupByShell(nodes: PageNode[]): Map<Shell, PageNode[]> {
  const groups = new Map<Shell, PageNode[]>()
  for (const node of nodes) {
    const shell = shellOf(node)
    const list = groups.get(shell)
    if (list) list.push(node)
    else groups.set(shell, [node])
  }
  for (const list of groups.values()) {
    list.sort((a, b) => pathCluster(a.url).localeCompare(pathCluster(b.url)) || a.url.localeCompare(b.url))
  }
  return groups
}

function shellOf(node: PageNode): Shell {
  if (node.isExternal) return 'external'
  if (node.isOrphan) return 'orphan'
  if (node.linkDepth == null) return 'unknown'
  return node.linkDepth
}

function shellRadius(shell: Shell, graph: LinkGraph): number {
  const maxDepth = Math.max(1, ...graph.nodes.map((node) => node.linkDepth ?? 0))
  if (shell === 'external') return BASE_RADIUS + (maxDepth + 1) * DEPTH_RADIUS
  if (shell === 'orphan' || shell === 'unknown') return BASE_RADIUS + maxDepth * DEPTH_RADIUS + ORPHAN_EXTRA
  return BASE_RADIUS + shell * DEPTH_RADIUS
}

function shellIndex(shell: Shell): number {
  if (typeof shell === 'number') return shell
  if (shell === 'unknown') return 8
  if (shell === 'orphan') return 9
  return 10
}

function clusterBias(nodes: PageNode[]): Map<string, number> {
  const clusters = [...new Set(nodes.map((node) => pathCluster(node.url)))]
  return new Map(clusters.map((cluster, index) => [cluster, (index / Math.max(1, clusters.length)) * Math.PI * 2]))
}

function placeOnSphere(
  nodes: PageNode[],
  radius: number,
  points: Map<string, LayoutPoint>,
  bias: Map<string, number>,
) {
  if (nodes.length === 1) {
    points.set(nodes[0].id, { id: nodes[0].id, x: 0, y: radius > BASE_RADIUS ? -radius * 0.2 : 0, z: 0 })
    return
  }
  nodes.forEach((node, index) => {
    const offset = bias.get(pathCluster(node.url)) ?? 0
    const y = 1 - (index / Math.max(1, nodes.length - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = GOLDEN_ANGLE * index + offset
    points.set(node.id, {
      id: node.id,
      x: Math.cos(theta) * ring * radius,
      y: y * radius,
      z: Math.sin(theta) * ring * radius,
    })
  })
}

export function pathCluster(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[0]?.toLowerCase() ?? '/'
  } catch {
    return '/'
  }
}
