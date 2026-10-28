import type { WidgetType } from './types'

/** Structural checks walk the DOM a lot; each collect, and each watcher event, starts these over. */
export const memo = {
  aux: new Map<Element, boolean>(),
  calendar: new Map<Element, boolean>(),
  widget: new Map<Element, WidgetType | null>(),
  editablesAllowed: true,
}

export function forget(): void {
  memo.aux.clear()
  memo.calendar.clear()
  memo.widget.clear()
}
