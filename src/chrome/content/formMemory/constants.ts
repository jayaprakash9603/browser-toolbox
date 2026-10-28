import type { MemoryFieldKind } from '@/core/form-memory/model'

import type { WidgetType } from './types'

export const SKIP_TYPES = new Set(['password', 'hidden', 'submit', 'button', 'reset', 'image'])
export const SENSITIVE =
  /pass(word|wd|code)?\b|^pw$|otp|one.?time|cvv|cvc|\bcsc\b|card.?(num|no)|cc.?num|\bssn\b|captcha|csrf|xsrf|token|secret|\bpin\b|\biban\b/i
export const SENSITIVE_AUTO = /(^|\s)(cc-|one-time-code|current-password|new-password)/

export const FIELD_SELECTOR =
  'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select'
export const EDITABLE_SELECTOR = '[contenteditable=""], [contenteditable=true], [contenteditable=plaintext-only]'
export const WIDGET_SELECTOR = `[role=checkbox], [role=switch], [role=radiogroup], [role=combobox], [aria-haspopup=listbox], ${EDITABLE_SELECTOR}`
export const ANY_FIELD = `${FIELD_SELECTOR}, ${WIDGET_SELECTOR}`
/** Floating lists that belong to some other control. */
export const POPUP_SELECTOR = '[role=listbox], [role=menu], [role=tree], [role=tooltip]'
export const OPTION_SELECTOR = '[role=option], [role=menuitem], [role=menuitemradio], [role=treeitem]'
export const NOT_LABEL = `button, [role=button], script, style, noscript, template, svg, option, input, select, textarea, ${POPUP_SELECTOR}, ${OPTION_SELECTOR}`
export const IGNORE_SELECTOR = '[data-tbx-form-memory-ignore]'

/** Text this long is an instruction or paragraph, not the name of a field. */
export const MAX_LABEL_SOURCE = 120
export const MAX_SIBLING_STEPS = 4
export const MAX_LABEL_DEPTH = 5
/** More editable regions than this means a document editor, not a form. */
export const MAX_EDITABLES = 10
export const MAX_FILES = 5

/** A dropdown gets this many short waits to render its items after it is opened. */
export const OPTION_TICKS = 8
export const OPTION_WAIT_MS = 50
/** Pauses before filling controls that render late, as single-page apps do. */
export const RETRY_DELAYS_MS = [600, 1500, 3200]

export const FILL_COLOR = 'rgb(16 185 129 / 0.55)'
export const CLEAR_COLOR = 'rgb(148 163 184 / 0.6)'

export const WIDGET_KIND: Record<WidgetType, MemoryFieldKind> = {
  check: 'checkbox',
  radios: 'radio',
  combo: 'select',
  editable: 'textarea',
}
