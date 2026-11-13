import type { LinkEdge, OrphanConfidence, PageNode } from './graph'

const INBOUND_WEIGHT = 3
const OUTBOUND_WEIGHT = 0.5
const PROXIMITY_WEIGHT = 2
const PROXIMITY_DEPTH_CAP = 6

export function applyGraphMetrics(
  nodes: Map<string, PageNode>,
  edges: Map<string, LinkEdge>,
  startKey: string,
  incomplete: boolean,
) {
  resetCounts(nodes)
  tallyEdges(nodes, edges)
  assignLinkDepths(nodes, edges, startKey)
  markOrphans(nodes, startKey, incomplete)
  assignImportance(nodes)
}

function resetCounts(nodes: Map<string, PageNode>) {
  for (const node of nodes.values()) {
    node.incomingCount = 0
    node.outgoingCount = 0
    node.externalOutgoingCount = 0
    node.brokenCount = 0
    node.linkDepth = null
    node.isOrphan = false
    node.orphanConfidence = 'none'
    node.importance = 0
  }
}

function tallyEdges(nodes: Map<string, PageNode>, edges: Map<string, LinkEdge>) {
  for (const edge of edges.values()) {
    const source = nodes.get(edge.sourcePageId)
    if (source && edge.linkType === 'internal') source.outgoingCount += edge.occurrenceCount
    if (source && edge.linkType === 'external') source.externalOutgoingCount += edge.occurrenceCount
    if (edge.linkType !== 'internal' || !edge.destinationPageId) continue
    const dest = nodes.get(edge.destinationPageId)
    if (dest) dest.incomingCount += edge.occurrenceCount
  }
}

function assignLinkDepths(nodes: Map<string, PageNode>, edges: Map<string, LinkEdge>, startKey: string) {
  const start = nodes.get(startKey)
  if (!start) return
  start.linkDepth = 0
  const adjacency = internalAdjacency(edges)
  const queue = [startKey]
  while (queue.length > 0) {
    const current = queue.shift()!
    const depth = nodes.get(current)?.linkDepth
    if (depth == null) continue
    for (const next of adjacency.get(current) ?? []) {
      const node = nodes.get(next)
      if (!node || node.linkDepth != null) continue
      node.linkDepth = depth + 1
      queue.push(next)
    }
  }
}

function internalAdjacency(edges: Map<string, LinkEdge>): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges.values()) {
    if (edge.linkType !== 'internal' || !edge.destinationPageId) continue
    const list = adjacency.get(edge.sourcePageId)
    if (list) list.push(edge.destinationPageId)
    else adjacency.set(edge.sourcePageId, [edge.destinationPageId])
  }
  return adjacency
}

function markOrphans(nodes: Map<string, PageNode>, startKey: string, incomplete: boolean) {
  const confidence: OrphanConfidence = incomplete ? 'crawl-incomplete' : 'isolated'
  for (const node of nodes.values()) {
    if (node.isExternal || !node.fetched || node.id === startKey) continue
    if (node.incomingCount > 0) continue
    node.isOrphan = true
    node.orphanConfidence = confidence
  }
}

function assignImportance(nodes: Map<string, PageNode>) {
  const scores = [...nodes.values()].filter((node) => !node.isExternal).map((node) => ({ node, score: rawImportance(node) }))
  const max = Math.max(1, ...scores.map((entry) => entry.score))
  for (const entry of scores) entry.node.importance = Math.round((entry.score / max) * 100)
}

function rawImportance(node: PageNode): number {
  const proximity = node.linkDepth == null ? 0 : Math.max(0, PROXIMITY_DEPTH_CAP - node.linkDepth)
  return node.incomingCount * INBOUND_WEIGHT + node.outgoingCount * OUTBOUND_WEIGHT + proximity * PROXIMITY_WEIGHT
}
