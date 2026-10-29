import { categoryOrder } from './categories'
import { TECH_RULES } from './rules'
import type { PageSignals, TechCategoryId, TechHit, TechRule } from './types'

const MAX_EVIDENCE_LENGTH = 120
const MAX_VERSION_LENGTH = 24

type Match = { evidence: string; version?: string }
type KeyedPattern = [key: string, pattern: RegExp | null]

interface CompiledRule {
  rule: TechRule
  src: RegExp[]
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

function matchPatterns(patterns: RegExp[], texts: string[], label: string): Match | null {
  let first: Match | null = null
  for (const pattern of patterns) {
    for (const text of texts) {
      const found = pattern.exec(text)
      if (!found) continue
      const shown = label === 'html' ? found[0] : text
      const match = { evidence: `${label}: ${truncate(shown)}`, version: found.groups?.v }
      if (match.version) return match
      first ??= match
    }
  }
  return first
}

function matchKeyed(entries: KeyedPattern[], values: Record<string, string>, label: string): Match | null {
  for (const [key, pattern] of entries) {
    const value = values[key]
    if (value === undefined) continue
    if (!pattern) return { evidence: `${label}: ${key}` }
    const found = pattern.exec(value)
    if (found) return { evidence: `${label}: ${key}`, version: found.groups?.v }
  }
  return null
}

function matchRule(compiled: CompiledRule, signals: PageSignals): Match[] {
  const { rule } = compiled
  const resourceUrls = [...signals.scripts, ...signals.resources]
  const matches = [
    matchPatterns(compiled.src, resourceUrls, 'url'),
    matchPatterns(compiled.inline, [signals.inlineScripts], 'inline script'),
    matchPatterns(compiled.html, [signals.html], 'html'),
    matchPatterns(compiled.cookies, signals.cookies, 'cookie'),
    matchKeyed(compiled.meta, signals.meta, 'meta'),
    matchKeyed(compiled.headers, signals.headers, 'header'),
    matchKeyed(compiled.js, signals.jsValues, 'js'),
  ]
  const selector = rule.dom?.find((candidate) => signals.domMatches.includes(candidate))
  if (selector) matches.push({ evidence: `dom: ${selector}` })
  if (rule.protocol && signals.protocol === rule.protocol) matches.push({ evidence: `protocol: ${rule.protocol}` })
  return matches.filter((match): match is Match => match !== null)
}

function displayVersion(rule: TechRule, version: string | undefined): string | undefined {
  if (!version) return undefined
  const label = rule.versionLabels?.[version] ?? rule.versionLabels?.[version.toUpperCase()]
  return (label ?? version).slice(0, MAX_VERSION_LENGTH)
}

function buildHit(rule: TechRule, matches: Match[]): TechHit {
  return {
    name: rule.name,
    category: rule.category,
    version: displayVersion(rule, matches.find((match) => match.version)?.version),
    evidence: matches[0].evidence,
    website: rule.website,
  }
}

function addImplied(hits: Map<string, TechHit>): void {
  const queue = [...hits.values()]
  for (const source of queue) {
    for (const name of RULES_BY_NAME.get(source.name)?.implies ?? []) {
      const rule = RULES_BY_NAME.get(name)
      if (!rule || hits.has(name)) continue
      const implied: TechHit = {
        name,
        category: rule.category,
        evidence: `implied by ${source.name}`,
        website: rule.website,
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
    if (matches.length > 0) hits.set(compiled.rule.name, buildHit(compiled.rule, matches))
  }
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
