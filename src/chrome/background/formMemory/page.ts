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
  /** Fillable controls on the page. */
  total: number
  /** Text controls that hold a value right now. */
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
  interface Entry {
    key: string
    kind: MemoryFieldKind
    els: Control[]
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
  const NOT_LABEL = 'button, [role=button], script, style, noscript, template, svg, option, input, select, textarea'
  /** Text this long is an instruction or paragraph, not the name of a field. */
  const MAX_LABEL_SOURCE = 120
  const MAX_SIBLING_STEPS = 4
  const MAX_LABEL_DEPTH = 5
  /** Keep in sync with MAX_FILE_BYTES in core/form-memory/files.ts. */
  const MAX_FILE_BYTES = 1024 * 1024
  const MAX_FILES = 5
  const FILL_COLOR = 'rgb(16 185 129 / 0.55)'
  const CLEAR_COLOR = 'rgb(148 163 184 / 0.6)'

  const scope = window as unknown as { __tbxFormMemory?: WatchScope; __tbxFormMemoryQuiet?: boolean }
  // Frames get their own address in field keys so their fields never collide with the page's.
  const framePrefix = window.top === window ? '' : `${location.host}${location.pathname}>`

  const clip = (value: string, max = 120) => value.replace(/\s+/g, ' ').trim().slice(0, max)
  const trimLabel = (value: string) => value.replace(/^[\s*]+|[\s:*\uFF1A]+$/gu, '')
  const hasWords = (value: string) => /[\p{L}\p{N}]/u.test(value)
  const norm = (value: string | undefined) => (value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

  function isSensitive(el: Control): boolean {
    if (SENSITIVE_AUTO.test((el.getAttribute('autocomplete') ?? '').toLowerCase())) return true
    return SENSITIVE.test(el.name) || SENSITIVE.test(el.id)
  }

  function isControl(el: unknown): el is Control {
    if (el instanceof HTMLInputElement) return !SKIP_TYPES.has((el.type || 'text').toLowerCase())
    return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  }

  function eligible(el: unknown): el is Control {
    if (!isControl(el)) return false
    if (el.closest('[data-tbx-form-memory-ignore]')) return false
    return !isSensitive(el)
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

  function isCheckable(el: Control): boolean {
    return el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')
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

  function hidden(el: Element): boolean {
    if (el.closest('[hidden], [aria-hidden="true"]')) return true
    const style = getComputedStyle(el)
    return style.display === 'none' || style.visibility === 'hidden'
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
    if (node.querySelector(FIELD_SELECTOR)) return ''
    return shortText(node.textContent ?? '') || shortText(node.getAttribute('title') ?? '')
  }

  /** The nearest caption beside `start`; `null` when another field sits in between. */
  function siblingCaption(start: Node, forward: boolean, onlyLabels: boolean, skip: Set<string>): string | null {
    let steps = 0
    for (
      let node = forward ? start.nextSibling : start.previousSibling;
      node && steps < MAX_SIBLING_STEPS;
      node = forward ? node.nextSibling : node.previousSibling
    ) {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
      if (node instanceof Element && (node.matches(FIELD_SELECTOR) || node.querySelector(FIELD_SELECTOR))) return null
      steps += 1
      if (onlyLabels && !(node instanceof HTMLLabelElement)) continue
      const text = captionOf(node)
      if (text && !skip.has(text)) return text
    }
    return ''
  }

  function holdsOtherFields(container: Element, own: Control[]): boolean {
    for (const field of container.querySelectorAll(FIELD_SELECTOR)) {
      if (!own.includes(field as Control)) return true
    }
    return false
  }

  /**
   * Walks outward from the field: a caption before it at each level (a sibling div, a table cell,
   * a heading text node), stopping once a level also holds another field, since anything beyond
   * that belongs to the group rather than this field.
   */
  function nearbyLabel(own: Control[], start: Element, captionAfter: boolean, skip = new Set<string>()): NearbyLabel | null {
    let node = start
    for (let depth = 0; depth < MAX_LABEL_DEPTH; depth += 1) {
      // A checkbox caption follows it; looking back first would pick up the previous box's caption.
      const after = captionAfter ? siblingCaption(node, true, false, skip) : ''
      if (after) return { text: after, depth }
      const before = siblingCaption(node, false, false, skip)
      if (before) return { text: before, depth }
      const label = captionAfter ? '' : siblingCaption(node, true, true, skip)
      if (label) return { text: label, depth }
      const parent = node.parentElement
      if (before === null || !parent || parent === document.body || holdsOtherFields(parent, own)) return null
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

  function ownLabel(el: Control): string {
    const aria = ariaLabel(el)
    if (aria) return aria
    for (const label of el.labels ?? []) {
      const text = labelText(label)
      if (text) return text
    }
    const near = nearbyLabel([el], el, isCheckable(el))
    const placeholder = clip(el.getAttribute('placeholder') ?? el.getAttribute('aria-placeholder') ?? '')
    // A caption several levels up may be a section title; a placeholder names the field itself.
    if (near && (near.depth < 2 || !placeholder)) return near.text
    if (placeholder) return placeholder
    return columnLabel(el) || clip(el.title)
  }

  function groupLabel(el: Control): string {
    const group = el.closest('fieldset, [role=radiogroup], [role=group]')
    if (!group) return ''
    return labelText(group.querySelector('legend')) || ariaLabel(group)
  }

  function optionLabel(el: HTMLInputElement): string {
    for (const label of el.labels ?? []) {
      const text = labelText(label)
      if (text) return text
    }
    return ariaLabel(el) || siblingCaption(el, true, false, new Set()) || el.value
  }

  function radioLabel(entry: Entry): string {
    const first = entry.els[0]
    const group = groupLabel(first)
    if (group) return group
    // Option captions sit next to each radio, so they must not be mistaken for the question.
    const options = new Set(entry.els.map((radio) => optionLabel(radio as HTMLInputElement)))
    return nearbyLabel(entry.els, first, false, options)?.text || humanize(first.name) || 'Choice'
  }

  function fieldLabel(entry: Entry): string {
    if (entry.kind === 'radio') return radioLabel(entry)
    const el = entry.els[0]
    return ownLabel(el) || humanize(el.name) || humanize(stableId(el.id)) || el.name || entry.kind
  }

  function controlsIn(root: Document | ShadowRoot, out: Control[]): void {
    root.querySelectorAll('input, textarea, select').forEach((el) => {
      if (eligible(el)) out.push(el)
    })
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) controlsIn(el.shadowRoot, out)
    })
  }

  function collect(): Entry[] {
    const controls: Control[] = []
    controlsIn(document, controls)
    const entries: Entry[] = []
    const radios = new Map<string, Entry>()
    const used = new Map<string, number>()
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
      let key = `${framePrefix}${kind}:${base}`
      if (kind === 'checkbox' && el.value && el.value !== 'on') key += `=${el.value}`
      const seen = used.get(key) ?? 0
      used.set(key, seen + 1)
      if (seen > 0) key += `#${seen + 1}`
      entries.push({ key, kind, els: [el] })
    }
    return entries
  }

  function currentValue(entry: Entry): { value: MemoryValue; display?: string } {
    const el = entry.els[0]
    if (entry.kind === 'radio') {
      const checked = entry.els.find((radio) => (radio as HTMLInputElement).checked) as HTMLInputElement | undefined
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
    const el = entry.els[0]
    return {
      key: entry.key,
      kind: entry.kind,
      name: el.name || undefined,
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
        if (entry.kind !== 'file') return field
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

  function flash(el: Control, color: string): void {
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
    const el = entry.els[0]
    if (entry.kind === 'text' || entry.kind === 'textarea') return el.value.trim() !== ''
    if (entry.kind === 'checkbox') return (el as HTMLInputElement).checked
    if (entry.kind === 'radio') return entry.els.some((radio) => (radio as HTMLInputElement).checked)
    if (entry.kind === 'file') return ((el as HTMLInputElement).files?.length ?? 0) > 0
    return false
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

  function apply(entry: Entry, field: MemoryField, overwrite: boolean): boolean {
    const el = entry.els[0]
    if (entry.kind !== field.kind) return false
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
    setNative(el, 'value', value)
    fire(el)
    flash(el, FILL_COLOR)
    return true
  }

  /** Read-only controls are only cleared when the extension filled them, never the page's own values. */
  function clearEntry(entry: Entry, remembered: boolean): boolean {
    const el = entry.els[0]
    if (entry.kind === 'radio') {
      const checked = entry.els.filter((radio) => (radio as HTMLInputElement).checked && writable(radio, remembered))
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
    const el = entry.els[0]
    const auto = (el.getAttribute('autocomplete') ?? '').toLowerCase()
    const usefulAuto = auto && !/^(on|off)$/.test(auto) ? auto : ''
    const name = el.name.toLowerCase()
    const label = norm(fieldLabel(entry))
    return shared.find(
      (field) =>
        field.kind === entry.kind &&
        ((usefulAuto && field.auto?.toLowerCase() === usefulAuto) ||
          (name && field.name?.toLowerCase() === name) ||
          (label && norm(field.label) === label)),
    )
  }

  function fillPass(fields: MemoryField[], shared: MemoryField[], overwrite: boolean, done: Set<string>): number {
    const entries = collect()
    const byKey = new Map(entries.map((entry) => [entry.key, entry]))
    let filled = 0
    for (const field of fields) {
      if (done.has(field.key)) continue
      const entry = byKey.get(field.key)
      if (!entry) continue
      done.add(field.key)
      if (apply(entry, field, overwrite)) filled += 1
    }
    if (shared.length > 0) {
      for (const entry of entries) {
        if (done.has(entry.key) || hasValue(entry)) continue
        const field = sharedFor(entry, shared)
        if (!field) continue
        done.add(entry.key)
        if (apply(entry, field, false)) filled += 1
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

  function watch(): void {
    if (scope.__tbxFormMemory?.alive()) return
    const alive = () => {
      try {
        return Boolean(chrome.runtime?.id)
      } catch {
        return false
      }
    }
    const touched = new Set<Control>()
    // Fields the user clicked, focused or opened a picker beside, with the value they held then;
    // a script changing one of these (a date picker, a lookup) is acting for the user.
    const armed = new Map<Control, string>()
    let timer = 0
    let scanTimer = 0
    const signature = (el: Control) => {
      if (el instanceof HTMLSelectElement) return [...el.selectedOptions].map((option) => option.value).join('\n')
      if (isCheckable(el)) return String((el as HTMLInputElement).checked)
      if (el instanceof HTMLInputElement && el.type === 'file') return [...(el.files ?? [])].map((file) => file.name).join('\n')
      return el.value
    }
    const arm = (el: Control) => {
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
      const entries = collect().filter((entry) => entry.els.some((el) => edited.has(el)))
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
      const target = event.composedPath()[0]
      if (!eligible(target)) return
      touched.add(target)
      armed.set(target, signature(target))
      schedule()
    }

    function onArm(event: Event): void {
      if (!event.isTrusted) return
      const target = event.composedPath()[0]
      if (eligible(target)) {
        arm(target)
        return
      }
      // A calendar button or icon usually sits right beside the field it fills.
      let node = target instanceof Element ? target : null
      for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
        const fields = [...node.querySelectorAll(FIELD_SELECTOR)].filter(eligible)
        if (fields.length === 0) continue
        if (fields.length <= 2) for (const field of fields) arm(field)
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
    const quietly = <T>(change: () => T): T => {
      scope.__tbxFormMemoryQuiet = true
      try {
        return change()
      } finally {
        scope.__tbxFormMemoryQuiet = false
        // Watchers injected by an older build have no rebase.
        scope.__tbxFormMemory?.rebase?.()
      }
    }
    if (args.action === 'fill') {
      const shared = args.shared ?? []
      const done = new Set<string>()
      result.filled = quietly(() => fillPass(fields, shared, Boolean(args.overwrite), done))
      const pending = () => fields.some((field) => !done.has(field.key))
      if (args.retry && pending()) {
        const first = result.filled
        let total = first
        const delays = [600, 1500, 3200]
        const step = (index: number) => {
          window.setTimeout(
            () => {
              total += quietly(() => fillPass(fields, [], false, done))
              if (index + 1 < delays.length && pending()) step(index + 1)
              else if (total > first && args.late) {
                toast((total === 1 ? args.late.one : args.late.other).replace('{count}', String(total)))
              }
            },
            delays[index] - (index > 0 ? delays[index - 1] : 0),
          )
        }
        step(0)
      }
    } else if (args.action === 'clear') {
      const remembered = new Set(fields.map((field) => field.key))
      result.cleared = quietly(() => collect().filter((entry) => clearEntry(entry, remembered.has(entry.key))).length)
    }
    const entries = collect()
    result.total = entries.length
    result.populated = entries.filter((entry) => (entry.kind === 'text' || entry.kind === 'textarea') && hasValue(entry)).length
    const keys = new Set(entries.map((entry) => entry.key))
    result.matched = fields.filter((field) => keys.has(field.key)).length
    if (args.action === 'snapshot') {
      // Boxes left at their default say nothing about the user; only ticks and deliberate unticks count.
      const chosen = entries.filter((entry) => {
        if (entry.kind !== 'checkbox') return true
        const box = entry.els[0] as HTMLInputElement
        return box.checked || box.checked !== box.defaultChecked
      })
      result.fields = (await capture(chosen)).filter((field) =>
        Array.isArray(field.value) ? field.value.length > 0 : field.value !== '',
      )
    }
  } catch {
    result.ok = false
  }
  return result
}
