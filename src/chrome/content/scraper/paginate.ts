import { waitForDataQuiet } from './waitForData'

export async function clickNextButton(
  selector: string,
  rowSelector: string,
  maxWaitMs: number,
): Promise<{ ok: boolean; navigated: boolean }> {
  let el: Element | null = null
  try {
    el = document.querySelector(selector)
  } catch {
    return { ok: false, navigated: false }
  }
  if (!el || !(el instanceof HTMLElement)) return { ok: false, navigated: false }
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    return { ok: false, navigated: false }
  }
  const beforeUrl = location.href
  el.scrollIntoView({ block: 'center', behavior: 'instant' })
  el.click()
  await waitForDataQuiet(rowSelector, Math.min(maxWaitMs, 8000))
  const navigated = location.href !== beforeUrl
  return { ok: true, navigated }
}

export async function scrollForMore(
  rowSelector: string,
  maxWaitMs: number,
): Promise<{ ok: boolean; grew: boolean }> {
  let before = 0
  try {
    before = document.querySelectorAll(rowSelector).length
  } catch {
    return { ok: false, grew: false }
  }
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  await waitForDataQuiet(rowSelector, maxWaitMs)
  let after = before
  try {
    after = document.querySelectorAll(rowSelector).length
  } catch {
    return { ok: false, grew: false }
  }
  return { ok: true, grew: after > before }
}
