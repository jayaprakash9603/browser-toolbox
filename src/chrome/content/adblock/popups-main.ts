/**
 * Runs in the page's own JS world (document_start, all frames) to stop pop-ups and pop-unders.
 *
 * Network rules cannot see these: the ad script lives on the site, and the new tab is opened by
 * `window.open`, a synthetic `<a target=_blank>.click()`, or a transparent full-page link that
 * turns the first click anywhere into an ad. We only let a new window open when it is the direct
 * result of a real click on a real control, one window per click.
 */
import { siteOfUrl } from '@/core/protection/domain'

type GuardedWindow = Window & { __toolboxPopups?: boolean }

const MESSAGE_KEY = '__toolboxAdblock'
const CLICK_WINDOW_MS = 1200
const GESTURE_MERGE_MS = 700
const OVERLAY_COVERAGE = 0.6
/**
 * Sites often open their own pages (another subdomain, a report, a checkout step) after an
 * async fetch, well after the click. Same-site windows get this longer grace period.
 */
const SAME_SITE_WINDOW_MS = 10_000

/** Sign-in and payment pop-ups legitimately open outside a user gesture (after an async token fetch). */
const TRUSTED_POPUP_HOSTS =
  /(^|\.)(accounts\.google\.com|appleid\.apple\.com|login\.microsoftonline\.com|login\.live\.com|facebook\.com|api\.twitter\.com|twitter\.com|x\.com|github\.com|discord\.com|linkedin\.com|paypal\.com|stripe\.com|auth0\.com|okta\.com|firebaseapp\.com|slack\.com|zoom\.us|spotify\.com|reddit\.com)$/

const CONTROL_SELECTOR =
  'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="menuitem"],[role="tab"]'

interface ClickRecord {
  target: Element | null
  time: number
  consumed: boolean
}

let lastClick: ClickRecord = { target: null, time: 0, consumed: true }
/** Last trusted click or key press anywhere, and whether a same-site window already used it. */
let lastInteraction = 0
let sameSiteUsed = true

function report(): void {
  try {
    window.postMessage({ [MESSAGE_KEY]: 'popup-blocked' }, window.location.origin || '*')
  } catch {
    /* sandboxed frame */
  }
}

function viewportCoverage(rect: DOMRect): number {
  const width = Math.max(window.innerWidth, 1)
  const height = Math.max(window.innerHeight, 1)
  const w = Math.min(rect.right, width) - Math.max(rect.left, 0)
  const h = Math.min(rect.bottom, height) - Math.max(rect.top, 0)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / (width * height)
}

/** A big, invisible, clickable layer on top of the page: the classic "click anywhere" ad trap. */
function isHijackOverlay(el: Element): boolean {
  if (el === document.documentElement || el === document.body) return false
  let style: CSSStyleDeclaration
  try {
    style = getComputedStyle(el)
  } catch {
    return false
  }
  if (style.position !== 'fixed' && style.position !== 'absolute') return false
  if (viewportCoverage(el.getBoundingClientRect()) < OVERLAY_COVERAGE) return false
  if (el.querySelector('img,video,canvas,svg,input,button,form,p,h1,h2,h3')) return false
  if ((el.textContent ?? '').trim().length > 40) return false
  return true
}

/** True when the click landed on something a person would actually click to open a link. */
function isRealControl(el: Element | null): boolean {
  if (!el || el === document.documentElement || el === document.body) return false
  const control = el.closest(CONTROL_SELECTOR)
  if (control) return !isHijackOverlay(control)
  if (isHijackOverlay(el)) return false
  try {
    return getComputedStyle(el).cursor === 'pointer'
  } catch {
    return false
  }
}

function recordInteraction(event: Event): void {
  if (!event.isTrusted) return
  lastInteraction = Date.now()
  sameSiteUsed = false
}

function recordClick(event: Event): void {
  if (!event.isTrusted) return
  const target = event.target instanceof Element ? event.target : null
  const now = Date.now()
  recordInteraction(event)
  // pointerdown, mousedown and click are one gesture: it may open at most one window.
  if (target === lastClick.target && now - lastClick.time < GESTURE_MERGE_MS) {
    lastClick.time = now
    return
  }
  lastClick = { target, time: now, consumed: false }
}

function resolveUrl(url: string | URL | undefined): URL | null {
  if (url === undefined || url === null || url === '') return null
  try {
    return new URL(String(url), location.href)
  } catch {
    return null
  }
}

function isTrustedPopupUrl(url: URL | null): boolean {
  return !!url && TRUSTED_POPUP_HOSTS.test(url.hostname)
}

function userActivationActive(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
  return activation ? activation.isActive : true
}

/** Decides whether a new window may open right now, consuming the click if so. */
function allowNewWindow(url: URL | null): boolean {
  if (isTrustedPopupUrl(url)) return true
  const now = Date.now()
  const fresh = !lastClick.consumed && now - lastClick.time <= CLICK_WINDOW_MS
  if (fresh && userActivationActive() && isRealControl(lastClick.target)) {
    lastClick.consumed = true
    return true
  }
  if (isSameSite(url) && !sameSiteUsed && now - lastInteraction <= SAME_SITE_WINDOW_MS) {
    sameSiteUsed = true
    return true
  }
  return false
}

function isSameSite(url: URL | null): boolean {
  if (!url) return false
  const here = siteOfUrl(location.href)
  return here !== null && here === siteOfUrl(url.href)
}

function stubWindow(): Window {
  const noop = () => undefined
  const location = {
    href: 'about:blank',
    assign: noop,
    replace: noop,
    reload: noop,
    toString: () => 'about:blank',
  }
  const doc = { write: noop, writeln: noop, open: noop, close: noop, body: null, head: null }
  return {
    closed: false,
    opener: null,
    name: '',
    location,
    document: doc,
    focus: noop,
    blur: noop,
    close: noop,
    postMessage: noop,
    addEventListener: noop,
    removeEventListener: noop,
  } as unknown as Window
}

function patchWindowOpen(): void {
  const nativeOpen = window.open
  const guardedOpen = function (this: Window, url?: string | URL, target?: string, features?: string) {
    if (allowNewWindow(resolveUrl(url))) return nativeOpen.call(window, url, target, features)
    report()
    return stubWindow()
  }
  try {
    Object.defineProperty(window, 'open', {
      configurable: true,
      get: () => guardedOpen,
      set: () => undefined,
    })
  } catch {
    window.open = guardedOpen as typeof window.open
  }
}

function opensNewContext(anchor: HTMLAnchorElement): boolean {
  const target = (anchor.getAttribute('target') ?? '').toLowerCase()
  return target !== '' && target !== '_self' && target !== '_top' && target !== '_parent'
}

function isFileLike(anchor: HTMLAnchorElement): boolean {
  return anchor.hasAttribute('download') || /^(blob|data):/i.test(anchor.href)
}

function isInvisible(anchor: HTMLAnchorElement): boolean {
  if (!anchor.isConnected) return true
  const rect = anchor.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return true
  return getComputedStyle(anchor).visibility === 'hidden'
}

/** Ad scripts build a hidden `<a target=_blank>` and call `.click()` on it. */
function patchAnchorClick(): void {
  const nativeClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (opensNewContext(this) && !isFileLike(this) && isInvisible(this) && !allowNewWindow(resolveUrl(this.href))) {
      report()
      return
    }
    nativeClick.call(this)
  }
}

/** Swallows clicks on transparent full-page links and removes the trap so the page works again. */
function onCaptureClick(event: MouseEvent): void {
  if (!event.isTrusted) return
  const path = event.composedPath()
  for (const node of path) {
    if (!(node instanceof Element)) continue
    if (node === document.body || node === document.documentElement) break
    if (!isHijackOverlay(node)) continue
    const interactive = node.matches('a[href]') || node.hasAttribute('onclick') || getComputedStyle(node).cursor === 'pointer'
    if (!interactive) continue
    event.preventDefault()
    event.stopImmediatePropagation()
    ;(node as HTMLElement).style.setProperty('display', 'none', 'important')
    report()
    return
  }
}

function install(): void {
  patchWindowOpen()
  patchAnchorClick()
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click'] as const) {
    window.addEventListener(type, recordClick, true)
  }
  window.addEventListener('keydown', recordInteraction, true)
  window.addEventListener('click', onCaptureClick, true)
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxPopups) {
  guarded.__toolboxPopups = true
  install()
}
