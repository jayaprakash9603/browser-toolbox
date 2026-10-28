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
/**
 * Words design systems use for the help text beside a field (Bootstrap `form-text`, MUI `helperText`,
 * Ant `form-item-extra`, Material `mat-hint`, SLDS `__help`, Jenkins `form-description`).
 */
export const DESCRIPTION_WORDS = new Set([
  'desc',
  'description',
  'descr',
  'help',
  'helper',
  'helptext',
  'helpertext',
  'helpblock',
  'formtext',
  'hint',
  'note',
  'notes',
  'instruction',
  'instructions',
  'extra',
  'tip',
  'tips',
  'subtext',
  'subtitle',
  'explanation',
  'assist',
  'assistive',
])
/** Attributes in which a field or its wrapper states its own help text. */
export const DESCRIPTION_ATTRIBUTES = ['aria-description', 'description', 'data-description', 'data-help', 'data-hint']
/** Words naming a box that narrows the list beside it (a filter or search box) rather than a value of its own. */
export const FILTER_WORDS = new Set(['filter', 'search', 'find', 'lookup', 'typeahead', 'quicksearch'])
/** Words that mark a caption as the field's name, outranking a help word beside them (`label help-sibling`). */
export const LABEL_WORDS = new Set(['label', 'lbl', 'title', 'caption', 'legend', 'name', 'prompt', 'question'])
/** A caption is not read through more text than this; longer blocks are content, not labels. */
export const MAX_CAPTION_SOURCE = 400

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
