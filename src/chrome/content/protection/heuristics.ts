import { assessPage } from '@/core/protection/heuristics'
import type { RiskLevel } from '@/core/protection/heuristics'

type GuardedWindow = Window & { __toolboxProtectionHeuristics?: boolean }

const OVERLAY_ID = 'toolbox-protection-overlay'

function collectSignals(): {
  host: string
  protocol: string
  hasPassword: boolean
  formActions: string[]
  title: string
} {
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

function reportLookalike(host: string): void {
  try {
    void chrome.runtime
      .sendMessage({ type: 'PROTECTION_REPORT', category: 'lookalike', host, source: 'heuristic' })
      .catch(() => {})
  } catch {
    /* extension reloaded */
  }
}

function removeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove()
}

function renderOverlay(level: RiskLevel, brand?: string): void {
  removeOverlay()
  const host = document.documentElement
  const root = document.createElement('div')
  root.id = OVERLAY_ID
  const shadow = root.attachShadow({ mode: 'closed' })
  const panel = document.createElement('div')
  panel.setAttribute('role', 'alertdialog')
  panel.setAttribute('aria-modal', 'true')
  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    .wrap {
      position: fixed; inset: 0; z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.55); font-family: system-ui, sans-serif;
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
      font-size: .875rem; cursor: pointer; background: #f5f5f5;
    }
    button.primary { background: #111; color: #fff; border-color: #111; }
    .banner {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483645;
      padding: .75rem 1rem; background: #fef3c7; color: #78350f; font-size: .8125rem;
      display: flex; align-items: center; justify-content: space-between; gap: .5rem;
    }
  `
  if (level === 'high') {
    panel.innerHTML = `
      <div class="wrap">
        <div class="card">
          <h2>Suspicious sign-in page</h2>
          <p>This page asks for a password but the address does not match the real ${brand ?? 'service'}. Leaving is recommended.</p>
          <div class="actions">
            <button type="button" class="primary" data-action="leave">Leave this site</button>
            <button type="button" data-action="trust">I trust this site</button>
          </div>
        </div>
      </div>`
  } else {
    panel.innerHTML = `
      <div class="banner">
        <span>This page may not be secure. Check the address before entering a password.</span>
        <button type="button" data-action="dismiss">Dismiss</button>
      </div>`
  }
  shadow.append(style, panel)
  host.appendChild(root)

  shadow.querySelector('[data-action="leave"]')?.addEventListener('click', () => {
    window.location.href = 'about:blank'
  })
  shadow.querySelector('[data-action="trust"]')?.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'PROTECTION_TRUST_SITE', host: location.hostname })
    removeOverlay()
  })
  shadow.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => removeOverlay())

  if (level === 'high') reportLookalike(location.hostname.replace(/^www\./, ''))
}

let decided = false
let observer: MutationObserver | null = null

function runCheck(): void {
  if (decided || window.top !== window) return
  const verdict = assessPage(collectSignals())
  if (verdict.level === 'none') return
  decided = true
  observer?.disconnect()
  observer = null
  renderOverlay(verdict.level, verdict.brand)
}

function scheduleCheck(): void {
  const idle =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 0)
  idle(() => runCheck())
}

function start(): void {
  scheduleCheck()
  observer = new MutationObserver(() => {
    if (!decided) scheduleCheck()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

interface StoredProtection {
  enabled?: boolean
  lookalike?: boolean
}

function shouldRun(state: StoredProtection | undefined): boolean {
  if (state?.enabled === false || state?.lookalike === false) return false
  return true
}

function apply(state: StoredProtection | undefined): void {
  if (!shouldRun(state)) {
    decided = false
    observer?.disconnect()
    observer = null
    removeOverlay()
    return
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else start()
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxProtectionHeuristics) {
  guarded.__toolboxProtectionHeuristics = true
  chrome.storage.local.get('protection', (result) => apply(result.protection as StoredProtection))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.protection) {
      apply(changes.protection.newValue as StoredProtection)
    }
  })
}
