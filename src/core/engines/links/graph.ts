import { crawlKey } from '@/core/engines/htmlArchive/crawl'
import { classifyResult, type LinkHealth } from '@/core/engines/linkChecker/report'
import type { LinkCheckResult } from '@/core/engines/linkChecker/check'
import {
  classifyHref,
  hasRelFlag,
  type LinkKind,
  type LinkSection,
  type LinkTextSource,
  type PageLink,
  type PageLinksSnapshot,
} from './pageLinks'
import { classifyPageType, type PageType } from './pageType'
import { applyGraphMetrics } from './graphMetrics'

export type NodeHealth = LinkHealth | 'unchecked'
export type OrphanConfidence = 'isolated' | 'crawl-incomplete' | 'none'

export interface PageNode {
  id: string
  url: string
  normalizedUrl: string
  title: string
  pageType: PageType
  isExternal: boolean
  fetched: boolean
  status: number | null
  health: NodeHealth
  crawlDepth: number | null
  linkDepth: number | null
  incomingCount: number
  outgoingCount: number
  externalOutgoingCount: number
  brokenCount: number
  isOrphan: boolean
  orphanConfidence: OrphanConfidence
  importance: number
  canonical: string | null
  robots: string | null
  lastCrawledAt: number | null
  seededFromSitemap: boolean
  robotsBlocked: boolean
}

export interface LinkOccurrence {
  anchorText: string
  textSource: LinkTextSource
  section: LinkSection
  rawHref: string
  rel: string[]
  newTab: boolean
  hasImage: boolean
}

export interface LinkEdge {
  id: string
  sourcePageId: string
  destinationPageId: string | null
  destinationUrl: string
  anchorText: string
  textSource: LinkTextSource
  linkType: LinkKind
  relAttributes: string[]
  nofollow: boolean
  sponsored: boolean
  ugc: boolean
  target: string | null
  destinationStatus: number | null
  destinationHealth: NodeHealth
  occurrenceCount: number
  occurrences: LinkOccurrence[]
}

export interface LinkGraphStats {
  pages: number
  fetchedPages: number
  internalLinks: number
  externalLinks: number
  uniqueDestinations: number
  brokenDestinations: number
  orphanPages: number
  nofollowLinks: number
  emptyAnchors: number
  incomplete: boolean
}

export interface LinkGraph {
  startUrl: string
  homepageId: string
  nodes: PageNode[]
  edges: LinkEdge[]
  stats: LinkGraphStats
  incomplete: boolean
}

export interface GraphPageInput {
  url: string
  title?: string
  crawlDepth: number
  fetched: boolean
  snapshot?: PageLinksSnapshot
  canonical?: string | null
  robots?: string | null
  status?: number | null
  lastCrawledAt?: number | null
  seededFromSitemap?: boolean
  robotsBlocked?: boolean
}

export interface BuildLinkGraphOptions {
  startUrl: string
  keepQuery?: boolean
  incomplete?: boolean
}

export function graphPageKey(url: string, keepQuery = false): string {
  if (!keepQuery) return crawlKey(url)
  try {
    const parsed = new URL(url)
    return `${crawlKey(url)}${parsed.search}`
  } catch {
    return url.split('#')[0]
  }
}

export function graphPagesFromSnapshot(snapshot: PageLinksSnapshot): GraphPageInput[] {
  return [
    {
      url: snapshot.url,
      title: snapshot.title,
      crawlDepth: 0,
      fetched: true,
      snapshot,
      canonical: snapshot.canonical,
      robots: snapshot.robots,
      lastCrawledAt: Date.now(),
    },
  ]
}

export function buildLinkGraph(pages: GraphPageInput[], options: BuildLinkGraphOptions): LinkGraph {
  const keepQuery = options.keepQuery === true
  const startKey = graphPageKey(options.startUrl, keepQuery)
  const nodes = new Map<string, PageNode>()
  const edges = new Map<string, LinkEdge>()
  for (const page of pages) upsertFetchedNode(nodes, page, keepQuery)
  for (const page of pages) {
    if (page.fetched && page.snapshot) ingestSnapshot(nodes, edges, page, keepQuery)
  }
  applyGraphMetrics(nodes, edges, startKey, options.incomplete === true)
  const nodeList = [...nodes.values()]
  const edgeList = [...edges.values()]
  return {
    startUrl: options.startUrl,
    homepageId: nodes.get(startKey)?.id ?? startKey,
    nodes: nodeList,
    edges: edgeList,
    stats: summarizeGraph(nodeList, edgeList, options.incomplete === true),
    incomplete: options.incomplete === true,
  }
}

export function applyLinkHealth(
  graph: LinkGraph,
  lookup: (url: string) => LinkCheckResult | undefined,
): LinkGraph {
  const healthByUrl = new Map<string, { status: number | null; health: NodeHealth }>()
  const nodes = graph.nodes.map((node) => {
    const checked = healthFromLookup(node.url, lookup)
    healthByUrl.set(node.id, checked)
    return { ...node, status: checked.status, health: checked.health }
  })
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges = graph.edges.map((edge) => withEdgeHealth(edge, lookup, healthByUrl))
  for (const node of nodes) node.brokenCount = 0
  for (const edge of edges) {
    const source = byId.get(edge.sourcePageId)
    if (source && edge.destinationHealth === 'broken') source.brokenCount += 1
  }
  return {
    ...graph,
    nodes,
    edges,
    stats: summarizeGraph(nodes, edges, graph.incomplete),
  }
}

export function isConfirmedBroken(health: NodeHealth): boolean {
  return health === 'broken'
}

function upsertFetchedNode(nodes: Map<string, PageNode>, page: GraphPageInput, keepQuery: boolean) {
  const id = graphPageKey(page.url, keepQuery)
  const existing = nodes.get(id)
  const snapshot = page.snapshot
  nodes.set(
    id,
    makeNode({
      id,
      url: snapshot?.url ?? page.url,
      title: snapshot?.title || page.title || existing?.title || '',
      isExternal: false,
      fetched: page.fetched || Boolean(existing?.fetched),
      crawlDepth: page.crawlDepth,
      canonical: page.canonical ?? snapshot?.canonical ?? existing?.canonical ?? null,
      robots: page.robots ?? snapshot?.robots ?? existing?.robots ?? null,
      status: page.status ?? existing?.status ?? null,
      lastCrawledAt: page.lastCrawledAt ?? existing?.lastCrawledAt ?? null,
      seededFromSitemap: page.seededFromSitemap || Boolean(existing?.seededFromSitemap),
      robotsBlocked: page.robotsBlocked || Boolean(existing?.robotsBlocked),
    }),
  )
}

function ingestSnapshot(
  nodes: Map<string, PageNode>,
  edges: Map<string, LinkEdge>,
  page: GraphPageInput,
  keepQuery: boolean,
) {
  const sourceId = graphPageKey(page.url, keepQuery)
  const snapshot = page.snapshot
  if (!snapshot) return
  for (const link of snapshot.links) addLinkEdge(nodes, edges, sourceId, snapshot.url, link, keepQuery)
}

function addLinkEdge(
  nodes: Map<string, PageNode>,
  edges: Map<string, LinkEdge>,
  sourceId: string,
  pageUrl: string,
  link: PageLink,
  keepQuery: boolean,
) {
  const destId = destinationId(link, pageUrl, keepQuery)
  if (destId && link.kind === 'internal') ensureLinkedNode(nodes, destId, link.href, false)
  if (destId && link.kind === 'external') ensureLinkedNode(nodes, destId, link.href, true)
  const key = `${sourceId}|${destId ?? link.href}|${link.kind}|${relKey(link.rel)}`
  const occurrence = toOccurrence(link)
  const existing = edges.get(key)
  if (existing) {
    existing.occurrences.push(occurrence)
    existing.occurrenceCount = existing.occurrences.length
    if (!existing.anchorText && occurrence.anchorText) existing.anchorText = occurrence.anchorText
    return
  }
  edges.set(key, createEdge(key, sourceId, destId, link, occurrence))
}

function createEdge(
  id: string,
  sourcePageId: string,
  destinationPageId: string | null,
  link: PageLink,
  occurrence: LinkOccurrence,
): LinkEdge {
  return {
    id,
    sourcePageId,
    destinationPageId,
    destinationUrl: link.href,
    anchorText: occurrence.anchorText,
    textSource: link.textSource,
    linkType: link.kind,
    relAttributes: link.rel,
    nofollow: hasRelFlag(link.rel, 'nofollow'),
    sponsored: hasRelFlag(link.rel, 'sponsored'),
    ugc: hasRelFlag(link.rel, 'ugc'),
    target: link.newTab ? '_blank' : null,
    destinationStatus: null,
    destinationHealth: 'unchecked',
    occurrenceCount: 1,
    occurrences: [occurrence],
  }
}

function destinationId(link: PageLink, pageUrl: string, keepQuery: boolean): string | null {
  if (link.kind !== 'internal' && link.kind !== 'external') return null
  const absolute = link.href || link.rawHref
  const kind = classifyHref(link.rawHref, absolute, pageUrl)
  if (kind !== 'internal' && kind !== 'external') return null
  try {
    return graphPageKey(absolute, keepQuery)
  } catch {
    return null
  }
}

function ensureLinkedNode(nodes: Map<string, PageNode>, id: string, url: string, isExternal: boolean) {
  if (nodes.has(id)) return
  nodes.set(
    id,
    makeNode({
      id,
      url,
      title: '',
      isExternal,
      fetched: false,
      crawlDepth: null,
      canonical: null,
      robots: null,
      status: null,
      lastCrawledAt: null,
      seededFromSitemap: false,
      robotsBlocked: false,
    }),
  )
}

function makeNode(input: {
  id: string
  url: string
  title: string
  isExternal: boolean
  fetched: boolean
  crawlDepth: number | null
  canonical: string | null
  robots: string | null
  status: number | null
  lastCrawledAt: number | null
  seededFromSitemap: boolean
  robotsBlocked: boolean
}): PageNode {
  return {
    id: input.id,
    url: input.url,
    normalizedUrl: input.id,
    title: input.title,
    pageType: input.isExternal ? 'content' : classifyPageType(input.url),
    isExternal: input.isExternal,
    fetched: input.fetched,
    status: input.status,
    health: 'unchecked',
    crawlDepth: input.crawlDepth,
    linkDepth: null,
    incomingCount: 0,
    outgoingCount: 0,
    externalOutgoingCount: 0,
    brokenCount: 0,
    isOrphan: false,
    orphanConfidence: 'none',
    importance: 0,
    canonical: input.canonical,
    robots: input.robots,
    lastCrawledAt: input.lastCrawledAt,
    seededFromSitemap: input.seededFromSitemap,
    robotsBlocked: input.robotsBlocked,
  }
}

function toOccurrence(link: PageLink): LinkOccurrence {
  return {
    anchorText: link.text,
    textSource: link.textSource,
    section: link.section,
    rawHref: link.rawHref,
    rel: link.rel,
    newTab: link.newTab,
    hasImage: link.hasImage,
  }
}

function relKey(rel: string[]): string {
  return ['nofollow', 'sponsored', 'ugc'].filter((token) => rel.includes(token)).join('.')
}

function healthFromLookup(url: string, lookup: (href: string) => LinkCheckResult | undefined) {
  const result = lookup(url)
  if (!result) return { status: null as number | null, health: 'unchecked' as NodeHealth }
  return { status: result.status, health: classifyResult(result) }
}

function withEdgeHealth(
  edge: LinkEdge,
  lookup: (url: string) => LinkCheckResult | undefined,
  nodeHealth: Map<string, { status: number | null; health: NodeHealth }>,
): LinkEdge {
  const fromNode = edge.destinationPageId ? nodeHealth.get(edge.destinationPageId) : undefined
  const checked = fromNode ?? healthFromLookup(edge.destinationUrl, lookup)
  return { ...edge, destinationStatus: checked.status, destinationHealth: checked.health }
}

export function summarizeGraph(nodes: PageNode[], edges: LinkEdge[], incomplete: boolean): LinkGraphStats {
  const dests = new Set(edges.map((edge) => edge.destinationUrl))
  return {
    pages: nodes.filter((node) => !node.isExternal).length,
    fetchedPages: nodes.filter((node) => node.fetched && !node.isExternal).length,
    internalLinks: edges.filter((edge) => edge.linkType === 'internal').reduce(countOccurrences, 0),
    externalLinks: edges.filter((edge) => edge.linkType === 'external').reduce(countOccurrences, 0),
    uniqueDestinations: dests.size,
    brokenDestinations: nodes.filter((node) => node.health === 'broken').length,
    orphanPages: nodes.filter((node) => node.isOrphan).length,
    nofollowLinks: edges.filter((edge) => edge.nofollow).reduce(countOccurrences, 0),
    emptyAnchors: edges.reduce((sum, edge) => sum + edge.occurrences.filter((item) => !item.anchorText.trim()).length, 0),
    incomplete,
  }
}

function countOccurrences(sum: number, edge: LinkEdge): number {
  return sum + edge.occurrenceCount
}
