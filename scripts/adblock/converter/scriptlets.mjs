import { canonicalScriptletName, SCRIPTLETS } from '../scriptlets/library.mjs'
import { isEntity, normalizeDomain } from './parseFilter.mjs'

const SCRIPTLET_RE = /^([^#]*)#(@?)#\+js\((.*)\)$/
const MAX_ARGS_LENGTH = 2048

/** Order matters: shard entries store the ruleset as an index into this list. */
export const SCRIPTLET_RULESETS = ['ads', 'privacy', 'annoyances']

/** uBO argument syntax: comma separated, `\,` escapes a comma, an argument may be quoted. */
export function splitScriptletArgs(body) {
  const out = []
  let i = 0
  while (i <= body.length) {
    while (body[i] === ' ') i++
    const quote = body[i]
    if (quote === '"' || quote === "'" || quote === '`') {
      let j = i + 1
      while (j < body.length && !(body[j] === quote && body[j - 1] !== '\\')) j++
      let k = j + 1
      while (body[k] === ' ') k++
      if (j < body.length && (k >= body.length || body[k] === ',')) {
        out.push(body.slice(i + 1, j).split(`\\${quote}`).join(quote))
        i = k + 1
        if (k >= body.length) break
        continue
      }
    }
    let arg = ''
    let j = i
    for (; j < body.length; j++) {
      if (body[j] === '\\' && body[j + 1] === ',') {
        arg += ','
        j++
        continue
      }
      if (body[j] === ',') break
      arg += body[j]
    }
    out.push(arg.trim())
    if (j >= body.length) break
    i = j + 1
  }
  return out
}

function parseHosts(part) {
  const hosts = []
  const excluded = []
  for (const raw of part.split(',')) {
    const value = raw.trim().toLowerCase()
    if (!value) continue
    const negated = value.startsWith('~')
    const name = negated ? value.slice(1) : value
    const host = isEntity(name) ? name : normalizeDomain(name)
    if (!host) continue
    ;(negated ? excluded : hosts).push(host)
  }
  return { hosts, excluded }
}

/**
 * `host##+js(name, ...args)` / `host#@#+js(...)`. Returns null for anything that is not a
 * scriptlet filter, `{ invalid: reason }` for one we refuse, otherwise the parsed filter.
 */
export function parseScriptletFilter(line, { trusted = false } = {}) {
  const trimmed = line.trim()
  if (trimmed.startsWith('!') || trimmed.startsWith('[')) return null
  const m = SCRIPTLET_RE.exec(trimmed)
  if (!m) return null
  if (m[3].length > MAX_ARGS_LENGTH) return { invalid: 'too-long' }
  // `host>>` targets frames embedded by host; a frame only knows its own hostname here.
  if (m[1].includes('>>')) return { invalid: 'frame-context' }
  const exception = m[2] === '@'
  const { hosts, excluded } = parseHosts(m[1])
  if (m[1].trim() && !hosts.length && !excluded.length) return { invalid: 'bad-hosts' }
  const [rawName = '', ...args] = splitScriptletArgs(m[3])
  if (exception && rawName === '') return { exception, all: true, hosts, excluded }
  const name = canonicalScriptletName(rawName)
  if (!name) return { invalid: 'unsupported' }
  if (SCRIPTLETS[name].trusted && !trusted) return { invalid: 'untrusted' }
  // Generic scriptlets would run on every page: uBO Lite does not allow them either.
  if (!exception && !hosts.length) return { invalid: 'generic' }
  return { exception, name, args, hosts, excluded }
}

/**
 * YouTube belongs to the dedicated YouTube module (and its on/off setting). List scriptlets there
 * add a second set of detectable player patches, which brings back playback interruptions.
 */
const OWN_YOUTUBE_RE = /(^|\.)youtube(-nocookie)?\.(com|\*)$/

const scriptletKey = (name, args) => `${name}\u0000${JSON.stringify(args)}`

export function createScriptletCollector() {
  /** ruleset → key → { name, args, hosts:Set, excluded:Set } */
  const rulesets = new Map()
  const exceptions = []
  const disabledHosts = new Set()
  const counts = { filters: 0, exceptions: 0 }

  function add(parsed, ruleset) {
    if (parsed.exception) {
      counts.exceptions++
      if (parsed.all) for (const host of parsed.hosts) disabledHosts.add(host)
      else exceptions.push(parsed)
      return
    }
    if (!SCRIPTLET_RULESETS.includes(ruleset)) return
    counts.filters++
    if (!rulesets.has(ruleset)) rulesets.set(ruleset, new Map())
    const entries = rulesets.get(ruleset)
    const key = scriptletKey(parsed.name, parsed.args)
    if (!entries.has(key)) {
      entries.set(key, { name: parsed.name, args: parsed.args, hosts: new Set(), excluded: new Set() })
    }
    const entry = entries.get(key)
    for (const host of parsed.hosts) entry.hosts.add(host)
    for (const host of parsed.excluded) entry.excluded.add(host)
  }

  function applyExceptions() {
    for (const ex of exceptions) {
      const key = scriptletKey(ex.name, ex.args)
      for (const entries of rulesets.values()) {
        const entry = entries.get(key)
        if (!entry) continue
        if (!ex.hosts.length) {
          entries.delete(key)
          continue
        }
        for (const host of ex.hosts) {
          if (!entry.hosts.delete(host)) entry.excluded.add(host)
        }
      }
    }
  }

  /**
   * Host → `[rulesetIndex, name, args, excludedHosts?]` entries, plus the hosts where `#@#+js()`
   * turns every scriptlet off (stored as `0`). Entities (`example.*`) stay as keys: the page
   * script looks up the entity forms of its hostname too.
   */
  function build() {
    applyExceptions()
    const byHost = new Map()
    for (const [ruleset, entries] of rulesets) {
      const index = SCRIPTLET_RULESETS.indexOf(ruleset)
      for (const entry of entries.values()) {
        const excluded = [...entry.excluded].sort()
        const record = excluded.length ? [index, entry.name, entry.args, excluded] : [index, entry.name, entry.args]
        for (const host of entry.hosts) {
          if (OWN_YOUTUBE_RE.test(host)) continue
          if (!byHost.has(host)) byHost.set(host, [])
          byHost.get(host).push(record)
        }
      }
    }
    for (const host of disabledHosts) byHost.set(host, 0)
    return { byHost, disabledHosts: [...disabledHosts].sort(), counts }
  }

  return { add, build }
}
