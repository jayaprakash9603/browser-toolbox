import type { LinkEdge, LinkGraph, LinkOccurrence } from './graph'

export interface AnchorInsight {
  text: string
  count: number
  uniqueDestinations: number
  uniqueSources: number
  empty: boolean
  generic: boolean
  branded: boolean
  imageMissingAlt: boolean
  destinations: string[]
  sources: string[]
}

export interface AnchorReport {
  total: number
  unique: number
  empty: number
  generic: number
  repeated: number
  imageMissingAlt: number
  branded: number
  insights: AnchorInsight[]
}

const GENERIC_ANCHORS = new Set([
  'click here',
  'click',
  'here',
  'read more',
  'learn more',
  'more',
  'more info',
  'continue',
  'continue reading',
  'this link',
  'link',
  'website',
  'page',
])

export function analyzeAnchorText(graph: LinkGraph, brandTerms: string[] = []): AnchorReport {
  const brands = new Set(brandTerms.map((term) => term.toLowerCase()).filter(Boolean))
  const grouped = new Map<string, AnchorInsight>()
  for (const edge of graph.edges) {
    for (const occurrence of edge.occurrences) {
      addOccurrence(grouped, edge, occurrence, brands)
    }
  }
  const insights = [...grouped.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
  return {
    total: insights.reduce((sum, item) => sum + item.count, 0),
    unique: insights.length,
    empty: insights.filter((item) => item.empty).reduce((sum, item) => sum + item.count, 0),
    generic: insights.filter((item) => item.generic).reduce((sum, item) => sum + item.count, 0),
    repeated: insights.filter((item) => item.count > 1).length,
    imageMissingAlt: insights.filter((item) => item.imageMissingAlt).reduce((sum, item) => sum + item.count, 0),
    branded: insights.filter((item) => item.branded).reduce((sum, item) => sum + item.count, 0),
    insights,
  }
}

export function isGenericAnchor(text: string): boolean {
  return GENERIC_ANCHORS.has(text.trim().toLowerCase())
}

function addOccurrence(
  grouped: Map<string, AnchorInsight>,
  edge: LinkEdge,
  occurrence: LinkOccurrence,
  brands: Set<string>,
) {
  const text = occurrence.anchorText.trim()
  const key = text.toLowerCase()
  const empty = text.length === 0
  const imageMissingAlt = occurrence.hasImage && empty
  const existing = grouped.get(key)
  if (existing) {
    existing.count += 1
    addUnique(existing.destinations, edge.destinationUrl)
    addUnique(existing.sources, edge.sourcePageId)
    existing.uniqueDestinations = existing.destinations.length
    existing.uniqueSources = existing.sources.length
    existing.imageMissingAlt = existing.imageMissingAlt || imageMissingAlt
    return
  }
  grouped.set(key, {
    text,
    count: 1,
    uniqueDestinations: 1,
    uniqueSources: 1,
    empty,
    generic: isGenericAnchor(text),
    branded: isBranded(text, brands),
    imageMissingAlt,
    destinations: [edge.destinationUrl],
    sources: [edge.sourcePageId],
  })
}

function isBranded(text: string, brands: Set<string>): boolean {
  if (brands.size === 0 || !text) return false
  const lower = text.toLowerCase()
  for (const brand of brands) {
    if (brand && lower.includes(brand)) return true
  }
  return false
}

function addUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value)
}

export function brandTermsFromGraph(graph: LinkGraph): string[] {
  const terms = new Set<string>()
  try {
    const host = new URL(graph.startUrl).hostname.replace(/^www\./, '')
    const name = host.split('.')[0]
    if (name) terms.add(name)
  } catch {
    /* invalid start */
  }
  const home = graph.nodes.find((node) => node.id === graph.homepageId)
  const title = home?.title.trim().split(/\s+/).filter((part) => part.length > 2)[0]
  if (title) terms.add(title.toLowerCase())
  return [...terms]
}
