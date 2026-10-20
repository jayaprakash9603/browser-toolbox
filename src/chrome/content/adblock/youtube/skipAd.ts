import { YOUTUBE_SKIP_BUTTON_SELECTORS } from './selectors'

export function isSkipElementClickable(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  if (el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled')) return false
  if (el.classList.contains('ytp-ad-skip-button-disabled')) return false
  const container = el.closest('.ytp-ad-skip-button-container')
  if (container?.classList.contains('ytp-ad-skip-button-disabled')) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false
  const rect = el.getBoundingClientRect()
  return rect.width >= 2 && rect.height >= 2
}

function playerRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#movie_player, .html5-video-player')
}

export function findSkipButton(): HTMLElement | null {
  const scope = playerRoot() ?? document
  for (const selector of YOUTUBE_SKIP_BUTTON_SELECTORS) {
    const el = scope.querySelector<HTMLElement>(selector)
    if (el && isSkipElementClickable(el)) return el
  }
  for (const el of scope.querySelectorAll<HTMLElement>(
    'button, div[role="button"], span[role="button"], .ytp-button',
  )) {
    const label = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.toLowerCase()
    if (!/\bskip\b/.test(label)) continue
    if (isSkipElementClickable(el)) return el
  }
  return null
}

export function forceClick(el: HTMLElement): void {
  try {
    el.click()
  } catch {
    /* player may reject direct click */
  }
  const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window, buttons: 1 }
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const) {
    el.dispatchEvent(new MouseEvent(type, opts))
  }
}

/** Click “Skip ad” in the page context (MAIN world). Returns true if a click was attempted. */
export function tryAutoSkipAd(): boolean {
  const button = findSkipButton()
  if (!button) return false
  forceClick(button)
  return true
}
