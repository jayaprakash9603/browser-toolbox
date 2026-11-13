interface RobotsRule {
  allow: boolean
  path: string
}

export function isRobotsPathDisallowed(url: string, robotsText: string | null | undefined): boolean {
  if (!robotsText) return false
  let path = '/'
  try {
    path = new URL(url).pathname || '/'
  } catch {
    return false
  }
  const rules = starAgentRules(robotsText)
  if (rules.length === 0) return false
  const match = longestRule(path, rules)
  return match ? !match.allow : false
}

function starAgentRules(text: string): RobotsRule[] {
  const rules: RobotsRule[] = []
  let inStar = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const agent = /^user-agent:\s*(.*)$/i.exec(line)
    if (agent) {
      inStar = agent[1].trim() === '*'
      continue
    }
    if (!inStar) continue
    const disallow = /^disallow:\s*(.*)$/i.exec(line)
    if (disallow) {
      rules.push({ allow: false, path: disallow[1].trim() || '' })
      continue
    }
    const allow = /^allow:\s*(.*)$/i.exec(line)
    if (allow) rules.push({ allow: true, path: allow[1].trim() || '' })
  }
  return rules.filter((rule) => rule.path.length > 0)
}

function longestRule(path: string, rules: RobotsRule[]): RobotsRule | null {
  let best: RobotsRule | null = null
  for (const rule of rules) {
    if (!path.startsWith(rule.path) && rule.path !== '/') continue
    if (rule.path === '/' || path.startsWith(rule.path)) {
      if (!best || rule.path.length > best.path.length) best = rule
    }
  }
  return best
}
