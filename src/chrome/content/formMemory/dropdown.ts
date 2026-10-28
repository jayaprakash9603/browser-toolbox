import { ANY_FIELD, OPTION_SELECTOR, OPTION_TICKS, OPTION_WAIT_MS, POPUP_SELECTOR } from './constants'
import { fieldsWithin, isField } from './detect'
import { shown } from './dom'
import { dismiss, press } from './events'
import { clip, same, wait } from './text'

/** The arrow or calendar icon beside a box, which often opens the list when the box does not. */
function toggleFor(trigger: Element): Element | null {
  const next = trigger.nextElementSibling
  for (const sibling of [next, next?.nextElementSibling, trigger.previousElementSibling]) {
    if (!sibling || isField(sibling) || fieldsWithin(sibling, []) || !shown(sibling)) continue
    if (sibling.matches('button, [role=button], [aria-haspopup]') || !clip(sibling.textContent ?? '')) return sibling
  }
  return null
}

function optionRoots(trigger: Element, added: Element[]): Element[] {
  const roots: Element[] = []
  for (const attr of ['aria-controls', 'aria-owns']) {
    for (const id of (trigger.getAttribute(attr) ?? '').split(/\s+/)) {
      const target = id ? document.getElementById(id) : null
      if (target) roots.push(target)
    }
  }
  let node = trigger.parentElement
  for (let depth = 0; node && node !== document.body && depth < 2; depth += 1, node = node.parentElement) roots.push(node)
  return [...roots, ...added]
}

/** The innermost visible element that reads `text`: in the list the box controls, beside it, or newly rendered. */
function findOption(trigger: Element, text: string, added: Element[]): HTMLElement | null {
  const pool: Element[] = [...document.querySelectorAll(OPTION_SELECTOR)]
  for (const root of optionRoots(trigger, added)) pool.push(root, ...root.querySelectorAll('*'))
  const seen = new Set<Element>()
  let best: HTMLElement | null = null
  for (const el of pool) {
    if (seen.has(el)) continue
    seen.add(el)
    if (!(el instanceof HTMLElement) || el === trigger || el.contains(trigger) || el.matches(ANY_FIELD)) continue
    if (trigger.contains(el) && !el.closest(`${POPUP_SELECTOR}, ${OPTION_SELECTOR}`)) continue
    if (!same(el.textContent ?? '', text) && !same(el.getAttribute('title') ?? '', text)) continue
    if (best && !best.contains(el)) continue
    if (shown(el)) best = el
  }
  return best
}

/** Opens a dropdown the way a user would and clicks the item that reads `text`. */
export async function choose(trigger: HTMLElement, text: string, done: () => boolean): Promise<boolean> {
  const added: Element[] = []
  const observer = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) added.push(node)
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  const openers = [
    () => press(trigger),
    () => {
      const toggle = toggleFor(trigger)
      if (toggle) press(toggle)
    },
  ]
  try {
    // Round 0 looks for a list that is already open; later rounds open it first.
    for (let round = 0; round <= openers.length; round += 1) {
      if (round > 0) openers[round - 1]()
      for (let tick = 0; tick < (round === 0 ? 1 : OPTION_TICKS); tick += 1) {
        if (round > 0) await wait(OPTION_WAIT_MS)
        const option = findOption(trigger, text, added)
        if (!option) continue
        press(option)
        for (let check = 0; check < 4 && !done(); check += 1) await wait(OPTION_WAIT_MS)
        if (done()) return true
        break
      }
    }
    return false
  } finally {
    observer.disconnect()
    if (!done()) dismiss(trigger)
  }
}
