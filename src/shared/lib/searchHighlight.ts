export const SEARCH_HIGHLIGHT_MS = 3200

/** Scrolls an element into view and pulses it so users can see where search landed. */
export function highlightSearchTarget(el: HTMLElement, scroll = true): number {
  if (scroll) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  // Restart the animation if the same element is targeted twice in a row.
  el.classList.remove('search-highlight')
  void el.offsetWidth
  el.classList.add('search-highlight')
  return window.setTimeout(() => el.classList.remove('search-highlight'), SEARCH_HIGHLIGHT_MS)
}
