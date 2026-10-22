import { domainToASCII } from 'node:url'

const TYPE_MAP = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  css: 'stylesheet',
  object: 'object',
  'object-subrequest': 'object',
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

const IGNORED_OPTIONS = new Set(['all', 'stealth', 'cookie'])
const METHODS = new Set(['connect', 'delete', 'get', 'head', 'options', 'patch', 'post', 'put'])
const COSMETIC_CONTROL = {
  generichide: 'generichide',
  ghide: 'generichide',
  elemhide: 'elemhide',
  ehide: 'elemhide',
  specifichide: 'specifichide',
  shide: 'specifichide',
}

/** uBO's `$inline-script` / `$inline-font` are CSP shorthands. */
const INLINE_CSP = {
  'inline-script': "script-src 'self' 'unsafe-eval' http: https: data: blob: mediastream: filesystem:",
  'inline-font': "font-src 'self' 'unsafe-eval' http: https: data: blob: mediastream: filesystem:",
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/

/** uBO-only (procedural) pseudo-classes: these cannot go into a stylesheet. */
export const PROCEDURAL_RE =
  /:(?:has-text|contains|matches-(?:attr|css|css-before|css-after|media|path|prop)|xpath|upward|remove(?:-attr|-class)?|style|watch-attr|min-text-length|others|-abp-|nth-ancestor|spath|shadow|if\(|if-not)/

/**
 * Lower-cases and punycodes a hostname; returns null when it is not a usable domain.
 * `allowTld` accepts a bare label (`to=com`), which DNR domain conditions support.
 */
export function normalizeDomain(value, allowTld = false) {
  if (typeof value !== 'string' || !value) return null
  let host = value.toLowerCase()
  if (/[^\x21-\x7e]/.test(host)) host = domainToASCII(host)
  if (!host) return null
  if (DOMAIN_RE.test(host) || IPV4_RE.test(host)) return host
  return allowTld && LABEL_RE.test(host) && !/^\d+$/.test(host) ? host : null
}

export function isValidDomain(value) {
  return normalizeDomain(value) === value
}

/** `example.*` — uBO entity syntax, matched at runtime against every public suffix. */
export function isEntity(value) {
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.\*$/.test(value)
}

/**
 * Structural checks for a selector that will be written into a stylesheet. Braces or comments
 * would let one filter inject arbitrary CSS, so they are rejected outright.
 */
export function isSafeSelector(selector) {
  if (!selector || selector.length > 1000) return false
  if (/[{}\n\r]|\/\*|\*\/|<\/?style/i.test(selector)) return false
  if (PROCEDURAL_RE.test(selector)) return false
  let paren = 0
  let bracket = 0
  let quote = ''
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i]
    if (c === '\\') {
      i++
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '(') paren++
    else if (c === ')') paren--
    else if (c === '[') bracket++
    else if (c === ']') bracket--
    if (paren < 0 || bracket < 0) return false
  }
  return !quote && paren === 0 && bracket === 0
}

function parseCosmeticDomains(domainPart) {
  const domains = []
  const excluded = []
  const entities = []
  const excludedEntities = []
  for (const raw of domainPart.split(',')) {
    const value = raw.trim().toLowerCase()
    if (!value) continue
    const negated = value.startsWith('~')
    const name = negated ? value.slice(1) : value
    if (isEntity(name)) {
      ;(negated ? excludedEntities : entities).push(name)
      continue
    }
    const host = normalizeDomain(name)
    if (!host) continue
    ;(negated ? excluded : domains).push(host)
  }
  return { domains: [...domains, ...entities], excluded: [...excluded, ...excludedEntities] }
}

export function parseFilterLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) return { kind: 'skip' }

  if (/#[$?%]#|#@[$?%]#|##\+js|#@#\+js|##\^|#@#\^/.test(trimmed)) return { kind: 'skip' }

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
    if (!isSafeSelector(selector)) return { kind: 'skip' }
    const { domains, excluded } = parseCosmeticDomains(domainPart)
    if (domainPart && !domains.length && !excluded.length) return { kind: 'skip' }
    return {
      kind: isException ? 'cosmetic-exception' : 'cosmetic',
      domains,
      excludedDomains: excluded,
      selector,
    }
  }

  const exception = trimmed.startsWith('@@')
  const network = parseNetworkFilter(exception ? trimmed.slice(2).trim() : trimmed, exception)
  if (!network) return { kind: 'skip' }
  if (network.control) return network.control
  return { kind: 'network', ...network, exception }
}

/** The filter text without its `$badfilter` option, used to cancel the filter it names. */
export function badfilterTarget(line) {
  const trimmed = line.trim()
  const dollar = trimmed.lastIndexOf('$')
  if (dollar === -1) return null
  const options = trimmed.slice(dollar + 1).split(',')
  const rest = options.filter((opt) => opt.trim().toLowerCase() !== 'badfilter')
  if (rest.length === options.length) return null
  return rest.length ? `${trimmed.slice(0, dollar)}$${rest.join(',')}` : trimmed.slice(0, dollar)
}

function parseNetworkFilter(body, exception) {
  const isRegex = /^\/.+\/(?:\$|$)/.test(body)
  const dollar = isRegex ? body.indexOf('$', body.lastIndexOf('/')) : body.lastIndexOf('$')
  const pattern = (dollar === -1 ? body : body.slice(0, dollar)).trim()
  const options = dollar === -1 ? '' : body.slice(dollar + 1)

  const opts = parseOptions(options)
  if (opts.unsupported) return null

  if (opts.cosmeticControl) {
    if (!exception) return null
    const host = parseHostPattern(pattern)
    const hosts = host ? [host.value] : opts.domains
    if (!hosts.length) return null
    return { control: { kind: 'cosmetic-control', control: opts.cosmeticControl, hosts } }
  }

  if (!pattern || pattern === '*' || pattern === '|' || pattern === '||') {
    // A pattern-less filter is only safe when something else narrows it down.
    const narrowed = opts.domains.length || opts.requestDomains.length
    return narrowed ? { pattern: '', host: { type: 'any' }, opts } : null
  }

  if (/^\/.+\/$/.test(pattern)) {
    const regex = toRegexFilter(pattern.slice(1, -1))
    return regex ? { pattern, host: { type: 'regex', value: regex }, opts } : null
  }

  const host = parseHostPattern(pattern) ?? parseUrlPattern(pattern)
  if (!host) return null
  return { pattern, host, opts }
}

/**
 * DNR has no entity (`site.*`) matching: a positive entity is dropped (the rule then covers
 * fewer sites), but a negated one would widen the rule, so the whole filter is rejected.
 */
function splitDomains(value, out, excluded) {
  let positives = 0
  for (const raw of value.split('|')) {
    if (!raw) continue
    const negated = raw.startsWith('~')
    const name = negated ? raw.slice(1) : raw
    if (!negated) positives++
    if (isEntity(name)) {
      if (negated) return false
      continue
    }
    const host = normalizeDomain(name, true)
    if (!host) return false
    ;(negated ? excluded : out).push(host)
  }
  return positives === 0 || out.length > 0
}

function parseOptions(options) {
  const out = {
    thirdParty: null,
    domains: [],
    excludedDomains: [],
    requestDomains: [],
    excludedRequestDomains: [],
    resourceTypes: [],
    excludedResourceTypes: [],
    methods: [],
    excludedMethods: [],
    important: false,
    matchCase: false,
    redirect: null,
    removeparam: null,
    csp: null,
    document: false,
    cosmeticControl: null,
    unsupported: false,
  }
  if (!options) return out
  const fail = () => {
    out.unsupported = true
    return out
  }

  for (const part of options.split(',')) {
    const raw = part.trim()
    const token = raw.toLowerCase()
    if (!token || IGNORED_OPTIONS.has(token)) continue
    const negated = token.startsWith('~')
    const name = negated ? token.slice(1) : token
    const eq = raw.indexOf('=')
    const key = eq === -1 ? name : token.slice(negated ? 1 : 0, eq)
    const value = eq === -1 ? '' : raw.slice(eq + 1)

    if (name === 'third-party' || name === '3p' || name === 'strict3p') {
      out.thirdParty = !negated
    } else if (name === 'first-party' || name === '1p' || name === 'strict1p') {
      out.thirdParty = negated
    } else if (name === 'match-case') {
      out.matchCase = true
    } else if (name === 'important') {
      out.important = true
    } else if (name === 'document' || name === 'doc') {
      if (negated) return fail()
      out.document = true
    } else if (TYPE_MAP[name]) {
      ;(negated ? out.excludedResourceTypes : out.resourceTypes).push(TYPE_MAP[name])
    } else if (COSMETIC_CONTROL[name]) {
      out.cosmeticControl = COSMETIC_CONTROL[name]
    } else if (INLINE_CSP[name] && !negated) {
      out.csp = INLINE_CSP[name]
    } else if (key === 'domain' || key === 'from') {
      if (!splitDomains(value.toLowerCase(), out.domains, out.excludedDomains)) return fail()
    } else if (key === 'to') {
      if (!splitDomains(value.toLowerCase(), out.requestDomains, out.excludedRequestDomains)) return fail()
    } else if (key === 'denyallow') {
      const denied = []
      if (!splitDomains(value.toLowerCase(), out.excludedRequestDomains, denied) || denied.length) return fail()
    } else if (key === 'method') {
      for (const m of value.toLowerCase().split('|')) {
        const neg = m.startsWith('~')
        const method = neg ? m.slice(1) : m
        if (!METHODS.has(method)) return fail()
        ;(neg ? out.excludedMethods : out.methods).push(method)
      }
    } else if (key === 'redirect') {
      out.redirect = value.replace(/:\d+$/, '')
      if (!out.redirect) return fail()
    } else if (key === 'removeparam' || key === 'queryprune') {
      // Only literal parameter names map onto DNR's queryTransform.
      if (!/^[\w.%-]+$/.test(value)) return fail()
      out.removeparam = value
    } else if (key === 'csp') {
      if (!value || /[\r\n]/.test(value)) return fail()
      out.csp = value
    } else {
      // $popup, $redirect-rule, $replace, $header, $permissions, ... have no DNR equivalent.
      return fail()
    }
  }
  return out
}

/**
 * DNR regex filters run on RE2: no lookaround, no backreferences. Long patterns can also blow
 * Chrome's per-rule memory limit, so they are dropped.
 */
export function toRegexFilter(source) {
  if (!source || source.length > 250) return null
  if (/\(\?[=!<]|\\[1-9]|[^\\]\{\d{3,}/.test(source)) return null
  if (/[^\x20-\x7e]/.test(source)) return null
  try {
    new RegExp(source)
  } catch {
    return null
  }
  return source
}

/**
 * ABP patterns (`||`, `|`, `^`, `*`) map almost 1:1 onto DNR `urlFilter`. Anything that DNR
 * would reject or that is dangerously broad (tiny literals) is skipped.
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
  const host = normalizeDomain(match[1])
  return host ? { type: 'domain', value: host } : null
}
