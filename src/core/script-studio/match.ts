export type MatchPlan = {
  matches: string[]
  excludeMatches: string[]
  includeGlobs: string[]
  excludeGlobs: string[]
  /** Patterns checked at runtime when URL cannot be expressed in declarative fields */
  runtimeInclude: string[]
  runtimeExclude: string[]
  broadMatchWarning: boolean
}

const BROAD_PATTERNS = [
  '*://*/*',
  'http://*/*',
  'https://*/*',
  '*://*',
  '<all_urls>',
]

function isRegexPattern(p: string): boolean {
  return p.startsWith('/') && p.length > 2 && p.lastIndexOf('/') > 0
}

function regexBody(p: string): RegExp | null {
  if (!isRegexPattern(p)) return null
  const last = p.lastIndexOf('/')
  const body = p.slice(1, last)
  const flags = p.slice(last + 1)
  try {
    return new RegExp(body, flags)
  } catch {
    return null
  }
}

/** Convert TM @include to match pattern or glob where possible */
function includeToMatchOrGlob(p: string): { match?: string; glob?: string; runtime?: string } {
  const trimmed = p.trim()
  if (!trimmed) return {}

  if (isRegexPattern(trimmed)) {
    return { runtime: trimmed }
  }

  if (trimmed.includes('://') || trimmed.startsWith('*')) {
    if (trimmed.includes('*') && !trimmed.match(/^\*:\/\/[\w.-]+\/\*$/)) {
      const glob = trimmed.replace(/\*/g, '*')
      if (glob.includes('*')) return { glob: glob.startsWith('*://') ? glob : `*://${glob}` }
    }
    let m = trimmed
    if (!m.includes('://')) m = `*://${m}`
    if (!m.endsWith('*') && !m.endsWith('/')) m = `${m}*`
    return { match: m }
  }

  return { glob: `*://${trimmed}/*` }
}

function matchPatternToChrome(p: string): string | null {
  let m = p.trim()
  if (m === '<all_urls>') return '*://*/*'
  if (!m.includes('://')) return null
  m = m.replace(/\*:\/\//g, '*://')
  if (!m.endsWith('*') && !m.endsWith('/')) m = `${m}*`
  return m
}

export function isBroadMatch(patterns: string[]): boolean {
  const all = patterns.map((p) => p.trim().toLowerCase())
  return all.some((p) => BROAD_PATTERNS.some((b) => p === b.toLowerCase() || p === '*'))
}

export function buildMatchPlan(
  matches: string[],
  includes: string[],
  excludes: string[],
): MatchPlan {
  const plan: MatchPlan = {
    matches: [],
    excludeMatches: [],
    includeGlobs: [],
    excludeGlobs: [],
    runtimeInclude: [],
    runtimeExclude: [],
    broadMatchWarning: false,
  }

  const allMatchSources = [...matches, ...includes]

  for (const m of matches) {
    const chrome = matchPatternToChrome(m)
    if (chrome) plan.matches.push(chrome)
    else plan.runtimeInclude.push(m)
  }

  for (const inc of includes) {
    const converted = includeToMatchOrGlob(inc)
    if (converted.match) {
      const chrome = matchPatternToChrome(converted.match)
      if (chrome && !plan.matches.includes(chrome)) plan.matches.push(chrome)
    } else if (converted.glob) {
      plan.includeGlobs.push(converted.glob)
    } else if (converted.runtime) {
      plan.runtimeInclude.push(converted.runtime)
    }
  }

  for (const ex of excludes) {
    if (isRegexPattern(ex)) {
      plan.runtimeExclude.push(ex)
      continue
    }
    const chrome = matchPatternToChrome(ex)
    if (chrome) plan.excludeMatches.push(chrome)
    else plan.excludeGlobs.push(ex.includes('://') ? ex : `*://${ex}/*`)
  }

  if (plan.matches.length === 0 && plan.includeGlobs.length === 0) {
    plan.matches.push('*://*/*')
  }

  plan.broadMatchWarning = isBroadMatch(allMatchSources.length ? allMatchSources : plan.matches)

  return plan
}

export function urlMatchesPlan(url: string, plan: MatchPlan): boolean {
  try {
    const u = new URL(url)
    for (const ex of plan.runtimeExclude) {
      const re = regexBody(ex)
      if (re?.test(url)) return false
    }
    for (const exGlob of plan.excludeGlobs) {
      if (globMatch(u.href, exGlob)) return false
    }

    let included = false
    for (const m of plan.matches) {
      if (chromeMatchPattern(u.href, m)) included = true
    }
    for (const g of plan.includeGlobs) {
      if (globMatch(u.href, g)) included = true
    }
    for (const ri of plan.runtimeInclude) {
      const re = regexBody(ri)
      if (re?.test(url)) included = true
    }

    if (!included && plan.matches.length === 1 && plan.matches[0] === '*://*/*') {
      included = true
    }

    return included
  } catch {
    return false
  }
}

function globMatch(href: string, glob: string): boolean {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  try {
    return new RegExp(`^${escaped}$`, 'i').test(href)
  } catch {
    return false
  }
}

function chromeMatchPattern(href: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  try {
    return new RegExp(`^${escaped}$`, 'i').test(href)
  } catch {
    return false
  }
}

export function mergeUrlRules(
  metaMatches: string[],
  metaIncludes: string[],
  metaExcludes: string[],
  userMatches: string[] | undefined,
  userIncludes: string[] | undefined,
  userExcludes: string[] | undefined,
  keepOriginalMatches: boolean,
  keepOriginalIncludes: boolean,
  keepOriginalExcludes: boolean,
): { matches: string[]; includes: string[]; excludes: string[] } {
  const matches = keepOriginalMatches
    ? [...metaMatches, ...(userMatches ?? [])]
    : (userMatches ?? metaMatches)
  const includes = keepOriginalIncludes
    ? [...metaIncludes, ...(userIncludes ?? [])]
    : (userIncludes ?? metaIncludes)
  const excludes = keepOriginalExcludes
    ? [...metaExcludes, ...(userExcludes ?? [])]
    : (userExcludes ?? metaExcludes)
  return { matches, includes, excludes }
}
