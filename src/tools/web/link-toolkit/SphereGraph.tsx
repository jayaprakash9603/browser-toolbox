import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { LinkGraph, PageNode } from '@/core/engines/links/graph'
import { layoutLinkGraph, type GraphLayoutKind } from '@/core/engines/links/graphLayout'
import { cn } from '@/shared/utils/cn'

import {
  DIALOG_NODE_CAP,
  edgeStroke,
  edgeVisible,
  NODE_APPEAR_MS,
  nodeFill,
  nodeRadius,
  nodeVisible,
  PARTICLE_NODE_CAP,
  PARTICLE_SECONDS,
  ROTATION_SECONDS,
  SIDEBAR_NODE_CAP,
  type GraphFilters,
} from './graphStyle'
import { hitTest, lerp, projectLayout, type Vec3 } from './sphereMath'

interface SphereGraphProps {
  graph: LinkGraph
  layout: GraphLayoutKind
  selectedId: string | null
  onSelect: (id: string | null) => void
  filters: GraphFilters
  animated: boolean
  reducedMotion: boolean
  expanded?: boolean
  focusToken?: number
  resetToken?: number
  zoomInToken?: number
  zoomOutToken?: number
  neighborhood?: Set<string> | null
  search?: string
  className?: string
}

export function SphereGraph({
  graph,
  layout,
  selectedId,
  onSelect,
  filters,
  animated,
  reducedMotion,
  expanded,
  focusToken = 0,
  resetToken = 0,
  zoomInToken = 0,
  zoomOutToken = 0,
  neighborhood,
  search = '',
  className,
}: SphereGraphProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const zoomRef = useRef(1)
  const panRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const appearRef = useRef(0)
  const hoverRef = useRef<string | null>(null)
  const offsetsRef = useRef(new Map<string, Vec3>())
  const [hover, setHover] = useState<PageNode | null>(null)
  const cap = expanded ? DIALOG_NODE_CAP : SIDEBAR_NODE_CAP
  const visibleNodes = useMemo(() => clusterNodes(graph.nodes, cap), [graph.nodes, cap])
  const points = useMemo(
    () => layoutLinkGraph({ ...graph, nodes: visibleNodes }, layout),
    [graph, visibleNodes, layout],
  )

  useEffect(() => {
    appearRef.current = performance.now()
  }, [graph.startUrl, layout, visibleNodes.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    let frame = 0
    let running = true
    const loop = (now: number) => {
      if (!running) return
      const reduce = reducedMotion || !animated
      if (!reduce) angleRef.current += (Math.PI * 2) / (ROTATION_SECONDS * 60)
      drawFrame(ctx, canvas, {
        graph,
        points,
        angle: angleRef.current,
        zoom: zoomRef.current,
        pan: panRef.current,
        selectedId,
        hoverId: hoverRef.current,
        filters,
        appear: Math.min(1, (now - appearRef.current) / NODE_APPEAR_MS),
        particles: !reduce && visibleNodes.length <= PARTICLE_NODE_CAP,
        now,
        neighborhood,
        search,
        offsets: offsetsRef.current,
      })
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(frame)
    }
  }, [animated, filters, graph, neighborhood, points, reducedMotion, search, selectedId, visibleNodes.length])

  useEffect(() => {
    if (!selectedId || !focusToken) return
    zoomRef.current = 1.35
  }, [focusToken, selectedId])

  useEffect(() => {
    if (!resetToken) return
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0, z: 0 }
  }, [resetToken])

  useEffect(() => {
    if (zoomInToken) zoomRef.current = Math.min(3.2, zoomRef.current * 1.12)
  }, [zoomInToken])

  useEffect(() => {
    if (zoomOutToken) zoomRef.current = Math.max(0.45, zoomRef.current * 0.9)
  }, [zoomOutToken])

  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-zinc-950', className)}>
      <canvas
        ref={canvasRef}
        className="block h-[280px] w-full cursor-grab touch-none @[720px]:h-[420px]"
        role="img"
        aria-label={t('web.links.tab.graph')}
        onPointerDown={(event) =>
          onPointer(event, canvasRef.current, points, angleRef, zoomRef, panRef, offsetsRef.current, onSelect, setHover, hoverRef, graph)
        }
        onPointerMove={(event) => onMove(event, canvasRef.current, points, angleRef, zoomRef, panRef, offsetsRef.current, setHover, hoverRef, graph)}
        onWheel={(event) => {
          event.preventDefault()
          zoomRef.current = Math.min(3.2, Math.max(0.45, zoomRef.current * (event.deltaY > 0 ? 0.92 : 1.08)))
        }}
      />
      {hover && <GraphTooltip node={hover} />}
      <GraphNodeList nodes={visibleNodes} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}

function clusterNodes(nodes: PageNode[], cap: number): PageNode[] {
  if (nodes.length <= cap) return nodes
  const ranked = [...nodes].sort(
    (a, b) => Number(b.pageType === 'home') - Number(a.pageType === 'home') || b.incomingCount - a.incomingCount,
  )
  return ranked.slice(0, cap)
}

interface DrawState {
  graph: LinkGraph
  points: ReturnType<typeof layoutLinkGraph>
  angle: number
  zoom: number
  pan: Vec3
  selectedId: string | null
  hoverId: string | null
  filters: GraphFilters
  appear: number
  particles: boolean
  now: number
  neighborhood: Set<string> | null | undefined
  search: string
  offsets: Map<string, Vec3>
}

function drawFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: DrawState) {
  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio
    canvas.height = height * ratio
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  paintBackdrop(ctx, width, height)
  const projected = projectLayout(state.points, state.angle, width, height, state.zoom, state.pan)
  applyOffsets(projected, state.offsets)
  const connected = connectedIds(state.graph, state.filters)
  drawEdges(ctx, state, projected)
  drawNodes(ctx, state, projected, connected)
}

function paintBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 12, width / 2, height / 2, Math.max(width, height) * 0.6)
  gradient.addColorStop(0, 'rgba(56,189,248,0.16)')
  gradient.addColorStop(1, 'rgba(9,9,11,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function connectedIds(graph: LinkGraph, filters: GraphFilters): Set<string> {
  const ids = new Set<string>()
  for (const edge of graph.edges) {
    if (!edgeVisible(edge, filters)) continue
    ids.add(edge.sourcePageId)
    if (edge.destinationPageId) ids.add(edge.destinationPageId)
  }
  return ids
}

function applyOffsets(projected: ReturnType<typeof projectLayout>, offsets: Map<string, Vec3>) {
  for (const [id, offset] of offsets) {
    const point = projected.get(id)
    if (!point) continue
    point.x += offset.x
    point.y += offset.y
  }
}

function drawEdges(ctx: CanvasRenderingContext2D, state: DrawState, projected: ReturnType<typeof projectLayout>) {
  for (const edge of state.graph.edges) {
    if (!edgeVisible(edge, state.filters) || !edge.destinationPageId) continue
    const from = projected.get(edge.sourcePageId)
    const to = projected.get(edge.destinationPageId)
    if (!from || !to) continue
    if (state.neighborhood && !state.neighborhood.has(edge.sourcePageId) && !state.neighborhood.has(edge.destinationPageId)) continue
    const stroke = edgeStroke(edge)
    ctx.beginPath()
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 0.45 * state.appear
    ctx.lineWidth = stroke.width
    ctx.setLineDash(stroke.dash)
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    if (state.particles) drawParticle(ctx, from, to, state.now, edge.id)
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  now: number,
  id: string,
) {
  const seed = hashString(id) % 1000
  const t = ((now / 1000 + seed / 200) % PARTICLE_SECONDS) / PARTICLE_SECONDS
  const x = lerp(from.x, to.x, t)
  const y = lerp(from.y, to.y, t)
  ctx.beginPath()
  ctx.fillStyle = 'rgba(186,230,253,0.9)'
  ctx.arc(x, y, 1.6, 0, Math.PI * 2)
  ctx.fill()
}

function drawNodes(ctx: CanvasRenderingContext2D, state: DrawState, projected: ReturnType<typeof projectLayout>, connected: Set<string>) {
  const query = state.search.trim().toLowerCase()
  const sorted = [...projected.values()].sort((a, b) => b.z - a.z)
  for (const point of sorted) {
    const node = state.graph.nodes.find((item) => item.id === point.id)
    if (!node || !nodeVisible(node, state.filters, connected)) continue
    if (state.neighborhood && !state.neighborhood.has(node.id)) continue
    const radius = nodeRadius(node, node.id === state.selectedId) * point.scale * state.appear
    ctx.beginPath()
    ctx.fillStyle = nodeFill(node)
    ctx.globalAlpha = node.id === state.hoverId || node.id === state.selectedId ? 1 : 0.88
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
    if (node.health === 'broken') {
      ctx.strokeStyle = '#fecaca'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    if (state.filters.labels || node.pageType === 'home' || node.id === state.selectedId || matchesQuery(node, query)) {
      ctx.fillStyle = 'rgba(244,244,245,0.86)'
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText(nodeLabel(node), point.x + radius + 3, point.y + 3)
    }
  }
}

function matchesQuery(node: PageNode, query: string): boolean {
  if (!query) return false
  return node.url.toLowerCase().includes(query) || node.title.toLowerCase().includes(query)
}

function nodeLabel(node: PageNode): string {
  if (node.title) return node.title.slice(0, 28)
  try {
    return new URL(node.url).pathname || '/'
  } catch {
    return node.url.slice(0, 28)
  }
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0
  return Math.abs(hash)
}

function GraphTooltip({ node }: { node: PageNode }) {
  const { t } = useTranslation()
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg border border-white/10 bg-zinc-900/90 px-2.5 py-2 text-[11px] text-zinc-100 shadow-lg">
      <p className="truncate font-medium">{node.title || node.url}</p>
      <p className="truncate text-zinc-400">{node.url}</p>
      <p className="mt-1 text-zinc-300">
        {t(`web.links.pageType.${node.pageType}`)} · {t('web.links.incomingCount', { count: node.incomingCount })} ·{' '}
        {t('web.links.outgoingCount', { count: node.outgoingCount })}
      </p>
    </div>
  )
}

function GraphNodeList({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: PageNode[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { t } = useTranslation()
  return (
    <ul className="sr-only" aria-label={t('web.links.graph.pages')}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button type="button" aria-current={node.id === selectedId ? 'true' : undefined} onClick={() => onSelect(node.id)}>
            {node.title || node.url}
          </button>
        </li>
      ))}
    </ul>
  )
}

function currentProjection(
  canvas: HTMLCanvasElement,
  points: ReturnType<typeof layoutLinkGraph>,
  angleRef: { current: number },
  zoomRef: { current: number },
  panRef: { current: Vec3 },
  offsets: Map<string, Vec3>,
) {
  const projected = projectLayout(points, angleRef.current, canvas.clientWidth, canvas.clientHeight, zoomRef.current, panRef.current)
  applyOffsets(projected, offsets)
  return projected
}

function onPointer(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement | null,
  points: ReturnType<typeof layoutLinkGraph>,
  angleRef: { current: number },
  zoomRef: { current: number },
  panRef: { current: Vec3 },
  offsets: Map<string, Vec3>,
  onSelect: (id: string | null) => void,
  setHover: (node: PageNode | null) => void,
  hoverRef: { current: string | null },
  graph: LinkGraph,
) {
  if (!canvas) return
  const projected = currentProjection(canvas, points, angleRef, zoomRef, panRef, offsets)
  const id = hitTest(projected, event.nativeEvent.offsetX, event.nativeEvent.offsetY)
  if (id) {
    onSelect(id)
    hoverRef.current = id
    setHover(graph.nodes.find((node) => node.id === id) ?? null)
    startNodeDrag(event, id, offsets)
    return
  }
  const originX = event.clientX
  const originY = event.clientY
  const startPan = { ...panRef.current }
  const move = (next: PointerEvent) => {
    panRef.current = { x: startPan.x + (next.clientX - originX), y: startPan.y + (next.clientY - originY), z: 0 }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function startNodeDrag(event: React.PointerEvent<HTMLCanvasElement>, id: string, offsets: Map<string, Vec3>) {
  const originX = event.clientX
  const originY = event.clientY
  const start = offsets.get(id) ?? { x: 0, y: 0, z: 0 }
  const move = (next: PointerEvent) => {
    offsets.set(id, { x: start.x + (next.clientX - originX), y: start.y + (next.clientY - originY), z: 0 })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onMove(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement | null,
  points: ReturnType<typeof layoutLinkGraph>,
  angleRef: { current: number },
  zoomRef: { current: number },
  panRef: { current: Vec3 },
  offsets: Map<string, Vec3>,
  setHover: (node: PageNode | null) => void,
  hoverRef: { current: string | null },
  graph: LinkGraph,
) {
  if (!canvas) return
  const projected = currentProjection(canvas, points, angleRef, zoomRef, panRef, offsets)
  const id = hitTest(projected, event.nativeEvent.offsetX, event.nativeEvent.offsetY)
  hoverRef.current = id
  setHover(id ? graph.nodes.find((node) => node.id === id) ?? null : null)
}
