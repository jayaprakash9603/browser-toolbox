import { MAX_HIGHLY_GENERIC } from './limits.mjs'

const LEADING_KEY_RE = /^([#.])((?:[\w-]|\\[^0-9a-fA-F\s])+)/
const AFTER_KEY_OK_RE = /^(?:$|[\s>+~.#[:])/

/**
 * uBO's "lowly generic" split: a selector whose first compound starts with `#id` or `.class`
 * can only match when an element with that id/class exists, so it is keyed by it and injected
 * on demand. Returns the key as it appears on an element (`#id` / `.class`), or null.
 */
export function genericSelectorKey(selector) {
  const match = LEADING_KEY_RE.exec(selector)
  if (!match) return null
  if (!AFTER_KEY_OK_RE.test(selector.slice(match[0].length))) return null
  return `${match[1]}${match[2].replace(/\\(.)/g, '$1')}`
}

export function createCosmeticCollector() {
  const generic = new Set()
  const genericExceptions = new Set()
  const specific = new Map()
  const specificExceptions = new Map()

  const addTo = (map, domain, selector) => {
    if (!map.has(domain)) map.set(domain, new Set())
    map.get(domain).add(selector)
  }

  const controls = new Map()
  /** host → Map(raw filter → compiled), and host → raw filters an exception cancels. */
  const procedural = new Map()
  const proceduralExceptions = new Map()

  return {
    /** Compiled procedural / `:style()` filters, matched against the raw text by exceptions. */
    addProcedural(filter) {
      const exceptions = filter.kind === 'procedural' ? filter.excludedDomains : filter.domains
      for (const domain of exceptions) addTo(proceduralExceptions, domain, filter.raw)
      if (filter.kind !== 'procedural') return
      const value = filter.compiled.css !== undefined ? { css: filter.compiled.css } : filter.compiled.task
      for (const domain of filter.domains) {
        if (!procedural.has(domain)) procedural.set(domain, new Map())
        procedural.get(domain).set(filter.raw, value)
      }
    },
    add(filter) {
      const target = filter.kind === 'cosmetic' ? specific : specificExceptions
      const excluded = filter.excludedDomains ?? []
      // `~sub.example.com` inside a hiding filter means "not there": a per-host exception.
      if (filter.kind === 'cosmetic') {
        for (const domain of excluded) addTo(specificExceptions, domain, filter.selector)
      }
      if (filter.domains.length === 0) {
        if (filter.kind === 'cosmetic-exception' && excluded.length) return
        ;(filter.kind === 'cosmetic' ? generic : genericExceptions).add(filter.selector)
        return
      }
      for (const domain of filter.domains) addTo(target, domain, filter.selector)
    },
    /** `@@||host^$generichide` / `$elemhide` / `$specifichide`. */
    addControl(filter) {
      for (const host of filter.hosts) {
        if (!controls.has(host)) controls.set(host, new Set())
        controls.get(host).add(filter.control)
      }
    },
    /** `baseSelectors` are always-on generic selectors that do not come from a list. */
    build(baseSelectors = []) {
      const keyed = {}
      const highly = []
      let keyedCount = 0
      for (const selector of new Set([...baseSelectors, ...generic])) {
        if (genericExceptions.has(selector)) continue
        const key = genericSelectorKey(selector)
        if (key) {
          ;(keyed[key] ??= []).push(selector)
          keyedCount++
        } else if (highly.length < MAX_HIGHLY_GENERIC) {
          highly.push(selector)
        }
      }
      const specificObj = {}
      for (const [host, selectors] of specific) specificObj[host] = [...selectors]
      const exceptionsObj = {}
      for (const [host, selectors] of specificExceptions) exceptionsObj[host] = [...selectors]
      const controlsObj = {}
      for (const [host, set] of controls) controlsObj[host] = [...set]
      const proceduralObj = {}
      let proceduralCount = 0
      for (const [host, filters] of procedural) {
        const own = proceduralExceptions.get(host)
        const live = [...filters].filter(([raw]) => !own?.has(raw))
        if (!live.length) continue
        proceduralObj[host] = live
        proceduralCount += live.length
      }
      const proceduralExceptionsObj = {}
      for (const [host, set] of proceduralExceptions) proceduralExceptionsObj[host] = [...set]
      return {
        highlyGenericCss: highly.map((s) => `${s}{display:none!important}`).join('\n'),
        keyed,
        specific: specificObj,
        specificExceptions: exceptionsObj,
        controls: controlsObj,
        procedural: proceduralObj,
        proceduralExceptions: proceduralExceptionsObj,
        counts: {
          highlyGeneric: highly.length,
          keyedGeneric: keyedCount,
          specificHosts: Object.keys(specificObj).length,
          procedural: proceduralCount,
        },
      }
    },
  }
}
