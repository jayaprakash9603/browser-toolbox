/**
 * Isolated world, all frames, document_start.
 * - Top frame: look-alike sign-in pages and tech-support scam text, with warning overlays.
 * - Every frame: relays page-world guard signals to the background and reports user
 *   gestures so the download guard can tell clicked downloads from automatic ones.
 */
import { PAGE_COMMAND_KEY, PAGE_MESSAGE_KEY } from '@/core/protection/constants'
import { assessPage, assessScamText } from '@/core/protection/heuristics'
import type { ProtectionState, ThreatCategory } from '@/core/protection/types'

type GuardedWindow = Window & { __toolboxProtectionHeuristics?: boolean }
type OverlayKind = 'lookalike' | 'lookalikeLow' | 'techscam' | 'clipboard'

const OVERLAY_ID = 'toolbox-protection-overlay'
const SCAM_RECHECK_MS = 2500
const CHECK_COALESCE_MS = 2000
const OBSERVER_IDLE_MS = 30_000
const SCAM_TEXT_SLICE = 12_000
const GESTURE_THROTTLE_MS = 1500
const IS_TOP = window.top === window

let state: Partial<ProtectionState> = {}
let decided = false
let observer: MutationObserver | null = null
let lastGestureSent = 0
let checksScheduled = false
let lastCheckRun = 0
let observerStartedAt = 0

function isActive(): boolean {
  if (state.enabled === false) return false
  const host = location.hostname.replace(/^www\./, '')
  return !(state.trusted ?? []).some((t) => host === t || host.endsWith(`.${t}`))
}

function send(message: Record<string, unknown>): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {})
  } catch {
    /* extension reloaded */
  }
}

function report(category: ThreatCategory): void {
  send({
    type: 'PROTECTION_REPORT',
    category,
    host: location.hostname.replace(/^www\./, ''),
    source: 'heuristic',
  })
}

function collectSignals() {
  const hasPassword =
    document.querySelector('input[type="password"]') != null ||
    document.querySelector('input[autocomplete="current-password"]') != null
  const formActions: string[] = []
  for (const form of document.querySelectorAll('form')) {
    const action = form.getAttribute('action')
    if (action) formActions.push(action)
  }
  return {
    host: location.hostname,
    protocol: location.protocol,
    hasPassword,
    formActions,
    title: document.title,
  }
}

function removeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove()
}

const OVERLAY_CSS = `
  :host { all: initial; }
  .wrap {
    position: fixed; inset: 0; z-index: 2147483646;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,.6); font-family: system-ui, sans-serif;
  }
  .card {
    max-width: 28rem; margin: 1rem; padding: 1.25rem; border-radius: 12px;
    background: #fff; color: #111; box-shadow: 0 8px 32px rgba(0,0,0,.2);
  }
  h2 { margin: 0 0 .5rem; font-size: 1.125rem; }
  p { margin: 0 0 1rem; font-size: .875rem; line-height: 1.4; }
  .actions { display: flex; flex-direction: column; gap: .5rem; }
  button {
    padding: .5rem .75rem; border-radius: 8px; border: 1px solid #ccc;
    font-size: .875rem; cursor: pointer; background: #f5f5f5; color: #111;
  }
  button.primary { background: #111; color: #fff; border-color: #111; }
  .banner {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483645;
    padding: .75rem 1rem; background: #fef3c7; color: #78350f; font-size: .8125rem;
    display: flex; align-items: center; justify-content: space-between; gap: .5rem;
    font-family: system-ui, sans-serif;
  }
  .banner.danger { background: #fee2e2; color: #7f1d1d; }
`

const OVERLAY_COPY: Record<OverlayKind, { title: string; body: string; modal: boolean }> = {
  lookalike: {
    title: 'Suspicious sign-in page',
    body: 'This page asks for a password but the address does not match the real {brand}. Leaving is recommended.',
    modal: true,
  },
  lookalikeLow: {
    title: '',
    body: 'This page may not be secure. Check the address before entering a password.',
    modal: false,
  },
  techscam: {
    title: 'Fake security alert blocked',
    body: 'This page shows a fake virus or "computer locked" warning to make you call a scam phone number. Your computer is not locked. Do not call the number or install anything it asks for.',
    modal: true,
  },
  clipboard: {
    title: '',
    body: 'Blocked: this page tried to copy a hidden command to your clipboard. Never paste commands from a website into Run, Terminal or PowerShell.',
    modal: false,
  },
}

function button(action: string, label: string, primary = false): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.dataset.action = action
  el.textContent = label
  if (primary) el.className = 'primary'
  return el
}

function renderOverlay(kind: OverlayKind, brand?: string): void {
  removeOverlay()
  const copy = OVERLAY_COPY[kind]
  const root = document.createElement('div')
  root.id = OVERLAY_ID
  const shadow = root.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = OVERLAY_CSS
  const panel = document.createElement('div')
  const body = copy.body.replace('{brand}', brand ?? 'service')

  if (copy.modal) {
    panel.className = 'wrap'
    panel.setAttribute('role', 'alertdialog')
    panel.setAttribute('aria-modal', 'true')
    const card = document.createElement('div')
    card.className = 'card'
    const title = document.createElement('h2')
    title.textContent = copy.title
    const text = document.createElement('p')
    text.textContent = body
    const actions = document.createElement('div')
    actions.className = 'actions'
    actions.append(button('leave', 'Leave this site', true), button('trust', 'I trust this site'))
    card.append(title, text, actions)
    panel.append(card)
  } else {
    panel.className = kind === 'clipboard' ? 'banner danger' : 'banner'
    panel.setAttribute('role', 'alert')
    const text = document.createElement('span')
    text.textContent = body
    panel.append(text, button('dismiss', 'Dismiss'))
  }

  shadow.append(style, panel)
  document.documentElement.appendChild(root)

  shadow.querySelector('[data-action="leave"]')?.addEventListener('click', () => {
    window.location.href = 'about:blank'
  })
  shadow.querySelector('[data-action="trust"]')?.addEventListener('click', () => {
    send({ type: 'PROTECTION_TRUST_SITE', host: location.hostname })
    removeOverlay()
  })
  shadow.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => removeOverlay())
}

function postLockdown(): void {
  window.postMessage({ [PAGE_COMMAND_KEY]: 'lockdown' }, location.origin || '*')
}

function flagTechScam(): void {
  if (decided) return
  decided = true
  stopObserving()
  postLockdown()
  renderOverlay('techscam')
  report('techscam')
}

function checkScamText(): void {
  if (decided || state.scamGuard === false || !isActive()) return
  const text = document.body?.textContent?.slice(0, SCAM_TEXT_SLICE) ?? ''
  if (assessScamText(location.hostname, document.title, text).level === 'high') flagTechScam()
}

function checkLookalike(): void {
  if (decided || state.lookalike === false || !isActive()) return
  const verdict = assessPage(collectSignals())
  if (verdict.level === 'none') return
  decided = true
  stopObserving()
  if (verdict.level === 'high') {
    renderOverlay('lookalike', verdict.brand)
    report('lookalike')
  } else {
    renderOverlay('lookalikeLow')
  }
}

function stopObserving(): void {
  observer?.disconnect()
  observer = null
}

function runChecks(): void {
  lastCheckRun = Date.now()
  checksScheduled = false
  checkScamText()
  checkLookalike()
  if (!decided && observer && Date.now() - observerStartedAt > OBSERVER_IDLE_MS) stopObserving()
}

function scheduleChecks(): void {
  if (checksScheduled || decided) return
  const now = Date.now()
  const delay = Math.max(0, CHECK_COALESCE_MS - (now - lastCheckRun))
  checksScheduled = true
  window.setTimeout(() => {
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 0)
    idle(runChecks)
  }, delay)
}

function startTopFrameChecks(): void {
  if (!IS_TOP || observer) return
  observerStartedAt = Date.now()
  scheduleChecks()
  window.setTimeout(checkScamText, SCAM_RECHECK_MS)
  observer = new MutationObserver(() => {
    if (!decided) scheduleChecks()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

function onPageSignal(event: MessageEvent): void {
  if (event.source !== window || !isActive()) return
  const data = event.data as Record<string, unknown> | null
  const kind = data && typeof data === 'object' ? data[PAGE_MESSAGE_KEY] : undefined
  if (kind === 'lockdown' && IS_TOP && state.scamGuard !== false) {
    flagTechScam()
  } else if (kind === 'clipboard' && state.clipboardGuard !== false) {
    if (IS_TOP) renderOverlay('clipboard')
    report('clipboard')
  } else if (kind === 'notification' && state.notificationGuard !== false) {
    report('notification')
  }
}

function onGesture(event: Event): void {
  if (!event.isTrusted || state.downloadGuard === false || state.enabled === false) return
  const now = Date.now()
  if (now - lastGestureSent < GESTURE_THROTTLE_MS) return
  lastGestureSent = now
  send({ type: 'PROTECTION_GESTURE', host: location.hostname })
}

function apply(next: Partial<ProtectionState> | undefined): void {
  state = next ?? {}
  if (!isActive()) {
    decided = false
    stopObserving()
    removeOverlay()
    return
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTopFrameChecks, { once: true })
  } else {
    startTopFrameChecks()
  }
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxProtectionHeuristics) {
  guarded.__toolboxProtectionHeuristics = true
  window.addEventListener('message', onPageSignal)
  window.addEventListener('pointerdown', onGesture, true)
  window.addEventListener('keydown', onGesture, true)
  chrome.storage.local.get('protection', (result) =>
    apply(result.protection as Partial<ProtectionState> | undefined),
  )
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.protection) {
      apply(changes.protection.newValue as Partial<ProtectionState> | undefined)
    }
  })
}
