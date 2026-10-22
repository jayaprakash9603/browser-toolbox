import { bloomHas, parseBloom, type BloomFilter } from '@/core/adblock/bloom'
import { genericKeyShard, hostCandidates, hostShard } from '@/core/adblock/shard'

import type { ProceduralTask } from './procedural'

type GuardedWindow = Window & { __toolboxCosmetic?: boolean }

interface StoredState {
  enabled?: boolean
  cosmeticEnabled?: boolean
  cookieBanners?: boolean
  distractions?: boolean
  allowlist?: string[]
}

type ProceduralEntry = [raw: string, compiled: ProceduralTask | { css: string }]

interface SpecificCosmeticFile {
  specific: Record<string, string[]>
  exceptions: Record<string, string[]>
  controls?: Record<string, string[]>
  procedural?: Record<string, ProceduralEntry[]>
  proceduralExceptions?: Record<string, string[]>
}

const STYLE_ID = 'toolbox-adblock-cosmetic'
const GENERIC_STYLE_CLASS = 'toolbox-adblock-generic'
const GENERIC_FLUSH_MS = 60
const IS_TOP = window.top === window

let active = false
let observer: MutationObserver | null = null
const counted = new WeakSet<Element>()

function siteHost(): string {
  return location.hostname.replace(/^www\./, '').toLowerCase()
}

function isAllowlisted(host: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => {
    const e = entry.replace(/^www\./, '').toLowerCase()
    return host === e || host.endsWith(`.${e}`)
  })
}

function shouldRun(state: StoredState | undefined): boolean {
  if (state?.enabled === false || state?.cosmeticEnabled === false) return false
  return !isAllowlisted(siteHost(), state?.allowlist ?? [])
}

async function loadShard(index: number): Promise<SpecificCosmeticFile> {
  try {
    const res = await fetch(chrome.runtime.getURL(`adblock/cosmetic/specific/${index}.json`))
    return (await res.json()) as SpecificCosmeticFile
  } catch {
    return { specific: {}, exceptions: {} }
  }
}

interface SiteCosmetics {
  css: string
  exceptions: Set<string>
  generichide: boolean
  elemhide: boolean
  procedural: ProceduralTask[]
}

async function buildSpecificCss(host: string): Promise<SiteCosmetics> {
  const candidates = hostCandidates(host)
  // Only the few shards that can hold this host (or its parents) are downloaded.
  const shardIds = [...new Set(candidates.map(hostShard))]
  const shards = await Promise.all(shardIds.map(loadShard))
  const controls = new Set(candidates.flatMap((h) => shards.flatMap((s) => s.controls?.[h] ?? [])))
  const elemhide = controls.has('elemhide')
  const generichide = elemhide || controls.has('generichide')
  const specific = (h: string) => shards.flatMap((s) => s.specific[h] ?? [])
  const exceptionList = (h: string) => shards.flatMap((s) => s.exceptions[h] ?? [])
  const exceptions = new Set(candidates.flatMap(exceptionList))
  if (elemhide || controls.has('specifichide')) {
    return { css: '', exceptions, generichide, elemhide, procedural: [] }
  }
  const selectors = [...new Set(candidates.flatMap(specific))].filter((s) => !exceptions.has(s))
  // One rule per selector: an unsupported selector then only drops its own rule.
  const hide = selectors.map((s) => `${s}{display:none!important}`)
  const unhide = [...exceptions].map((s) => `${s}{display:revert!important}`)
  const procExceptions = new Set(
    candidates.flatMap((h) => shards.flatMap((s) => s.proceduralExceptions?.[h] ?? [])),
  )
  const styles: string[] = []
  const procedural: ProceduralTask[] = []
  const seen = new Set<string>()
  for (const h of candidates) {
    for (const shard of shards) {
      for (const [raw, compiled] of shard.procedural?.[h] ?? []) {
        if (seen.has(raw) || procExceptions.has(raw)) continue
        seen.add(raw)
        if ('css' in compiled) styles.push(compiled.css)
        else procedural.push(compiled)
      }
    }
  }
  return { css: [...hide, ...unhide, ...styles].join('\n'), exceptions, generichide, elemhide, procedural }
}

let stopProcedural: (() => void) | null = null

/** The procedural engine is its own module, fetched only on sites that have such filters. */
async function startProceduralFilters(tasks: ProceduralTask[]): Promise<void> {
  if (!tasks.length || stopProcedural) return
  try {
    const url = chrome.runtime.getURL('adblock/scripts/procedural.js')
    const engine = (await import(/* @vite-ignore */ url)) as typeof import('./procedural')
    if (!active || stopProcedural) return
    stopProcedural = engine.startProcedural(tasks, { report })
  } catch {
    /* extension reloaded or module blocked */
  }
}

/**
 * uBO Lite-style generic cosmetic filtering: selectors that start with `#id` / `.class` are
 * injected only once an element carrying that id/class shows up, instead of shipping tens of
 * thousands of rules into every frame. A bloom filter keeps lookups for unknown keys local.
 */
const generic = {
  bloom: null as Promise<BloomFilter | null> | null,
  shards: new Map<number, Promise<Record<string, string[]>>>(),
  seen: new Set<string>(),
  injected: new Set<string>(),
  exceptions: new Set<string>(),
  queue: [] as Element[],
  timer: null as ReturnType<typeof setTimeout> | null,
}

function loadBloom(): Promise<BloomFilter | null> {
  generic.bloom ??= fetch(chrome.runtime.getURL('adblock/cosmetic/generic/keys.bloom'))
    .then((res) => res.arrayBuffer())
    .then(parseBloom)
    .catch(() => null)
  return generic.bloom
}

function loadGenericShard(index: number): Promise<Record<string, string[]>> {
  let shard = generic.shards.get(index)
  if (!shard) {
    shard = fetch(chrome.runtime.getURL(`adblock/cosmetic/generic/${index}.json`))
      .then((res) => res.json() as Promise<Record<string, string[]>>)
      .catch(() => ({}))
    generic.shards.set(index, shard)
  }
  return shard
}

function collectKeys(el: Element, out: string[]): void {
  const id = el.id
  if (id && typeof id === 'string') out.push(`#${id}`)
  const list = el.classList
  for (let i = 0; i < list.length; i++) out.push(`.${list[i]}`)
}

function countMatches(selectors: string[]): void {
  let fresh = 0
  for (const selector of selectors) {
    try {
      for (const el of document.querySelectorAll(selector)) {
        if (counted.has(el)) continue
        counted.add(el)
        fresh++
      }
    } catch {
      /* selector unsupported by this browser */
    }
  }
  report(fresh)
}

async function flushGeneric(): Promise<void> {
  generic.timer = null
  if (!active) return
  const nodes = generic.queue
  generic.queue = []
  const keys: string[] = []
  for (const node of nodes) {
    if (!node.isConnected) continue
    collectKeys(node, keys)
    for (const child of node.querySelectorAll('[id],[class]')) collectKeys(child, keys)
  }
  const bloom = await loadBloom()
  if (!bloom || !active) return
  const byShard = new Map<number, string[]>()
  for (const key of keys) {
    if (generic.seen.has(key)) continue
    generic.seen.add(key)
    if (!bloomHas(bloom, key)) continue
    const index = genericKeyShard(key)
    const list = byShard.get(index)
    if (list) list.push(key)
    else byShard.set(index, [key])
  }
  if (!byShard.size) return
  const fresh: string[] = []
  await Promise.all(
    [...byShard].map(async ([index, shardKeys]) => {
      const shard = await loadGenericShard(index)
      for (const key of shardKeys) {
        for (const selector of shard[key] ?? []) {
          if (generic.injected.has(selector) || generic.exceptions.has(selector)) continue
          generic.injected.add(selector)
          fresh.push(selector)
        }
      }
    }),
  )
  if (!fresh.length || !active) return
  const style = document.createElement('style')
  style.className = GENERIC_STYLE_CLASS
  style.textContent = fresh.map((s) => `${s}{display:none!important}`).join('\n')
  ;(document.head ?? document.documentElement).appendChild(style)
  if (IS_TOP && document.visibilityState === 'visible') scheduleIdle(() => countMatches(fresh))
}

function queueGeneric(node: Element): void {
  generic.queue.push(node)
  generic.timer ??= setTimeout(() => void flushGeneric(), GENERIC_FLUSH_MS)
}

function onMutations(records: MutationRecord[]): void {
  for (const record of records) {
    if (record.type === 'attributes') {
      if (record.target instanceof Element) generic.queue.push(record.target)
      continue
    }
    for (const node of record.addedNodes) {
      if (node.nodeType === 1) generic.queue.push(node as Element)
    }
  }
  if (generic.queue.length) generic.timer ??= setTimeout(() => void flushGeneric(), GENERIC_FLUSH_MS)
  if (IS_TOP) {
    scheduleSweep()
    if (location.hash === '#google_vignette') clearVignette()
  }
}

function report(hidden: number): void {
  if (hidden <= 0) return
  try {
    void chrome.runtime.sendMessage({ type: 'ADBLOCK_COSMETIC_REPORT', hidden }).catch(() => {})
  } catch {
    /* extension reloaded */
  }
}

const scheduleIdle =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: (deadline: IdleDeadline) => void) => {
        window.setTimeout(() => cb({ timeRemaining: () => 50 } as IdleDeadline), 0)
      }

/** Google's full-page "vignette" interstitial leaves a hash and a scroll lock behind. */
function clearVignette(): void {
  if (location.hash === '#google_vignette') {
    history.replaceState(history.state, '', location.href.replace(/#google_vignette$/, ''))
  }
  for (const el of [document.documentElement, document.body]) {
    if (el && el.style.overflow === 'hidden' && !document.querySelector('[aria-modal="true"]')) {
      el.style.removeProperty('overflow')
    }
  }
}

/** Ad-network frames and slots. Hidden inline so the page cannot override it with a later stylesheet. */
const AD_FRAME_SELECTOR = [
  'iframe[id^="google_ads_iframe"]',
  'iframe[id^="aswift_"]',
  'iframe[name^="google_ads_iframe"]',
  'iframe[data-google-container-id]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googleadservices.com"]',
  'iframe[src*="/pagead/"]',
  'iframe[src*="adsterra"]',
  'iframe[src*="taboola.com"]',
  'iframe[src*="outbrain.com"]',
  'iframe[src*="amazon-adsystem.com"]',
  'ins.adsbygoogle',
  'div[id^="google_ads_iframe"]',
  'div[id^="div-gpt-ad"]',
  'div[data-google-query-id]',
].join(',')

const SWEEP_THROTTLE_MS = 800
const MAX_WRAPPER_HEIGHT = 400
let sweepTimer: ReturnType<typeof setTimeout> | null = null

function hideInline(el: HTMLElement): void {
  el.style.setProperty('display', 'none', 'important')
}

/** Remove the page offset Google's top and bottom "anchor" ads add so no blank strip is left behind. */
function resetAnchorOffset(adRect: DOMRect): void {
  const height = adRect.height
  if (height < 20) return
  const atTop = adRect.top <= 4
  const atBottom = adRect.bottom >= window.innerHeight - 4
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue
    const props = atTop ? ['margin-top', 'padding-top'] : atBottom ? ['margin-bottom', 'padding-bottom'] : []
    for (const prop of props) {
      const value = Number.parseFloat(el.style.getPropertyValue(prop))
      if (Number.isFinite(value) && Math.abs(value - height) <= 12) el.style.removeProperty(prop)
    }
  }
}

/** Hide the ad and the empty wrapper boxes it leaves (labels, borders, reserved height). */
function collapseAd(ad: HTMLElement): void {
  const rect = ad.getBoundingClientRect()
  let anchorRect = rect
  hideInline(ad)
  let parent = ad.parentElement
  for (let depth = 0; parent && depth < 3; depth++) {
    if (parent === document.body || parent === document.documentElement) break
    const onlyChild = parent.children.length === 1
    const text = (parent.textContent ?? '').trim()
    const emptyish = text.length < 40
    const parentRect = parent.getBoundingClientRect()
    const fixed = getComputedStyle(parent).position === 'fixed'
    if (!(onlyChild && emptyish) || (!fixed && parentRect.height > MAX_WRAPPER_HEIGHT)) break
    if (fixed) anchorRect = parentRect
    hideInline(parent)
    parent = parent.parentElement
  }
  resetAnchorOffset(anchorRect)
}

function sweepAds(): void {
  sweepTimer = null
  if (!active || document.visibilityState !== 'visible') return
  let fresh = 0
  for (const el of document.querySelectorAll<HTMLElement>(AD_FRAME_SELECTOR)) {
    if (counted.has(el)) continue
    counted.add(el)
    collapseAd(el)
    fresh++
  }
  report(fresh)
}

function scheduleSweep(): void {
  if (sweepTimer || document.visibilityState !== 'visible') return
  sweepTimer = setTimeout(() => scheduleIdle(sweepAds), SWEEP_THROTTLE_MS)
}

/** popups-main.ts runs in the page world and signals each pop-up it stops. */
function listenForPopupReports(): void {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data as Record<string, unknown> | null
    if (data && typeof data === 'object' && data.__toolboxAdblock === 'popup-blocked') report(1)
  })
}

let listenersAdded = false

async function activate(): Promise<void> {
  if (active) return
  active = true
  void loadBloom()
  const specific = await buildSpecificCss(siteHost())
  if (!active) return
  generic.exceptions = specific.exceptions
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    ;(document.head ?? document.documentElement).appendChild(style)
  }
  style.textContent = specific.css
  void startProceduralFilters(specific.procedural)
  // Generic hiding (keyed selectors and the inline ad-frame sweep) is off on $generichide sites.
  if (specific.generichide) return

  observer ??= new MutationObserver(onMutations)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id'],
  })
  queueGeneric(document.documentElement)

  if (!IS_TOP || listenersAdded) return
  listenersAdded = true
  const start = () => {
    clearVignette()
    scheduleSweep()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else start()
  window.addEventListener('hashchange', clearVignette)
  document.addEventListener('visibilitychange', () => {
    if (active && document.visibilityState === 'visible') scheduleSweep()
  })
}

function deactivate(): void {
  active = false
  stopProcedural?.()
  stopProcedural = null
  document.getElementById(STYLE_ID)?.remove()
  for (const el of document.querySelectorAll(`style.${GENERIC_STYLE_CLASS}`)) el.remove()
  generic.seen.clear()
  generic.injected.clear()
  generic.queue = []
  observer?.disconnect()
  observer = null
  if (generic.timer) clearTimeout(generic.timer)
  generic.timer = null
  if (sweepTimer) clearTimeout(sweepTimer)
  sweepTimer = null
}

function apply(state: StoredState | undefined): void {
  if (shouldRun(state)) void activate()
  else deactivate()
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxCosmetic) {
  guarded.__toolboxCosmetic = true
  listenForPopupReports()
  chrome.storage.local.get('adblock', (result) => apply(result.adblock as StoredState | undefined))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.adblock) {
      apply(changes.adblock.newValue as StoredState | undefined)
    }
  })
}
