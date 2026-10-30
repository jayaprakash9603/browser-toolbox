import { categoryOrder } from './categories'
import { TECH_RULES } from './rules'
import type {
  ConfidenceLevel,
  EvidenceItem,
  EvidenceType,
  PageSignals,
  TechCategoryId,
  TechHit,
  TechRule,
} from './types'

export const DETECTION_ENGINE_VERSION = 2

const MAX_EVIDENCE_LENGTH = 120
const MAX_VERSION_LENGTH = 24
const CHANNEL_BOOST = 0.04
const HTML_ONLY_MIN = 0.4
const IMPLIED_CONFIDENCE = 0.5

const CHANNEL_WEIGHT: Record<Exclude<EvidenceType, 'implied'>, number> = {
  js: 0.95,
  header: 0.9,
  meta: 0.9,
  protocol: 0.9,
  url: 0.85,
  inline: 0.85,
  cookie: 0.7,
  'page-url': 0.7,
  dom: 0.65,
  html: 0.4,
}

const VERSION_CHANNELS = new Set<EvidenceType>(['js', 'header', 'meta', 'url', 'inline'])

type Match = { type: EvidenceType; evidence: string; version?: string }
type KeyedPattern = [key: string, pattern: RegExp | null]

interface CompiledRule {
  rule: TechRule
  src: RegExp[]
  url: RegExp[]
  inline: RegExp[]
  html: RegExp[]
  cookies: RegExp[]
  meta: KeyedPattern[]
  headers: KeyedPattern[]
  js: KeyedPattern[]
}

function toRegex(source: string): RegExp | null {
  try {
    return new RegExp(source, 'i')
  } catch {
    return null
  }
}

function compileList(sources: string[] | undefined): RegExp[] {
  return (sources ?? []).flatMap((source) => toRegex(source) ?? [])
}

function compileMap(map: Record<string, string> | undefined, lowerCaseKeys: boolean): KeyedPattern[] {
  const entries: KeyedPattern[] = []
  for (const [key, source] of Object.entries(map ?? {})) {
    const pattern = source === '' ? null : toRegex(source)
    if (source !== '' && !pattern) continue
    entries.push([lowerCaseKeys ? key.toLowerCase() : key, pattern])
  }
  return entries
}

function compileRule(rule: TechRule): CompiledRule {
  return {
    rule,
    src: compileList(rule.src),
    url: compileList(rule.url),
    inline: compileList(rule.inline),
    html: compileList(rule.html),
    cookies: compileList(rule.cookies),
    meta: compileMap(rule.meta, true),
    headers: compileMap(rule.headers, true),
    js: compileMap(rule.js, false),
  }
}

const COMPILED = TECH_RULES.map(compileRule)
const RULES_BY_NAME = new Map(TECH_RULES.map((rule) => [rule.name, rule]))

function truncate(text: string): string {
  return text.length > MAX_EVIDENCE_LENGTH ? `${text.slice(0, MAX_EVIDENCE_LENGTH)}…` : text
}

function matchPatterns(patterns: RegExp[], texts: string[], type: EvidenceType, label: string): Match | null {
  let first: Match | null = null
  for (const pattern of patterns) {
    for (const text of texts) {
      const found = pattern.exec(text)
      if (!found) continue
      const shown = label === 'html' ? found[0] : text
      const match: Match = { type, evidence: `${label}: ${truncate(shown)}`, version: found.groups?.v }
      if (match.version) return match
      first ??= match
    }
  }
  return first
}

function matchKeyed(
  entries: KeyedPattern[],
  values: Record<string, string>,
  type: EvidenceType,
  label: string,
): Match | null {
  for (const [key, pattern] of entries) {
    const value = values[key]
    if (value === undefined) continue
    if (!pattern) return { type, evidence: `${label}: ${key}` }
    const found = pattern.exec(value)
    if (found) return { type, evidence: `${label}: ${key}`, version: found.groups?.v }
  }
  return null
}

function matchRule(compiled: CompiledRule, signals: PageSignals): Match[] {
  const { rule } = compiled
  const resourceUrls = [...signals.scripts, ...signals.resources]
  const matches = [
    matchPatterns(compiled.src, resourceUrls, 'url', 'url'),
    matchPatterns(compiled.url, [signals.url], 'page-url', 'page url'),
    matchPatterns(compiled.inline, [signals.inlineScripts], 'inline', 'inline script'),
    matchPatterns(compiled.html, [signals.html], 'html', 'html'),
    matchPatterns(compiled.cookies, signals.cookies, 'cookie', 'cookie'),
    matchKeyed(compiled.meta, signals.meta, 'meta', 'meta'),
    matchKeyed(compiled.headers, signals.headers, 'header', 'header'),
    matchKeyed(compiled.js, signals.jsValues, 'js', 'js'),
  ]
  const selector = rule.dom?.find((candidate) => signals.domMatches.includes(candidate))
  if (selector) matches.push({ type: 'dom', evidence: `dom: ${selector}` })
  if (rule.protocol && signals.protocol === rule.protocol) {
    matches.push({ type: 'protocol', evidence: `protocol: ${rule.protocol}` })
  }
  return matches.filter((match): match is Match => match !== null)
}

function displayVersion(rule: TechRule, version: string | undefined): string | undefined {
  if (!version) return undefined
  const label = rule.versionLabels?.[version] ?? rule.versionLabels?.[version.toUpperCase()]
  return (label ?? version).slice(0, MAX_VERSION_LENGTH)
}

export function confidenceLevelFor(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'high'
  if (score >= 0.6) return 'medium'
  return 'low'
}

function scoreMatches(matches: Match[]): number {
  const types = new Set(matches.map((match) => match.type))
  const peak = Math.max(...matches.map((match) => CHANNEL_WEIGHT[match.type as Exclude<EvidenceType, 'implied'>] ?? 0))
  return Math.min(1, peak + Math.max(0, types.size - 1) * CHANNEL_BOOST)
}

function resolveVersion(rule: TechRule, matches: Match[]): { version?: string; conflict?: string } {
  const quality = matches
    .filter((match) => match.version && VERSION_CHANNELS.has(match.type))
    .map((match) => displayVersion(rule, match.version))
    .filter((version): version is string => Boolean(version))
  const unique = [...new Set(quality)]
  if (unique.length > 1) return { conflict: unique.join(' vs ') }
  if (unique.length === 1) return { version: unique[0] }
  const fallback = matches.find((match) => match.version)
  return { version: displayVersion(rule, fallback?.version) }
}

function buildHit(rule: TechRule, matches: Match[]): TechHit | null {
  const confidence = scoreMatches(matches)
  const types = new Set(matches.map((match) => match.type))
  if (types.size === 1 && types.has('html') && confidence < HTML_ONLY_MIN) return null

  const { version, conflict } = resolveVersion(rule, matches)
  const evidenceItems: EvidenceItem[] = matches.map((match) => ({ type: match.type, detail: match.evidence }))
  if (conflict) evidenceItems.push({ type: matches[0].type, detail: `version conflict: ${conflict}` })

  return {
    name: rule.name,
    category: rule.category,
    version: conflict ? undefined : version,
    evidence: matches[0].evidence,
    evidenceItems,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    website: rule.website,
    description: rule.description,
  }
}

function applyExcludes(hits: Map<string, TechHit>): void {
  for (const name of [...hits.keys()]) {
    const excludedBy = RULES_BY_NAME.get(name)?.excludes?.find((other) => hits.has(other))
    if (excludedBy) hits.delete(name)
  }
}

function addImplied(hits: Map<string, TechHit>): void {
  const queue = [...hits.values()]
  for (const source of queue) {
    for (const name of RULES_BY_NAME.get(source.name)?.implies ?? []) {
      const rule = RULES_BY_NAME.get(name)
      if (!rule || hits.has(name)) continue
      const evidence = `implied by ${source.name}`
      const implied: TechHit = {
        name,
        category: rule.category,
        evidence,
        evidenceItems: [{ type: 'implied', detail: evidence }],
        confidence: IMPLIED_CONFIDENCE,
        confidenceLevel: confidenceLevelFor(IMPLIED_CONFIDENCE),
        website: rule.website,
        description: rule.description,
        implied: true,
      }
      hits.set(name, implied)
      queue.push(implied)
    }
  }
}

export function detectTechnologies(signals: PageSignals): TechHit[] {
  const hits = new Map<string, TechHit>()
  for (const compiled of COMPILED) {
    const matches = matchRule(compiled, signals)
    if (matches.length === 0) continue
    const hit = buildHit(compiled.rule, matches)
    if (hit) hits.set(compiled.rule.name, hit)
  }
  applyExcludes(hits)
  addImplied(hits)
  return [...hits.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export interface TechGroup {
  category: TechCategoryId
  hits: TechHit[]
}

export function groupHitsByCategory(hits: TechHit[]): TechGroup[] {
  const groups = new Map<TechCategoryId, TechHit[]>()
  for (const hit of hits) groups.set(hit.category, [...(groups.get(hit.category) ?? []), hit])
  return [...groups.entries()]
    .map(([category, list]) => ({ category, hits: list }))
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category))
}

/** Every window path and CSS selector the page collector has to look up. */
export function collectLookups(): { jsPaths: string[]; selectors: string[] } {
  const jsPaths = new Set<string>()
  const selectors = new Set<string>()
  for (const rule of TECH_RULES) {
    for (const path of Object.keys(rule.js ?? {})) jsPaths.add(path)
    for (const selector of rule.dom ?? []) selectors.add(selector)
  }
  return { jsPaths: [...jsPaths], selectors: [...selectors] }
}

export const TECH_RULE_COUNT = TECH_RULES.length
