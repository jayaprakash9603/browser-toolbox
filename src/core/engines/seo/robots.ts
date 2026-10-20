export interface RobotsRule {
  directive: 'allow' | 'disallow'
  path: string
}

export interface ParsedRobots {
  rules: RobotsRule[]
  sitemaps: string[]
}

export function parseRobotsTxt(text: string): ParsedRobots {
  const rules: RobotsRule[] = []
  const sitemaps: string[] = []
  let inStarGroup = false

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.split('#')[0]?.trim() ?? ''
    if (!trimmed) continue
    const colon = trimmed.indexOf(':')
    if (colon < 0) continue
    const key = trimmed.slice(0, colon).trim().toLowerCase()
    const value = trimmed.slice(colon + 1).trim()

    if (key === 'user-agent') {
      inStarGroup = value === '*'
      continue
    }
    if (key === 'sitemap') {
      sitemaps.push(value)
      continue
    }
    if (!inStarGroup) continue
    if (key === 'allow') rules.push({ directive: 'allow', path: value })
    if (key === 'disallow') rules.push({ directive: 'disallow', path: value })
  }

  return { rules, sitemaps }
}

function pathMatches(rulePath: string, urlPath: string): boolean {
  if (rulePath === '') return true
  const escaped = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  const endsWithDollar = rulePath.endsWith('$')
  const body = endsWithDollar ? escaped.slice(0, -2) + '$' : escaped
  const re = new RegExp(`^${body}`)
  return re.test(urlPath)
}

export function robotsAllowsUrl(robotsTxt: string | null, pageUrl: string): boolean | null {
  if (!robotsTxt) return null
  const { rules } = parseRobotsTxt(robotsTxt)
  if (rules.length === 0) return true
  let path: string
  try {
    path = new URL(pageUrl).pathname
  } catch {
    return null
  }

  let allowed = true
  let bestMatch = -1
  for (const rule of rules) {
    if (!pathMatches(rule.path, path)) continue
    const len = rule.path.length
    if (len >= bestMatch) {
      bestMatch = len
      allowed = rule.directive === 'allow'
    }
  }
  return allowed
}
