import type { CapturedField, MemoryField, MemoryFieldKind, MemoryValue } from '@/core/form-memory/model'
import type { StoredFormFile } from '@/core/form-memory/files'

export type FormPageAction = 'fill' | 'clear' | 'inspect' | 'snapshot'

export interface FormPageArgs {
  action: FormPageAction
  fields?: MemoryField[]
  shared?: MemoryField[]
  /** Contents of remembered files, by id, for the file fields being filled. */
  files?: Record<string, StoredFormFile>
  /** Replace values already on the page (an explicit fill) instead of only filling empty controls. */
  overwrite?: boolean
  /** Keep filling controls that render late, as single-page apps do. */
  retry?: boolean
  /** Start remembering what the user enters on this page. */
  watch?: boolean
  /** A short toast to show in this frame. */
  notice?: string
  brand?: string
  /** Toast for controls that rendered after the first pass; `{count}` is replaced. */
  late?: { one: string; other: string }
}

export interface FormPageResult {
  ok: boolean
  filled: number
  cleared: number
  /** Fillable controls visible on the page. */
  total: number
  /** Visible fields holding a value the extension remembers, i.e. what Clear would empty. */
  populated: number
  /** Saved fields that have a control on this page. */
  matched: number
  fields?: CapturedField[]
}

export type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Controls built from divs and ARIA roles instead of form elements. */
export type WidgetType = 'check' | 'radios' | 'combo' | 'editable'

export interface Widget {
  type: WidgetType
  host: HTMLElement
  /** The radios of a `radios` widget. */
  items: HTMLElement[]
}

export interface Entry {
  key: string
  kind: MemoryFieldKind
  /** Native controls: one, or every radio of a group. Empty for widgets. */
  els: Control[]
  widget?: Widget
}

export interface FieldValue {
  value: MemoryValue
  display?: string
}

export interface WatchScope {
  alive: () => boolean
  /** Treat what is on the page now as the starting point, e.g. after the extension filled it. */
  rebase?: () => void
}

/**
 * Globals on the frame's isolated-world `window`, which outlives each injection of the page script,
 * so a watcher or a counter set by one run is still seen by the next.
 */
export interface FormMemoryPageScope {
  __tbxFormMemory?: WatchScope
  /** Above zero while the extension itself is filling or clearing. */
  __tbxFormMemoryQuiet?: number
  /** Set by the page script; the background calls it after injecting the script. */
  __tbxFormMemoryRun?: (args: FormPageArgs) => Promise<FormPageResult>
}
