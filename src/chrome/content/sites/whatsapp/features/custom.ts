const LAUNCHER_ID = 'tbx-wa-launcher'
const RAIL_MAX_X = 100
const REMOUNT_DEBOUNCE_MS = 250

const PLUS_SVG =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="11" fill="currentColor"/>' +
  '<path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' +
  '</svg>'

let launcherItem: HTMLElement | null = null
let railObserver: MutationObserver | null = null
let remountTimer: ReturnType<typeof setTimeout> | null = null

/** Buttons in the narrow left navigation rail; label text is localized, so match on position. */
function railButtons(): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const el of document.querySelectorAll<HTMLElement>('button, [role="button"]')) {
    if (el.closest(`#${LAUNCHER_ID}`)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 20 || r.width > 90 || r.height < 20 || r.height > 90) continue
    if (r.right > RAIL_MAX_X) continue
    out.push(el)
  }
  return out
}

/** The rail item wrapping `button`: the highest ancestor that holds no other rail button. */
function railItemFor(button: HTMLElement, all: HTMLElement[]): HTMLElement {
  let item = button
  while (item.parentElement) {
    const parent = item.parentElement
    if (all.some((b) => b !== button && parent.contains(b))) break
    item = parent
  }
  return item
}

/** Last button in the top group of the rail (Meta AI today); bottom buttons are media/profile. */
function findAnchorItem(): HTMLElement | null {
  const buttons = railButtons()
  const topHalf = buttons.filter((b) => b.getBoundingClientRect().top < window.innerHeight / 2)
  if (topHalf.length < 3) return null
  topHalf.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
  return railItemFor(topHalf[topHalf.length - 1], buttons)
}

function createItem(anchor: HTMLElement): HTMLElement {
  const item = document.createElement(anchor.tagName)
  item.id = LAUNCHER_ID
  item.className = anchor.className
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'tbx-wa-launcher'
  btn.title = 'Browser Toolbox'
  btn.setAttribute('aria-label', 'Browser Toolbox')
  btn.innerHTML = PLUS_SVG
  btn.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'WA_OPEN_PANEL' }).catch(() => {})
  })
  item.appendChild(btn)
  return item
}

function ensureLauncher(): void {
  if (launcherItem?.isConnected) return
  const anchor = findAnchorItem()
  if (!anchor) return
  launcherItem?.remove()
  launcherItem = createItem(anchor)
  anchor.insertAdjacentElement('afterend', launcherItem)
}

function scheduleEnsure(): void {
  if (remountTimer) return
  remountTimer = setTimeout(() => {
    remountTimer = null
    ensureLauncher()
  }, REMOUNT_DEBOUNCE_MS)
}

export function mountLauncher(enabled: boolean): void {
  if (!enabled) {
    railObserver?.disconnect()
    railObserver = null
    if (remountTimer) clearTimeout(remountTimer)
    remountTimer = null
    launcherItem?.remove()
    launcherItem = null
    document.getElementById(LAUNCHER_ID)?.remove()
    return
  }
  ensureLauncher()
  if (!railObserver) {
    railObserver = new MutationObserver(() => {
      if (!launcherItem?.isConnected) scheduleEnsure()
    })
    railObserver.observe(document.documentElement, { childList: true, subtree: true })
  }
}
