import { MAX_COSMETIC_GENERIC, MAX_COSMETIC_SPECIFIC_HOSTS } from './limits.mjs'

export function createCosmeticCollector() {
  const generic = new Set()
  const genericExceptions = new Set()
  const specific = new Map()
  const specificExceptions = new Map()

  const addTo = (map, domain, selector) => {
    if (!map.has(domain)) map.set(domain, new Set())
    map.get(domain).add(selector)
  }

  return {
    add(filter) {
      const target = filter.kind === 'cosmetic' ? specific : specificExceptions
      if (filter.domains.length === 0) {
        ;(filter.kind === 'cosmetic' ? generic : genericExceptions).add(filter.selector)
        return
      }
      for (const domain of filter.domains) addTo(target, domain, filter.selector)
    },
    build() {
      const genericList = [...generic]
        .filter((selector) => !genericExceptions.has(selector))
        .slice(0, MAX_COSMETIC_GENERIC)
      const specificObj = {}
      for (const [host, selectors] of specific) {
        if (Object.keys(specificObj).length >= MAX_COSMETIC_SPECIFIC_HOSTS) break
        specificObj[host] = [...selectors]
      }
      const exceptionsObj = {}
      for (const [host, selectors] of specificExceptions) exceptionsObj[host] = [...selectors]
      return {
        genericCss: genericList.map((s) => `${s}{display:none!important}`).join('\n'),
        specific: specificObj,
        specificExceptions: exceptionsObj,
        counts: { generic: genericList.length, specificHosts: Object.keys(specificObj).length },
      }
    },
  }
}
