import type { LinkEdge, NodeHealth, PageNode } from '@/core/engines/links/graph'

export interface GraphFilters {
  internal: boolean
  external: boolean
  broken: boolean
  nofollow: boolean
  types: boolean
  labels: boolean
}

export const DEFAULT_GRAPH_FILTERS: GraphFilters = {
  internal: true,
  external: true,
  broken: true,
  nofollow: true,
  types: true,
  labels: true,
}

export function nodeFill(node: PageNode): string {
  if (node.health === 'broken') return '#ef4444'
  if (node.isOrphan) return '#94a3b8'
  if (node.isExternal) return '#64748b'
  if (node.pageType === 'home') return '#38bdf8'
  if (node.pageType === 'category') return '#a78bfa'
  if (node.pageType === 'blog') return '#22d3ee'
  if (node.pageType === 'product') return '#34d399'
  return '#60a5fa'
}

export function nodeRadius(node: PageNode, selected: boolean): number {
  const base = node.pageType === 'home' ? 7 : node.pageType === 'category' ? 5.5 : 4
  const sized = base + Math.min(5, Math.sqrt(Math.max(0, node.incomingCount)))
  return selected ? sized + 1.5 : sized
}

export function edgeStroke(edge: LinkEdge): { color: string; dash: number[]; width: number } {
  if (edge.destinationHealth === 'broken') return { color: '#ef4444', dash: [], width: 2.2 }
  if (edge.linkType === 'external') return { color: '#94a3b8', dash: [1.5, 3], width: 1 }
  if (edge.nofollow || edge.sponsored || edge.ugc) return { color: '#f59e0b', dash: [5, 4], width: 1.2 }
  if (edge.occurrences.some((item) => item.section === 'nav' || item.section === 'header')) {
    return { color: '#a78bfa', dash: [], width: 1.4 }
  }
  if (edge.destinationHealth === 'ok') return { color: '#34d399', dash: [], width: 1.15 }
  return { color: '#38bdf8', dash: [], width: 1.15 }
}

export function edgeVisible(edge: LinkEdge, filters: GraphFilters): boolean {
  if (edge.linkType === 'internal' && !filters.internal) return false
  if (edge.linkType === 'external' && !filters.external) return false
  if ((edge.nofollow || edge.sponsored || edge.ugc) && !filters.nofollow) return false
  if (edge.destinationHealth === 'broken' && !filters.broken) return false
  return edge.linkType === 'internal' || edge.linkType === 'external'
}

export function nodeVisible(node: PageNode, filters: GraphFilters, connected: Set<string>): boolean {
  if (node.health === 'broken' && !filters.broken) return false
  if (node.isExternal && !filters.external) return false
  if (!node.isExternal && !filters.internal && node.pageType !== 'home') return false
  if (!filters.types && node.pageType !== 'home' && node.pageType !== 'content') return false
  return connected.has(node.id) || node.fetched || node.isOrphan || node.pageType === 'home'
}

export function healthTone(health: NodeHealth): string {
  if (health === 'broken') return 'text-red-600 dark:text-red-400'
  if (health === 'redirect' || health === 'blocked' || health === 'server') return 'text-amber-600 dark:text-amber-400'
  if (health === 'timeout' || health === 'network' || health === 'unchecked') return 'text-muted-foreground'
  return 'text-emerald-600 dark:text-emerald-400'
}

export const SIDEBAR_NODE_CAP = 250
export const DIALOG_NODE_CAP = 800
export const PARTICLE_NODE_CAP = 150
export const ROTATION_SECONDS = 45
export const PARTICLE_SECONDS = 5
export const NODE_APPEAR_MS = 700
