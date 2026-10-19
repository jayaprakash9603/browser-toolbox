const TYPE_MAP = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  css: 'stylesheet',
  object: 'object',
  xmlhttprequest: 'xmlhttprequest',
  xhr: 'xmlhttprequest',
  subdocument: 'sub_frame',
  frame: 'sub_frame',
  ping: 'ping',
  beacon: 'ping',
  media: 'media',
  font: 'font',
  websocket: 'websocket',
  other: 'other',
}

const IGNORED_OPTIONS = new Set(['match-case', 'all'])

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

const PROCEDURAL_RE =
  /:(?:has-text|matches-|xpath|upward|remove|style|watch-attr|min-text-length|others|-abp-|nth-ancestor|spath|if\(|if-not)/

export function isValidDomain(value) {
  return typeof value === 'string' && DOMAIN_RE.test(value)
}

export function parseFilterLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) return { kind: 'skip' }

  if (/#[$?%]#|#@[$?%]#|##\+js|#@#\+js|##\^/.test(trimmed)) return { kind: 'skip' }

  const exceptionMarker = '#@#'
  const hideMarker = '##'
  const markerIndex = trimmed.indexOf(exceptionMarker)
  const hideIndex = trimmed.indexOf(hideMarker)

  if (markerIndex !== -1 || hideIndex !== -1) {
    const isException = markerIndex !== -1
    const idx = isException ? markerIndex : hideIndex
    const marker = isException ? exceptionMarker : hideMarker
    const domainPart = trimmed.slice(0, idx).trim()
    const selector = trimmed.slice(idx + marker.length).trim()
    if (!selector || PROCEDURAL_RE.test(selector)) return { kind: 'skip' }
    const rawDomains = domainPart ? domainPart.split(',').map((d) => d.trim()).filter(Boolean) : []
    if (rawDomains.some((d) => d.startsWith('~'))) return { kind: 'skip' }
    const domains = rawDomains.map((d) => d.toLowerCase()).filter(isValidDomain)
    if (rawDomains.length && !domains.length) return { kind: 'skip' }
    return { kind: isException ? 'cosmetic-exception' : 'cosmetic', domains, selector }
  }

  if (trimmed.startsWith('@@')) {
    const network = parseNetworkFilter(trimmed.slice(2).trim())
    if (!network) return { kind: 'skip' }
    return { kind: 'network', ...network, exception: true }
  }

  const network = parseNetworkFilter(trimmed)
  if (!network) return { kind: 'skip' }
  return { kind: 'network', ...network, exception: false }
}

function parseNetworkFilter(body) {
  const dollar = body.lastIndexOf('$')
  const pattern = (dollar === -1 ? body : body.slice(0, dollar)).trim()
  const options = dollar === -1 ? '' : body.slice(dollar + 1)
  if (!pattern) return null

  const opts = parseOptions(options)
  if (opts.unsupported) return null

  const host = parseHostPattern(pattern) ?? parseUrlPattern(pattern)
  if (!host) return null

  return { pattern, host, opts }
}

function parseOptions(options) {
  const out = {
    thirdParty: null,
    domains: [],
    excludedDomains: [],
    resourceTypes: [],
    unsupported: false,
  }
  if (!options) return out

  for (const part of options.split(',')) {
    const token = part.trim().toLowerCase()
    if (!token || IGNORED_OPTIONS.has(token)) continue
    if (token === 'third-party' || token === '3p') {
      out.thirdParty = true
      continue
    }
    if (token === '~third-party' || token === '1p' || token === 'first-party') {
      out.thirdParty = false
      continue
    }
    if (TYPE_MAP[token]) {
      out.resourceTypes.push(TYPE_MAP[token])
      continue
    }
    if (token.startsWith('domain=') || token.startsWith('from=')) {
      for (const raw of token.slice(token.indexOf('=') + 1).split('|')) {
        if (!raw) continue
        const negated = raw.startsWith('~')
        const domain = negated ? raw.slice(1) : raw
        if (!isValidDomain(domain)) {
          out.unsupported = true
          return out
        }
        if (negated) out.excludedDomains.push(domain)
        else out.domains.push(domain)
      }
      continue
    }
    out.unsupported = true
    return out
  }
  return out
}

/**
 * ABP patterns (`||`, `|`, `^`, `*`) map almost 1:1 onto DNR `urlFilter`. Anything that DNR
 * would reject or that is dangerously broad (regex filters, tiny literals) is skipped.
 */
export function toUrlFilter(pattern) {
  let p = pattern.trim()
  if (p.length > 2 && p.startsWith('/') && p.endsWith('/')) return null // regex filter
  if (/[^\x21-\x7e]/.test(p)) return null // whitespace or non-ASCII
  p = p.replace(/^\*+/, '').replace(/\*+$/, '')
  if (!p) return null
  const anchored = p.startsWith('||')
  const body = p.replace(/^\|\|?/, '').replace(/\|$/, '')
  if (!anchored && p.includes('||')) return null
  if (body.includes('|') || body.startsWith('*')) return null
  if (body.replace(/[\^*]/g, '').length < 4) return null // too broad
  return p
}

function parseUrlPattern(pattern) {
  const value = toUrlFilter(pattern)
  return value ? { type: 'url', value } : null
}

function parseHostPattern(pattern) {
  if (!pattern.startsWith('||')) return null
  const rest = pattern.slice(2)
  const match = /^([^/^*|?]+)\^?\|?$/.exec(rest)
  if (!match) return null
  const host = match[1].toLowerCase()
  if (!isValidDomain(host)) return null
  return { type: 'domain', value: host }
}
