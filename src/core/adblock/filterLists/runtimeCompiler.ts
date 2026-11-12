export interface RuntimeCompileResult {
  rules: chrome.declarativeNetRequest.Rule[]
  unsupported: number
  domains: number
}

const DOMAIN_LINE = /^\|\|([a-z0-9.-]+)\^(\s|$)/i

function normalizeDomain(raw: string): string | null {
  const host = raw.toLowerCase().replace(/\.$/, '')
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(host)) return null
  return host
}

/**
 * Compiles a small subset of ABP/uBO network filters into DNR block rules.
 * Full syntax is handled at build time; runtime refresh only adds plain `||domain^` lines.
 */
export function compileDomainBlockRules(
  lines: string[],
  startId: number,
  maxRules: number,
): RuntimeCompileResult {
  const domains = new Set<string>()
  let unsupported = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('!')) continue
    if (trimmed.includes('##') || trimmed.includes('#@#')) {
      unsupported++
      continue
    }
    const match = DOMAIN_LINE.exec(trimmed)
    if (!match) {
      if (trimmed.startsWith('||') || trimmed.includes('$')) unsupported++
      continue
    }
    const host = normalizeDomain(match[1])
    if (host) domains.add(host)
    else unsupported++
  }

  const rules: chrome.declarativeNetRequest.Rule[] = []
  const list = [...domains].sort()
  let id = startId
  const chunkSize = 500

  for (let offset = 0; offset < list.length && rules.length < maxRules; offset += chunkSize) {
    const slice = list.slice(offset, offset + chunkSize)
    rules.push({
      id: id++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        requestDomains: slice,
        resourceTypes: ['script', 'xmlhttprequest', 'image', 'sub_frame', 'media', 'ping', 'other'],
      },
    })
  }

  return { rules, unsupported, domains: domains.size }
}
