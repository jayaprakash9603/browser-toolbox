import { forget } from './cache'
import { collect } from './collect'
import { ANY_FIELD, WIDGET_SELECTOR } from './constants'
import { eligible, widgetOf, widgetType } from './detect'
import { isCheckable, isControl } from './dom'
import { nodesOf } from './entry'
import { pageScope } from './scope'
import { capture, widgetValue } from './values'

/** Wait after the last edit before sending it, so typing a word is one capture. */
const FLUSH_MS = 700
/** Wait after a click or key for a picker to write its value from script. */
const SCAN_MS = 400

/** The field an event belongs to: the control itself, or the div widget it happened inside. */
function fieldFor(target: EventTarget | undefined): Element | null {
  if (eligible(target)) return target
  if (!(target instanceof Element)) return null
  const host = target.closest('[role=radio]')?.closest('[role=radiogroup]') ?? target.closest(WIDGET_SELECTOR)
  return host && widgetType(host) ? host : null
}

/** A comparable snapshot of what a field holds. */
function signature(el: Element): string {
  const type = widgetType(el)
  if (type && el instanceof HTMLElement) return JSON.stringify(widgetValue(widgetOf(el, type)).value)
  if (el instanceof HTMLSelectElement) return [...el.selectedOptions].map((option) => option.value).join('\n')
  if (el instanceof HTMLInputElement && isCheckable(el)) return String(el.checked)
  if (el instanceof HTMLInputElement && el.type === 'file') return [...(el.files ?? [])].map((file) => file.name).join('\n')
  return isControl(el) ? el.value : ''
}

/** A calendar button or icon usually sits right beside the field it fills: at most two fields close by. */
function fieldsBeside(target: EventTarget | undefined): Element[] {
  let node = target instanceof Element ? target : null
  for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
    const fields = new Set([...node.querySelectorAll(ANY_FIELD)].map(fieldFor).filter((item) => item !== null))
    if (fields.size > 0) return fields.size <= 2 ? [...fields] : []
  }
  return []
}

/** Once the extension is reloaded or removed, this frame's old copy can no longer reach it. */
function alive(): boolean {
  try {
    return Boolean(chrome.runtime?.id)
  } catch {
    return false
  }
}

/** Starts sending what the user enters in this frame to the background, once per frame. */
export function watch(): void {
  const scope = pageScope()
  if (scope.__tbxFormMemory?.alive()) return
  const touched = new Set<Element>()
  // Fields the user clicked, focused or opened a picker beside, with the value they held then;
  // a script changing one of these (a date picker, a lookup) is acting for the user.
  const armed = new Map<Element, string>()
  let timer = 0
  let scanTimer = 0

  const arm = (el: Element) => {
    if (!armed.has(el)) armed.set(el, signature(el))
  }
  const rebase = () => {
    for (const el of armed.keys()) armed.set(el, signature(el))
  }

  async function flush(): Promise<void> {
    window.clearTimeout(timer)
    timer = 0
    if (touched.size === 0) return
    if (!alive()) {
      teardown()
      return
    }
    const edited = new Set(touched)
    touched.clear()
    const entries = collect().filter((entry) => nodesOf(entry).some((node) => edited.has(node)))
    if (entries.length === 0) return
    const fields = await capture(entries)
    void chrome.runtime
      .sendMessage({ type: 'FORM_MEMORY_CAPTURE', url: location.href, title: document.title, fields })
      .catch(() => undefined)
  }

  function schedule(): void {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void flush(), FLUSH_MS)
  }

  function scan(): void {
    scanTimer = 0
    if (!alive()) {
      teardown()
      return
    }
    if (scope.__tbxFormMemoryQuiet) {
      scanTimer = window.setTimeout(scan, SCAN_MS)
      return
    }
    forget()
    for (const [el, before] of armed) {
      if (!el.isConnected) {
        armed.delete(el)
        continue
      }
      const now = signature(el)
      if (now === before) continue
      armed.set(el, now)
      touched.add(el)
    }
    if (touched.size > 0) schedule()
  }

  function onEdit(event: Event): void {
    if (!event.isTrusted || scope.__tbxFormMemoryQuiet) return
    forget()
    const field = fieldFor(event.composedPath()[0])
    if (!field) return
    touched.add(field)
    armed.set(field, signature(field))
    schedule()
  }

  function onArm(event: Event): void {
    if (!event.isTrusted) return
    forget()
    const target = event.composedPath()[0]
    const field = fieldFor(target)
    if (field) arm(field)
    else fieldsBeside(target).forEach(arm)
  }

  // Pickers write the value from script after a click or key, which fires no trusted input event.
  function onSettle(event: Event): void {
    if (!event.isTrusted) return
    if (event instanceof KeyboardEvent && event.key !== 'Enter') return
    window.clearTimeout(scanTimer)
    scanTimer = window.setTimeout(scan, SCAN_MS)
  }

  const onHidden = () => {
    if (document.visibilityState === 'hidden') void flush()
  }
  const onFlush = () => void flush()
  const documentListeners: [string, EventListener][] = [
    ['input', onEdit],
    ['change', onEdit],
    ['pointerdown', onArm],
    ['focusin', onArm],
    ['click', onSettle],
    ['focusout', onSettle],
    ['keyup', onSettle],
    ['submit', onFlush],
  ]

  function teardown(): void {
    for (const [type, listener] of documentListeners) document.removeEventListener(type, listener, true)
    document.removeEventListener('visibilitychange', onHidden)
    window.removeEventListener('pagehide', onFlush)
  }

  for (const [type, listener] of documentListeners) document.addEventListener(type, listener, true)
  window.addEventListener('pagehide', onFlush)
  document.addEventListener('visibilitychange', onHidden)
  scope.__tbxFormMemory = { alive, rebase }
}
