import type { Control } from './types'

/** Frameworks (React, Vue) track the value through the prototype setter, not the instance property. */
export function setNative(el: Control, prop: 'value' | 'checked', value: string | boolean): void {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), prop)
  if (descriptor?.set) descriptor.set.call(el, value)
  else (el as unknown as Record<string, unknown>)[prop] = value
}

export function fire(el: Control): void {
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
}

/** The pointer and mouse sequence of a real click; div widgets listen for any one of these. */
export function press(el: Element): void {
  const init = { bubbles: true, cancelable: true, composed: true, button: 0 }
  const Pointer = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent
  el.dispatchEvent(new Pointer('pointerdown', init))
  el.dispatchEvent(new MouseEvent('mousedown', init))
  if (el instanceof HTMLElement) el.focus({ preventScroll: true })
  el.dispatchEvent(new Pointer('pointerup', init))
  el.dispatchEvent(new MouseEvent('mouseup', init))
  el.dispatchEvent(new MouseEvent('click', init))
}

export function dismiss(trigger: HTMLElement): void {
  const init = { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, composed: true }
  trigger.dispatchEvent(new KeyboardEvent('keydown', init))
  trigger.dispatchEvent(new KeyboardEvent('keyup', init))
  trigger.blur()
}

export function flash(el: Element, color: string): void {
  try {
    el.animate([{ boxShadow: `0 0 0 3px ${color}` }, { boxShadow: '0 0 0 0 transparent' }], {
      duration: 1100,
      easing: 'ease-out',
    })
  } catch {
    /* decoration only */
  }
}
