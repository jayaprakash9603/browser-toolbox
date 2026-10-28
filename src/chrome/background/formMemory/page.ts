import type { CapturedField, CapturedFile, MemoryField, MemoryFieldKind, MemoryValue } from '@/core/form-memory/model'
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

/**
 * Runs inside every frame through `chrome.scripting.executeScript`, so it must stay self-contained:
 * no imports and no references to anything outside this function.
 */
export async function runFormMemoryPage(args: FormPageArgs): Promise<FormPageResult> {
  type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  /** Controls built from divs and ARIA roles instead of form elements. */
  type WidgetType = 'check' | 'radios' | 'combo' | 'editable'
  interface Widget {
    type: WidgetType
    host: HTMLElement
    /** The radios of a `radios` widget. */
    items: HTMLElement[]
  }
  interface Entry {
    key: string
    kind: MemoryFieldKind
    /** Native controls: one, or every radio of a group. Empty for widgets. */
    els: Control[]
    widget?: Widget
  }
  interface NearbyLabel {
    text: string
    depth: number
  }
  interface WatchScope {
    alive: () => boolean
    /** Treat what is on the page now as the starting point, e.g. after the extension filled it. */
    rebase?: () => void
  }

  const SKIP_TYPES = new Set(['password', 'hidden', 'submit', 'button', 'reset', 'image'])
  const SENSITIVE =
    /pass(word|wd|code)?\b|^pw$|otp|one.?time|cvv|cvc|\bcsc\b|card.?(num|no)|cc.?num|\bssn\b|captcha|csrf|xsrf|token|secret|\bpin\b|\biban\b/i
  const SENSITIVE_AUTO = /(^|\s)(cc-|one-time-code|current-password|new-password)/
  const FIELD_SELECTOR =
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select'
  const EDITABLE_SELECTOR = '[contenteditable=""], [contenteditable=true], [contenteditable=plaintext-only]'
  const WIDGET_SELECTOR = `[role=checkbox], [role=switch], [role=radiogroup], [role=combobox], [aria-haspopup=listbox], ${EDITABLE_SELECTOR}`
  const ANY_FIELD = `${FIELD_SELECTOR}, ${WIDGET_SELECTOR}`
  /** Floating lists that belong to some other control. */
  const POPUP_SELECTOR = '[role=listbox], [role=menu], [role=tree], [role=tooltip]'
  const OPTION_SELECTOR = '[role=option], [role=menuitem], [role=menuitemradio], [role=treeitem]'
  const NOT_LABEL = `button, [role=button], script, style, noscript, template, svg, option, input, select, textarea, ${POPUP_SELECTOR}, ${OPTION_SELECTOR}`
  /** Text this long is an instruction or paragraph, not the name of a field. */
  const MAX_LABEL_SOURCE = 120
  const MAX_SIBLING_STEPS = 4
  const MAX_LABEL_DEPTH = 5
  /** More editable regions than this means a document editor, not a form. */
  const MAX_EDITABLES = 10
  /** Keep in sync with MAX_FILE_BYTES in core/form-memory/files.ts. */
  const MAX_FILE_BYTES = 1024 * 1024
  const MAX_FILES = 5
  /** A dropdown gets this many short waits to render its items after it is opened. */
  const OPTION_TICKS = 8
  const OPTION_WAIT_MS = 50
  const FILL_COLOR = 'rgb(16 185 129 / 0.55)'
  const CLEAR_COLOR = 'rgb(148 163 184 / 0.6)'
  const WIDGET_KIND: Record<WidgetType, MemoryFieldKind> = {
    check: 'checkbox',
    radios: 'radio',
    combo: 'select',
    editable: 'textarea',
  }

  const scope = window as unknown as { __tbxFormMemory?: WatchScope; __tbxFormMemoryQuiet?: number }
  // Frames get their own address in field keys so their fields never collide with the page's.
  const framePrefix = window.top === window ? '' : `${location.host}${location.pathname}>`
  // Structural checks walk the DOM a lot; each collect starts these over.
  const memo = {
    aux: new Map<Element, boolean>(),
    calendar: new Map<Element, boolean>(),
    widget: new Map<Element, WidgetType | null>(),
  }
  let editablesAllowed = true

  const clip = (value: string, max = 120) =>
    value
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  const trimLabel = (value: string) => value.replace(/^[\s*]+|[\s:*\uFF1A]+$/gu, '')
  const hasWords = (value: string) => /[\p{L}\p{N}]/u.test(value)
  const norm = (value: string | undefined) => (value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const same = (a: string, b: string) => clip(a, 500).toLowerCase() === clip(b, 500).toLowerCase()
  const quote = (value: string) => value.replace(/["\\]/g, '\\$&')
  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
  const looksLikeDate = (value: string) =>
    value.length <= 40 && /\d{1,4}\s*[-/.,\s]\s*(\d{1,2}|\p{L}{3,9})\.?\s*[-/.,\s]\s*\d{2,4}/u.test(value)

  function forget(): void {
    memo.aux.clear()
    memo.calendar.clear()
    memo.widget.clear()
  }

  function isSensitive(el: Element): boolean {
    if (SENSITIVE_AUTO.test((el.getAttribute('autocomplete') ?? '').toLowerCase())) return true
    return SENSITIVE.test(el.getAttribute('name') ?? '') || SENSITIVE.test(el.id)
  }

  function isControl(el: unknown): el is Control {
    if (el instanceof HTMLInputElement) return !SKIP_TYPES.has((el.type || 'text').toLowerCase())
    return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  }

  function isCheckable(el: Element): boolean {
    if (el instanceof HTMLInputElement) return el.type === 'checkbox' || el.type === 'radio'
    return ['checkbox', 'switch', 'radio'].includes(el.getAttribute('role') ?? '')
  }

  /** A text box whose value comes from a list or calendar the page opens for it. */
  function isPicker(el: Element): el is HTMLInputElement {
    if (!(el instanceof HTMLInputElement) || !isControl(el) || isCheckable(el) || el.type === 'file') return false
    const autocomplete = el.getAttribute('aria-autocomplete') ?? ''
    return (
      el.readOnly ||
      el.getAttribute('role') === 'combobox' ||
      el.hasAttribute('aria-haspopup') ||
      autocomplete === 'list' ||
      autocomplete === 'both'
    )
  }

  function shown(el: Element): boolean {
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return false
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
    return true
  }

  /** Laid out on the page: not inside a hidden tab, collapsed section, template or closed dialog. */
  function rendered(el: Element): boolean {
    if (typeof el.checkVisibility !== 'function') return shown(el)
    if (!el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })) return false
    // Zero-sized or parked far off the page: honeypots and stashed copies of a field.
    const box = el.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) return false
    return box.right + window.scrollX > 0 && box.bottom + window.scrollY > 0
  }

  /** Styled checkboxes, file pickers and selects (chosen.js) hide the real control behind a face of their own. */
  function onScreen(el: Element): boolean {
    if (rendered(el)) return true
    const reskinned = el instanceof HTMLSelectElement || isCheckable(el) || (el instanceof HTMLInputElement && el.type === 'file')
    if (!reskinned || !el.parentElement || !rendered(el.parentElement)) return false
    if (labelsOf(el).some(rendered)) return true
    return [el.nextElementSibling, el.previousElementSibling].some((face) => face && !isField(face) && rendered(face))
  }

  function hidden(el: Element): boolean {
    if (el.closest('[hidden], [aria-hidden="true"]')) return true
    const style = getComputedStyle(el)
    return style.display === 'none' || style.visibility === 'hidden'
  }

  /** A month grid: 28 or more day numbers in cells of their own. */
  function holdsCalendar(node: Element): boolean {
    const cached = memo.calendar.get(node)
    if (cached !== undefined) return cached
    const days = new Set<number>()
    for (const cell of node.querySelectorAll('td, a, button, span, div, [role=gridcell]')) {
      if (cell.childElementCount > 1) continue
      const text = (cell.textContent ?? '').trim()
      const day = /^\d{1,2}$/.test(text) ? Number(text) : 0
      if (day >= 1 && day <= 31) days.add(day)
    }
    const found = days.size >= 28
    memo.calendar.set(node, found)
    return found
  }

  function controlledElsewhere(node: Element, el: Element): boolean {
    if (!node.id) return false
    const id = quote(node.id)
    const owner = document.querySelector(`[aria-controls~="${id}"], [aria-owns~="${id}"]`)
    return Boolean(owner && owner !== el && !owner.contains(el))
  }

  /**
   * The search box inside a dropdown and the month and year selects of a calendar serve another
   * control; they are never what the user wants remembered, and never a field of their own.
   */
  function auxiliary(el: Element): boolean {
    const cached = memo.aux.get(el)
    if (cached !== undefined) return cached
    let found = Boolean(el.closest(POPUP_SELECTOR))
    let node = el.parentElement
    for (let depth = 0; !found && node && node !== document.body && depth < 6; depth += 1, node = node.parentElement) {
      // A dropdown panel usually sits right after the box that opens it.
      for (let sibling = node.previousElementSibling, steps = 0; sibling && steps < 6; sibling = sibling.previousElementSibling, steps += 1) {
        if (isPicker(sibling)) found = true
      }
      if (controlledElsewhere(node, el)) found = true
      if (depth < 4 && node.querySelectorAll(FIELD_SELECTOR).length <= 4 && holdsCalendar(node)) found = true
    }
    memo.aux.set(el, found)
    return found
  }

  function eligible(el: unknown): el is Control {
    if (!isControl(el)) return false
    if (el.closest('[data-tbx-form-memory-ignore]')) return false
    // Hidden proxy inputs behind styled widgets (MUI, Headless UI) mirror a value the widget owns.
    if (el instanceof HTMLInputElement && el.getAttribute('aria-hidden') === 'true') return false
    return !isSensitive(el) && !auxiliary(el)
  }

  /** A styled shell around a hidden select or picker input (select2, Headless UI) repeats that control. */
  function mirrorsNative(el: Element): boolean {
    let node = el.parentElement
    for (let depth = 0; node && node !== document.body && depth < 3; depth += 1, node = node.parentElement) {
      for (const control of node.querySelectorAll('select, input')) {
        if (control instanceof HTMLSelectElement || isPicker(control)) return true
      }
    }
    return false
  }

  function detectWidget(el: Element): WidgetType | null {
    if (!(el instanceof HTMLElement) || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return null
    if (el instanceof HTMLSelectElement || el.closest('[data-tbx-form-memory-ignore]') || isSensitive(el)) return null
    if (el.matches(EDITABLE_SELECTOR)) {
      return editablesAllowed && !el.parentElement?.closest(EDITABLE_SELECTOR) ? 'editable' : null
    }
    if (el.closest(`${EDITABLE_SELECTOR}, ${POPUP_SELECTOR}`)) return null
    // A role on a wrapper around a real control (ARIA 1.1 combobox) describes that control.
    if (el.querySelector(FIELD_SELECTOR)) return null
    const role = el.getAttribute('role')
    if (role === 'checkbox' || role === 'switch') return 'check'
    if (role === 'radiogroup') return el.querySelector('[role=radio]') ? 'radios' : null
    if (role === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox') return mirrorsNative(el) ? null : 'combo'
    return null
  }

  function widgetType(el: Element): WidgetType | null {
    if (!memo.widget.has(el)) memo.widget.set(el, detectWidget(el))
    return memo.widget.get(el) ?? null
  }

  function widgetOf(host: HTMLElement, type: WidgetType): Widget {
    return { type, host, items: type === 'radios' ? [...host.querySelectorAll<HTMLElement>('[role=radio]')] : [] }
  }

  /** Anything a caption search must not reach across. */
  function isField(el: Element): boolean {
    return (el.matches(FIELD_SELECTOR) && !auxiliary(el)) || widgetType(el) !== null
  }

  function fieldsWithin(container: Element, own: Element[]): boolean {
    for (const el of container.querySelectorAll(ANY_FIELD)) {
      if (!own.includes(el) && isField(el)) return true
    }
    return false
  }

  /** Generated ids (React `:r1:`, `ext-comp-1042`, hashes) change between loads, so they cannot key a field. */
  function stableId(id: string): string {
    return id && !/\d{3,}|:|[0-9a-f]{8,}/i.test(id) ? id : ''
  }

  function humanize(raw: string): string {
    const words = raw
      .replace(/\[\]$/, '')
      .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
      .replace(/[_\-.[\]]+/g, ' ')
      .trim()
    if (!hasWords(words) || /\d{3,}/.test(words)) return ''
    return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
  }

  function labelText(label: Element | null): string {
    if (!label) return ''
    const copy = label.cloneNode(true) as Element
    copy.querySelectorAll('input, select, textarea, option, button').forEach((node) => node.remove())
    return trimLabel(clip(copy.textContent ?? ''))
  }

  function labelsOf(el: Element): Element[] {
    if (isControl(el) && el.labels) return [...el.labels]
    return el.id ? [...document.querySelectorAll(`label[for="${quote(el.id)}"]`)] : []
  }

  function shortText(raw: string): string {
    const text = raw.replace(/\s+/g, ' ').trim()
    if (text.length > MAX_LABEL_SOURCE) return ''
    const label = trimLabel(text)
    return hasWords(label) ? label : ''
  }

  /** What a node beside a field says, when it reads like a caption rather than another control. */
  function captionOf(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return shortText(node.textContent ?? '')
    if (!(node instanceof Element) || node.matches(NOT_LABEL) || hidden(node)) return ''
    if (isField(node) || fieldsWithin(node, [])) return ''
    return shortText(node.textContent ?? '') || shortText(node.getAttribute('title') ?? '')
  }

  /** The nearest caption beside `start`; `null` when another field sits in between. */
  function siblingCaption(start: Node, forward: boolean, onlyLabels: boolean, skip: Set<string>, own: Element[]): string | null {
    let steps = 0
    for (
      let node = forward ? start.nextSibling : start.previousSibling;
      node && steps < MAX_SIBLING_STEPS;
      node = forward ? node.nextSibling : node.previousSibling
    ) {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
      if (node instanceof Element && ((!own.includes(node) && isField(node)) || fieldsWithin(node, own))) return null
      steps += 1
      if (onlyLabels && !(node instanceof HTMLLabelElement)) continue
      const text = captionOf(node)
      if (text && !skip.has(text)) return text
    }
    return ''
  }

  /**
   * Walks outward from the field: a caption before it at each level (a sibling div, a table cell,
   * a heading text node), stopping once a level also holds another field, since anything beyond
   * that belongs to the group rather than this field.
   */
  function nearbyLabel(own: Element[], start: Element, captionAfter: boolean, skip = new Set<string>()): NearbyLabel | null {
    let node = start
    for (let depth = 0; depth < MAX_LABEL_DEPTH; depth += 1) {
      // A checkbox caption follows it; looking back first would pick up the previous box's caption.
      const after = captionAfter ? siblingCaption(node, true, false, skip, own) : ''
      if (after) return { text: after, depth }
      const before = siblingCaption(node, false, false, skip, own)
      if (before) return { text: before, depth }
      const label = captionAfter ? '' : siblingCaption(node, true, true, skip, own)
      if (label) return { text: label, depth }
      const parent = node.parentElement
      if (before === null || !parent || parent === document.body || fieldsWithin(parent, own)) return null
      node = parent
    }
    return null
  }

  function columnLabel(el: Element): string {
    const cell = el.closest('td')
    const table = cell?.closest('table')
    if (!cell || !table) return ''
    const header = table.tHead?.rows[0] ?? (table.rows[0] !== cell.parentElement ? table.rows[0] : undefined)
    const th = header?.cells[cell.cellIndex]
    return th ? captionOf(th) : ''
  }

  function ariaLabel(el: Element): string {
    const aria = el.getAttribute('aria-label')
    if (aria?.trim()) return trimLabel(clip(aria))
    const by = el.getAttribute('aria-labelledby')
    if (!by) return ''
    return trimLabel(clip(by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')))
  }

  function placeholderOf(el: Element): string {
    return clip(el.getAttribute('placeholder') ?? el.getAttribute('aria-placeholder') ?? el.getAttribute('data-placeholder') ?? '')
  }

  function ownLabel(el: Element): string {
    const aria = ariaLabel(el)
    if (aria) return aria
    for (const label of labelsOf(el)) {
      const text = labelText(label)
      if (text) return text
    }
    const near = nearbyLabel([el], el, isCheckable(el))
    const placeholder = placeholderOf(el)
    // A caption several levels up may be a section title; a placeholder names the field itself.
    if (near && (near.depth < 2 || !placeholder)) return near.text
    if (placeholder) return placeholder
    return columnLabel(el) || clip(el.getAttribute('title') ?? '')
  }

  function groupLabel(el: Element): string {
    const group = el.closest('fieldset, [role=radiogroup], [role=group]')
    if (!group) return ''
    return labelText(group.querySelector('legend')) || ariaLabel(group)
  }

  function isChecked(el: Element): boolean {
    return el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true'
  }

  function optionLabel(el: Element): string {
    for (const label of labelsOf(el)) {
      const text = labelText(label)
      if (text) return text
    }
    if (!(el instanceof HTMLInputElement)) return ariaLabel(el) || clip(el.textContent ?? '')
    return ariaLabel(el) || siblingCaption(el, true, false, new Set(), [el]) || el.value
  }

  function radioValue(el: Element): string {
    if (el instanceof HTMLInputElement) return el.value
    return el.getAttribute('data-value') ?? el.getAttribute('value') ?? optionLabel(el)
  }

  const nodesOf = (entry: Entry): Element[] => (entry.widget ? [entry.widget.host, ...entry.widget.items] : entry.els)
  const visible = (entry: Entry): boolean => (entry.widget ? rendered(entry.widget.host) : entry.els.some(onScreen))
  const firstNode = (entry: Entry): Element => entry.widget?.host ?? entry.els[0]
  const radiosOf = (entry: Entry): Element[] => entry.widget?.items ?? entry.els

  function radioLabel(entry: Entry): string {
    const first = firstNode(entry)
    const group = entry.widget ? ariaLabel(first) : groupLabel(first)
    if (group) return group
    // Option captions sit next to each radio, so they must not be mistaken for the question.
    const options = new Set(radiosOf(entry).map(optionLabel))
    return nearbyLabel(nodesOf(entry), first, false, options)?.text || humanize(first.getAttribute('name') ?? '') || 'Choice'
  }

  function fieldLabel(entry: Entry): string {
    if (entry.kind === 'radio') return radioLabel(entry)
    const el = firstNode(entry)
    const name = el.getAttribute('name') ?? ''
    return ownLabel(el) || humanize(name) || humanize(stableId(el.id)) || name || entry.kind
  }

  function gather(root: Document | ShadowRoot, controls: Control[], widgets: Widget[]): void {
    root.querySelectorAll(`input, textarea, select, ${WIDGET_SELECTOR}`).forEach((el) => {
      if (eligible(el)) controls.push(el)
      else if (el instanceof HTMLElement) {
        const type = widgetType(el)
        if (type) widgets.push(widgetOf(el, type))
      }
    })
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) gather(el.shadowRoot, controls, widgets)
    })
  }

  function collect(): Entry[] {
    forget()
    editablesAllowed = document.querySelectorAll(EDITABLE_SELECTOR).length <= MAX_EDITABLES
    const controls: Control[] = []
    const widgets: Widget[] = []
    gather(document, controls, widgets)
    const entries: Entry[] = []
    const radios = new Map<string, Entry>()
    const used = new Map<string, number>()
    const add = (key: string, entry: Omit<Entry, 'key'>) => {
      const seen = used.get(key) ?? 0
      used.set(key, seen + 1)
      entries.push({ ...entry, key: seen > 0 ? `${key}#${seen + 1}` : key })
    }
    for (const el of controls) {
      const kind = kindOf(el)
      const base = el.name || stableId(el.id) || ownLabel(el) || kind
      if (kind === 'radio') {
        const groupKey = `${framePrefix}radio:${el.name || groupLabel(el) || base}`
        const group = radios.get(groupKey)
        if (group) {
          group.els.push(el)
          continue
        }
        const entry = { key: groupKey, kind, els: [el] }
        radios.set(groupKey, entry)
        entries.push(entry)
        continue
      }
      const value = kind === 'checkbox' && el.value && el.value !== 'on' ? `=${el.value}` : ''
      add(`${framePrefix}${kind}:${base}${value}`, { kind, els: [el] })
    }
    for (const widget of widgets) {
      const kind = WIDGET_KIND[widget.type]
      const entry = { key: '', kind, els: [], widget }
      const host = widget.host
      const named = host.getAttribute('name') || stableId(host.id)
      const base = named || (widget.type === 'radios' ? radioLabel(entry) : ownLabel(host)) || kind
      add(`${framePrefix}${kind}:${base}`, entry)
    }
    return entries
  }

  function kindOf(el: Control): MemoryFieldKind {
    if (el instanceof HTMLSelectElement) return el.multiple ? 'multi' : 'select'
    if (el instanceof HTMLTextAreaElement) return 'textarea'
    const type = el.type.toLowerCase()
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'radio'
    if (type === 'file') return 'file'
    return 'text'
  }

  function editableText(host: HTMLElement): string {
    return (typeof host.innerText === 'string' ? host.innerText : (host.textContent ?? '')).trim()
  }

  /** What a div dropdown shows, minus a placeholder such as "Select…". */
  function shownText(host: HTMLElement): string {
    const text = clip(host.textContent ?? '', 300)
    const placeholder = placeholderOf(host) || clip(host.querySelector('[class*="placeholder" i]')?.textContent ?? '')
    return placeholder && same(text, placeholder) ? '' : text
  }

  function widgetValue({ type, host, items }: Widget): { value: MemoryValue; display?: string } {
    if (type === 'check') return { value: isChecked(host) }
    if (type === 'radios') {
      const checked = items.find(isChecked)
      return { value: checked ? radioValue(checked) : '', display: checked ? optionLabel(checked) : undefined }
    }
    return { value: type === 'combo' ? shownText(host) : editableText(host) }
  }

  function currentValue(entry: Entry): { value: MemoryValue; display?: string } {
    if (entry.widget) return widgetValue(entry.widget)
    const el = entry.els[0]
    if (entry.kind === 'radio') {
      const checked = entry.els.find(isChecked)
      return { value: checked?.value ?? '', display: checked ? optionLabel(checked) : undefined }
    }
    if (entry.kind === 'checkbox') return { value: (el as HTMLInputElement).checked }
    if (entry.kind === 'file') {
      const names = [...((el as HTMLInputElement).files ?? [])].map((file) => file.name)
      return { value: names, display: names.join(', ') || undefined }
    }
    if (entry.kind === 'multi') {
      const options = [...(el as HTMLSelectElement).selectedOptions]
      return { value: options.map((option) => option.value), display: options.map((option) => clip(option.text, 60)).join(', ') }
    }
    if (entry.kind === 'select') {
      const option = (el as HTMLSelectElement).selectedOptions[0]
      return { value: (el as HTMLSelectElement).value, display: option ? clip(option.text, 120) : undefined }
    }
    return { value: el.value }
  }

  function read(entry: Entry): CapturedField {
    const el = firstNode(entry)
    return {
      key: entry.key,
      kind: entry.kind,
      name: el.getAttribute('name') || undefined,
      auto: el.getAttribute('autocomplete') || undefined,
      inputType: el instanceof HTMLInputElement ? el.type : undefined,
      label: fieldLabel(entry),
      ...currentValue(entry),
    }
  }

  async function encodeFiles(input: HTMLInputElement): Promise<CapturedFile[]> {
    const out: CapturedFile[] = []
    for (const file of [...(input.files ?? [])].slice(0, MAX_FILES)) {
      if (file.size > MAX_FILE_BYTES) continue
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
      }
      out.push({ name: file.name, type: file.type, size: file.size, data: btoa(binary) })
    }
    return out
  }

  async function capture(entries: Entry[]): Promise<CapturedField[]> {
    return Promise.all(
      entries.map(async (entry) => {
        const field = read(entry)
        if (entry.kind !== 'file' || entry.widget) return field
        const files = await encodeFiles(entry.els[0] as HTMLInputElement)
        return { ...field, value: files.map((file) => file.name), files }
      }),
    )
  }

  function setNative(el: Control, prop: 'value' | 'checked', value: string | boolean): void {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), prop)
    if (descriptor?.set) descriptor.set.call(el, value)
    else (el as unknown as Record<string, unknown>)[prop] = value
  }

  function fire(el: Control): void {
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  /** The pointer and mouse sequence of a real click; div widgets listen for any one of these. */
  function press(el: Element): void {
    const init = { bubbles: true, cancelable: true, composed: true, button: 0 }
    const Pointer = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent
    el.dispatchEvent(new Pointer('pointerdown', init))
    el.dispatchEvent(new MouseEvent('mousedown', init))
    if (el instanceof HTMLElement) el.focus({ preventScroll: true })
    el.dispatchEvent(new Pointer('pointerup', init))
    el.dispatchEvent(new MouseEvent('mouseup', init))
    el.dispatchEvent(new MouseEvent('click', init))
  }

  function flash(el: Element, color: string): void {
    try {
      el.animate([{ boxShadow: `0 0 0 3px ${color}` }, { boxShadow: '0 0 0 0 transparent' }], {
        duration: 1100,
        easing: 'ease-out',
      })
    } catch {
      /* decoration only */
    }
  }

  /** Date pickers often mark their input read-only so only the calendar can set it. */
  function writable(el: Control, allowReadOnly: boolean): boolean {
    if (el.disabled) return false
    return allowReadOnly || el instanceof HTMLSelectElement || !el.readOnly
  }

  function hasValue(entry: Entry): boolean {
    if (entry.widget) {
      if (entry.widget.type === 'check') return isChecked(entry.widget.host)
      if (entry.widget.type === 'radios') return entry.widget.items.some(isChecked)
      return widgetValue(entry.widget).value !== ''
    }
    const el = entry.els[0]
    if (entry.kind === 'text' || entry.kind === 'textarea') return el.value.trim() !== ''
    if (entry.kind === 'checkbox') return (el as HTMLInputElement).checked
    if (entry.kind === 'radio') return entry.els.some(isChecked)
    if (entry.kind === 'file') return ((el as HTMLInputElement).files?.length ?? 0) > 0
    return false
  }

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

  function dismiss(trigger: HTMLElement): void {
    const init = { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, composed: true }
    trigger.dispatchEvent(new KeyboardEvent('keydown', init))
    trigger.dispatchEvent(new KeyboardEvent('keyup', init))
    trigger.blur()
  }

  /** Opens a dropdown the way a user would and clicks the item that reads `text`. */
  async function choose(trigger: HTMLElement, text: string, done: () => boolean): Promise<boolean> {
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

  function writeEditable(host: HTMLElement, text: string): boolean {
    host.focus()
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(host)
    selection?.removeAllRanges()
    selection?.addRange(range)
    let typed: boolean
    try {
      // Rich editors keep their own model in sync only with edits they see as typing.
      typed = document.execCommand(text ? 'insertText' : 'delete', false, text)
    } catch {
      typed = false
    }
    if (!typed || !same(editableText(host), text)) {
      host.textContent = text
      host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }))
    }
    flash(host, text ? FILL_COLOR : CLEAR_COLOR)
    return true
  }

  function applyFiles(input: HTMLInputElement, field: MemoryField, overwrite: boolean): boolean {
    const stored = (Array.isArray(field.value) ? field.value : [])
      .map((id) => args.files?.[id])
      .filter((file): file is StoredFormFile => Boolean(file))
    if (stored.length === 0 || (!overwrite && (input.files?.length ?? 0) > 0)) return false
    const transfer = new DataTransfer()
    for (const file of input.multiple ? stored : stored.slice(0, 1)) {
      const bytes = Uint8Array.from(atob(file.data), (char) => char.charCodeAt(0))
      transfer.items.add(new File([bytes], file.name, { type: file.type }))
    }
    input.files = transfer.files
    fire(input)
    flash(input, FILL_COLOR)
    return true
  }

  async function applyWidget({ type, host, items }: Widget, field: MemoryField, overwrite: boolean): Promise<boolean> {
    if (host.getAttribute('aria-disabled') === 'true') return false
    if (type === 'check') {
      if (isChecked(host) === field.value) return false
      press(host)
      flash(host, FILL_COLOR)
      return true
    }
    if (type === 'radios') {
      const target = items.find((item) => radioValue(item) === field.value)
      if (!target || isChecked(target) || (!overwrite && items.some(isChecked))) return false
      press(target)
      flash(target, FILL_COLOR)
      return true
    }
    const value = typeof field.value === 'string' ? field.value : ''
    const current = type === 'combo' ? shownText(host) : editableText(host)
    if (same(current, value) || (!overwrite && current !== '')) return false
    if (type === 'editable') return writeEditable(host, value)
    if (!(await choose(host, value, () => same(shownText(host), value)))) return false
    flash(host, FILL_COLOR)
    return true
  }

  async function apply(entry: Entry, field: MemoryField, overwrite: boolean): Promise<boolean> {
    if (entry.kind !== field.kind) return false
    if (entry.widget) return applyWidget(entry.widget, field, overwrite)
    const el = entry.els[0]
    if (entry.kind === 'radio') {
      const target = entry.els.find((radio) => radio.value === field.value) as HTMLInputElement | undefined
      if (!target || target.checked || !writable(target, true)) return false
      if (!overwrite && hasValue(entry)) return false
      target.click()
      flash(target, FILL_COLOR)
      return true
    }
    if (!writable(el, true)) return false
    if (entry.kind === 'file') return applyFiles(el as HTMLInputElement, field, overwrite)
    if (entry.kind === 'checkbox') {
      const input = el as HTMLInputElement
      if (input.checked === field.value) return false
      input.click()
      flash(input, FILL_COLOR)
      return true
    }
    if (entry.kind === 'multi') {
      const wanted = new Set(Array.isArray(field.value) ? field.value : [])
      const select = el as HTMLSelectElement
      let changed = false
      for (const option of select.options) {
        const next = wanted.has(option.value)
        if (option.selected !== next) {
          option.selected = next
          changed = true
        }
      }
      if (changed) {
        fire(select)
        flash(select, FILL_COLOR)
      }
      return changed
    }
    if (entry.kind === 'select') {
      const select = el as HTMLSelectElement
      const options = [...select.options]
      const option =
        options.find((item) => item.value === field.value) ??
        (field.display ? options.find((item) => clip(item.text, 120) === field.display) : undefined)
      if (!option || select.value === option.value) return false
      setNative(select, 'value', option.value)
      fire(select)
      flash(select, FILL_COLOR)
      return true
    }
    const value = typeof field.value === 'string' ? field.value : ''
    if (el.value === value) return false
    if (!overwrite && el.value.trim() !== '') return false
    // A read-only dropdown box only changes the page's model when one of its items is clicked.
    const picked =
      isPicker(el) && el.readOnly && !looksLikeDate(value) && (await choose(el, value, () => same(el.value, value)))
    if (!picked) {
      setNative(el, 'value', value)
      fire(el)
    }
    flash(el, FILL_COLOR)
    return true
  }

  /** Read-only controls and div widgets are only cleared when they hold a remembered value. */
  function clearEntry(entry: Entry, remembered: boolean): boolean {
    if (entry.widget) {
      const { type, host } = entry.widget
      if (!remembered) return false
      if (type === 'check' && isChecked(host)) {
        press(host)
        flash(host, CLEAR_COLOR)
        return true
      }
      return type === 'editable' && editableText(host) !== '' && writeEditable(host, '')
    }
    const el = entry.els[0]
    if (entry.kind === 'radio') {
      const checked = entry.els.filter((radio) => isChecked(radio) && writable(radio, remembered))
      for (const radio of checked) {
        setNative(radio, 'checked', false)
        fire(radio)
        flash(radio, CLEAR_COLOR)
      }
      return checked.length > 0
    }
    if (!writable(el, remembered)) return false
    if (entry.kind === 'checkbox') {
      const input = el as HTMLInputElement
      if (!input.checked) return false
      input.click()
      flash(input, CLEAR_COLOR)
      return true
    }
    if (entry.kind === 'multi') {
      const select = el as HTMLSelectElement
      if (select.selectedOptions.length === 0) return false
      for (const option of select.options) option.selected = false
      fire(select)
      flash(select, CLEAR_COLOR)
      return true
    }
    if (entry.kind === 'select') {
      const select = el as HTMLSelectElement
      const options = [...select.options]
      const blank = options.find((item) => item.value === '') ?? options.find((item) => item.defaultSelected) ?? options[0]
      if (!blank || select.value === blank.value) return false
      setNative(select, 'value', blank.value)
      fire(select)
      flash(select, CLEAR_COLOR)
      return true
    }
    if (entry.kind === 'file' && !hasValue(entry)) return false
    if (el.value === '') return false
    setNative(el, 'value', '')
    fire(el)
    flash(el, CLEAR_COLOR)
    return true
  }

  function sharedFor(entry: Entry, shared: MemoryField[]): MemoryField | undefined {
    const el = firstNode(entry)
    const auto = (el.getAttribute('autocomplete') ?? '').toLowerCase()
    const usefulAuto = auto && !/^(on|off)$/.test(auto) ? auto : ''
    const name = (el.getAttribute('name') ?? '').toLowerCase()
    const label = norm(fieldLabel(entry))
    return shared.find(
      (field) =>
        field.kind === entry.kind &&
        ((usefulAuto && field.auto?.toLowerCase() === usefulAuto) ||
          (name && field.name?.toLowerCase() === name) ||
          (label && norm(field.label) === label)),
    )
  }

  /** One unusual widget must not stop the rest of the form from filling. */
  async function applySafely(entry: Entry, field: MemoryField, overwrite: boolean): Promise<boolean> {
    try {
      return await apply(entry, field, overwrite)
    } catch {
      return false
    }
  }

  async function fillPass(fields: MemoryField[], shared: MemoryField[], overwrite: boolean, done: Set<string>): Promise<number> {
    // Fields on hidden screens stay pending, so a later pass fills them once they are shown.
    const entries = collect().filter(visible)
    const byKey = new Map(entries.map((entry) => [entry.key, entry]))
    let filled = 0
    for (const field of fields) {
      if (done.has(field.key)) continue
      const entry = byKey.get(field.key)
      if (!entry) continue
      done.add(field.key)
      if (await applySafely(entry, field, overwrite)) filled += 1
    }
    if (shared.length > 0) {
      for (const entry of entries) {
        if (done.has(entry.key) || hasValue(entry)) continue
        const field = sharedFor(entry, shared)
        if (!field) continue
        done.add(entry.key)
        if (await applySafely(entry, field, false)) filled += 1
      }
    }
    return filled
  }

  function toast(message: string): void {
    const id = 'tbx-form-memory-toast'
    document.getElementById(id)?.remove()
    const host = document.createElement('div')
    host.id = id
    host.style.cssText = 'all:initial;position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;'
    const root = host.attachShadow({ mode: 'closed' })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    root.innerHTML = `<style>
      .t{display:flex;align-items:center;gap:10px;padding:10px 16px 10px 12px;border-radius:999px;
        font:500 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;color:#f8fafc;background:rgb(15 23 42/.94);
        box-shadow:0 10px 30px -8px rgb(0 0 0/.45);${reduce ? '' : 'animation:in .22s cubic-bezier(.22,1,.36,1);'}}
      .b{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;
        background:#10b981;color:#fff;font-weight:700;font-size:12px}
      .s{color:#94a3b8;font-weight:400}
      @keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    </style><div class="t" role="status"><span class="b" aria-hidden="true">\u2713</span><span></span></div>`
    const label = root.querySelector('.t > span:last-child')
    if (label) {
      label.textContent = message
      if (args.brand) {
        const brand = document.createElement('span')
        brand.className = 's'
        brand.textContent = ` \u00b7 ${args.brand}`
        label.append(brand)
      }
    }
    document.documentElement.append(host)
    window.setTimeout(() => host.remove(), 2600)
  }

  /** The field an event belongs to: the control itself, or the div widget it happened inside. */
  function fieldFor(target: EventTarget | undefined): Element | null {
    if (eligible(target)) return target
    if (!(target instanceof Element)) return null
    const host = target.closest('[role=radio]')?.closest('[role=radiogroup]') ?? target.closest(WIDGET_SELECTOR)
    return host && widgetType(host) ? host : null
  }

  function watch(): void {
    if (scope.__tbxFormMemory?.alive()) return
    const alive = () => {
      try {
        return Boolean(chrome.runtime?.id)
      } catch {
        return false
      }
    }
    const touched = new Set<Element>()
    // Fields the user clicked, focused or opened a picker beside, with the value they held then;
    // a script changing one of these (a date picker, a lookup) is acting for the user.
    const armed = new Map<Element, string>()
    let timer = 0
    let scanTimer = 0
    const signature = (el: Element): string => {
      const type = widgetType(el)
      if (type && el instanceof HTMLElement) return JSON.stringify(widgetValue(widgetOf(el, type)).value)
      if (el instanceof HTMLSelectElement) return [...el.selectedOptions].map((option) => option.value).join('\n')
      if (el instanceof HTMLInputElement && isCheckable(el)) return String(el.checked)
      if (el instanceof HTMLInputElement && el.type === 'file') return [...(el.files ?? [])].map((file) => file.name).join('\n')
      return isControl(el) ? el.value : ''
    }
    const arm = (el: Element) => {
      if (!armed.has(el)) armed.set(el, signature(el))
    }
    const rebase = () => {
      for (const el of armed.keys()) armed.set(el, signature(el))
    }

    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onFlush = () => void flush()
    const teardown = () => {
      document.removeEventListener('input', onEdit, true)
      document.removeEventListener('change', onEdit, true)
      document.removeEventListener('pointerdown', onArm, true)
      document.removeEventListener('focusin', onArm, true)
      document.removeEventListener('click', onSettle, true)
      document.removeEventListener('focusout', onSettle, true)
      document.removeEventListener('keyup', onSettle, true)
      document.removeEventListener('submit', onFlush, true)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onFlush)
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
      timer = window.setTimeout(() => void flush(), 700)
    }

    function scan(): void {
      scanTimer = 0
      if (!alive()) {
        teardown()
        return
      }
      if (scope.__tbxFormMemoryQuiet) {
        scanTimer = window.setTimeout(scan, 400)
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
      if (field) {
        arm(field)
        return
      }
      // A calendar button or icon usually sits right beside the field it fills.
      let node = target instanceof Element ? target : null
      for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
        const fields = new Set([...node.querySelectorAll(ANY_FIELD)].map(fieldFor).filter((item) => item !== null))
        if (fields.size === 0) continue
        if (fields.size <= 2) for (const item of fields) arm(item)
        return
      }
    }

    // Pickers write the value from script after a click or key, which fires no trusted input event.
    function onSettle(event: Event): void {
      if (!event.isTrusted) return
      if (event instanceof KeyboardEvent && event.key !== 'Enter') return
      window.clearTimeout(scanTimer)
      scanTimer = window.setTimeout(scan, 400)
    }

    document.addEventListener('input', onEdit, true)
    document.addEventListener('change', onEdit, true)
    document.addEventListener('pointerdown', onArm, true)
    document.addEventListener('focusin', onArm, true)
    document.addEventListener('click', onSettle, true)
    document.addEventListener('focusout', onSettle, true)
    document.addEventListener('keyup', onSettle, true)
    document.addEventListener('submit', onFlush, true)
    window.addEventListener('pagehide', onFlush)
    document.addEventListener('visibilitychange', onHidden)
    scope.__tbxFormMemory = { alive, rebase }
  }

  const result: FormPageResult = { ok: true, filled: 0, cleared: 0, total: 0, populated: 0, matched: 0 }
  try {
    if (args.watch) watch()
    if (args.notice) toast(args.notice)
    const fields = args.fields ?? []
    /**
     * `click()` on a checkbox or radio makes the browser fire a trusted change event, so the watcher
     * is told to look away while the extension itself fills or clears.
     */
    const quietly = async <T>(change: () => T | Promise<T>): Promise<T> => {
      scope.__tbxFormMemoryQuiet = (scope.__tbxFormMemoryQuiet ?? 0) + 1
      try {
        return await change()
      } finally {
        scope.__tbxFormMemoryQuiet = Math.max(0, (scope.__tbxFormMemoryQuiet ?? 1) - 1)
        // Watchers injected by an older build have no rebase.
        scope.__tbxFormMemory?.rebase?.()
      }
    }
    const savedKeys = new Set(fields.map((field) => field.key))
    const shared = args.shared ?? []
    // Clear only undoes what the extension knows: this page's saved fields and fields a global value fits.
    const remembered = (entry: Entry) => savedKeys.has(entry.key) || sharedFor(entry, shared) !== undefined
    if (args.action === 'fill') {
      const done = new Set<string>()
      result.filled = await quietly(() => fillPass(fields, shared, Boolean(args.overwrite), done))
      const pending = () => fields.some((field) => !done.has(field.key))
      if (args.retry && pending()) {
        const first = result.filled
        let total = first
        const delays = [600, 1500, 3200]
        const step = (index: number) => {
          window.setTimeout(
            () =>
              void quietly(() => fillPass(fields, [], false, done)).then((count) => {
                total += count
                if (index + 1 < delays.length && pending()) step(index + 1)
                else if (total > first && args.late) {
                  toast((total === 1 ? args.late.one : args.late.other).replace('{count}', String(total)))
                }
              }),
            delays[index] - (index > 0 ? delays[index - 1] : 0),
          )
        }
        step(0)
      }
    } else if (args.action === 'clear') {
      result.cleared = await quietly(
        () => collect().filter((entry) => visible(entry) && remembered(entry) && clearEntry(entry, true)).length,
      )
    }
    const entries = collect().filter(visible)
    result.total = entries.length
    result.populated = entries.filter((entry) => remembered(entry) && hasValue(entry)).length
    const keys = new Set(entries.map((entry) => entry.key))
    result.matched = fields.filter((field) => keys.has(field.key)).length
    if (args.action === 'snapshot') {
      // Boxes left at their default say nothing about the user; only ticks and deliberate unticks count.
      const chosen = entries.filter((entry) => {
        if (entry.kind !== 'checkbox') return true
        if (entry.widget) return isChecked(entry.widget.host)
        const box = entry.els[0] as HTMLInputElement
        return box.checked || box.checked !== box.defaultChecked
      })
      result.fields = (await capture(chosen)).filter((field) =>
        Array.isArray(field.value) ? field.value.length > 0 : field.value !== '',
      )
      result.populated = result.fields.length
    }
  } catch {
    result.ok = false
  }
  return result
}
