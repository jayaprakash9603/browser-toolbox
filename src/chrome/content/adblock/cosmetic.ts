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

async function buildSpecificCss(host: string): Promise<{ css: string; selectors: string[] }> {
  let file: SpecificCosmeticFile = { specific: {}, exceptions: {} }
  try {
    const res = await fetch(chrome.runtime.getURL('adblock/cosmetic/specific.json'))
    file = (await res.json()) as SpecificCosmeticFile
  } catch {
    /* keep empty */
  }
  const candidates = hostCandidates(host)
  const exceptions = new Set(candidates.flatMap((h) => file.exceptions[h] ?? []))
  const selectors = [...new Set(candidates.flatMap((h) => file.specific[h] ?? []))].filter(
    (s) => !exceptions.has(s),
  )
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

function countHidden(): void {
  countTimer = null
  if (!active) return
  let fresh = 0
  for (const chunk of selectorChunks) {
    for (const el of document.querySelectorAll(chunk)) {
      if (counted.has(el)) continue
      counted.add(el)
      fresh++
    }
  }
  report(fresh)
}

function scheduleCount(): void {
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
    if (location.hash === '#google_vignette') clearVignette()
  })
  const start = () => {
    observer?.observe(document.documentElement, { childList: true, subtree: true })
    clearVignette()
    scheduleCount()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else start()
  window.addEventListener('hashchange', clearVignette)
}

function deactivate(): void {
  active = false
  document.getElementById(STYLE_ID)?.remove()
  observer?.disconnect()
  observer = null
  if (countTimer) clearTimeout(countTimer)
  countTimer = null
}

function apply(state: StoredState | undefined): void {
  if (shouldRun(state)) void activate(state)
  else deactivate()
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxCosmetic) {
  guarded.__toolboxCosmetic = true
  chrome.storage.local.get('adblock', (result) => apply(result.adblock as StoredState | undefined))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.adblock) {
      apply(changes.adblock.newValue as StoredState | undefined)
    }
  })
}
