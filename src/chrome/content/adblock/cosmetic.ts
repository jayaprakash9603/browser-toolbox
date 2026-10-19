import { hostShard } from '@/core/adblock/shard'

type GuardedWindow = Window & { __toolboxCosmetic?: boolean }

interface StoredState {
  enabled?: boolean
  cosmeticEnabled?: boolean
  cookieBanners?: boolean
  distractions?: boolean
  allowlist?: string[]
}

interface SpecificCosmeticFile {
  specific: Record<string, string[]>
  exceptions: Record<string, string[]>
}

const STYLE_ID = 'toolbox-adblock-cosmetic'
const COUNT_THROTTLE_MS = 2500
const SELECTOR_CHUNK = 150
const IS_TOP = window.top === window

let active = false
let selectorChunks: string[] = []
let observer: MutationObserver | null = null
let countTimer: ReturnType<typeof setTimeout> | null = null
const counted = new WeakSet<Element>()

function siteHost(): string {
  return location.hostname.replace(/^www\./, '').toLowerCase()
}

function hostCandidates(host: string): string[] {
  const parts = host.split('.')
  const out: string[] = []
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'))
  return out
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

async function fetchText(path: string): Promise<string> {
  try {
    return await (await fetch(chrome.runtime.getURL(path))).text()
  } catch {
    return ''
  }
}

function selectorsFromCss(css: string): string[] {
  const out: string[] = []
  for (const line of css.split('\n')) {
    const end = line.lastIndexOf('{')
    if (end > 0) out.push(line.slice(0, end).trim())
  }
  return out
}

function isValidSelector(selector: string): boolean {
  try {
    document.createDocumentFragment().querySelector(selector)
    return true
  } catch {
    return false
  }
}

function buildChunks(selectors: string[]): string[] {
  const chunks: string[] = []
  for (let i = 0; i < selectors.length; i += SELECTOR_CHUNK) {
    const slice = selectors.slice(i, i + SELECTOR_CHUNK)
    const joined = slice.join(',')
    if (isValidSelector(joined)) chunks.push(joined)
    else {
      const valid = slice.filter(isValidSelector)
      if (valid.length) chunks.push(valid.join(','))
    }
  }
  return chunks
}

async function loadShard(index: number): Promise<SpecificCosmeticFile> {
  try {
    const res = await fetch(chrome.runtime.getURL(`adblock/cosmetic/specific/${index}.json`))
    return (await res.json()) as SpecificCosmeticFile
  } catch {
    return { specific: {}, exceptions: {} }
  }
}

async function buildSpecificCss(host: string): Promise<{ css: string; selectors: string[] }> {
  const candidates = hostCandidates(host)
  // Only the few shards that can hold this host (or its parents) are downloaded.
  const shardIds = [...new Set(candidates.map(hostShard))]
  const shards = await Promise.all(shardIds.map(loadShard))
  const specific = (h: string) => shards.flatMap((s) => s.specific[h] ?? [])
  const exceptionList = (h: string) => shards.flatMap((s) => s.exceptions[h] ?? [])
  const exceptions = new Set(candidates.flatMap(exceptionList))
  const selectors = [...new Set(candidates.flatMap(specific))].filter((s) => !exceptions.has(s))
  const hide = selectors.map((s) => `${s}{display:none!important}`)
  const unhide = [...exceptions].map((s) => `${s}{display:revert!important}`)
  return { css: [...hide, ...unhide].join('\n'), selectors }
}

function report(hidden: number): void {
  if (hidden <= 0) return
  try {
    void chrome.runtime.sendMessage({ type: 'ADBLOCK_COSMETIC_REPORT', hidden }).catch(() => {})
  } catch {
    /* extension reloaded */
  }
}

let countChunkIndex = 0
let countFresh = 0

const scheduleIdle =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: (deadline: IdleDeadline) => void) => {
        window.setTimeout(() => cb({ timeRemaining: () => 50 } as IdleDeadline), 0)
      }

function runCountIdle(deadline: IdleDeadline): void {
  if (!active || document.visibilityState !== 'visible') return
  while (countChunkIndex < selectorChunks.length) {
    const chunk = selectorChunks[countChunkIndex]
    for (const el of document.querySelectorAll(chunk)) {
      if (counted.has(el)) continue
      counted.add(el)
      countFresh++
    }
    countChunkIndex++
    if (deadline.timeRemaining() < 8) {
      scheduleIdle(runCountIdle)
      return
    }
  }
  report(countFresh)
  countFresh = 0
  countChunkIndex = 0
}

function countHidden(): void {
  countTimer = null
  if (!active || document.visibilityState !== 'visible') return
  countFresh = 0
  countChunkIndex = 0
  scheduleIdle(runCountIdle)
}

function scheduleCount(): void {
  if (document.visibilityState !== 'visible') return
  if (!countTimer) countTimer = setTimeout(countHidden, COUNT_THROTTLE_MS)
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

async function activate(state: StoredState | undefined): Promise<void> {
  const host = siteHost()
  const specific = await buildSpecificCss(host)
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    ;(document.head ?? document.documentElement).appendChild(style)
  }
  style.textContent = specific.css
  active = true

  if (!IS_TOP) return
  const extraFiles = ['adblock/cosmetic/generic.css']
  if (state?.cookieBanners) extraFiles.push('adblock/cosmetic/cookies.css')
  if (state?.distractions) extraFiles.push('adblock/cosmetic/distractions.css')
  const generic = (await Promise.all(extraFiles.map(fetchText))).flatMap(selectorsFromCss)
  selectorChunks = buildChunks([...specific.selectors, ...generic])

  observer ??= new MutationObserver(() => {
    scheduleCount()
    scheduleSweep()
    if (location.hash === '#google_vignette') clearVignette()
  })
  const start = () => {
    observer?.observe(document.documentElement, { childList: true, subtree: true })
    clearVignette()
    scheduleCount()
    scheduleSweep()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else start()
  window.addEventListener('hashchange', clearVignette)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      scheduleCount()
      scheduleSweep()
    }
  })
}

function deactivate(): void {
  active = false
  document.getElementById(STYLE_ID)?.remove()
  observer?.disconnect()
  observer = null
  if (countTimer) clearTimeout(countTimer)
  countTimer = null
  if (sweepTimer) clearTimeout(sweepTimer)
  sweepTimer = null
}

function apply(state: StoredState | undefined): void {
  if (shouldRun(state)) void activate(state)
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
