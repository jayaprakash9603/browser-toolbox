import type { CapturedField, MemoryField, MemoryFieldKind } from '@/core/form-memory/model'

export type FormPageAction = 'fill' | 'clear' | 'inspect' | 'snapshot'

export interface FormPageArgs {
  action: FormPageAction
  fields?: MemoryField[]
  shared?: MemoryField[]
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
 * Runs inside the page through `chrome.scripting.executeScript`, so it must stay self-contained:
 * no imports and no references to anything outside this function.
 */
export function runFormMemoryPage(args: FormPageArgs): FormPageResult {
  type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  interface Entry {
    key: string
    kind: MemoryFieldKind
    els: Control[]
  }

  const SKIP_TYPES = new Set(['password', 'hidden', 'file', 'submit', 'button', 'reset', 'image'])
  const SENSITIVE =
    /pass(word|wd|code)?\b|^pw$|otp|one.?time|cvv|cvc|\bcsc\b|card.?(num|no)|cc.?num|\bssn\b|captcha|csrf|xsrf|token|secret|\bpin\b|\biban\b/i
  const SENSITIVE_AUTO = /(^|\s)(cc-|one-time-code|current-password|new-password)/

  const clip = (value: string, max = 120) => value.replace(/\s+/g, ' ').trim().slice(0, max)

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
    return 'text'
  }

  function labelText(label: Element | null): string {
    if (!label) return ''
    const copy = label.cloneNode(true) as Element
    copy.querySelectorAll('input, select, textarea, option, button').forEach((node) => node.remove())
    return clip(copy.textContent ?? '')
  }

  function ownLabel(el: Control): string {
    const aria = el.getAttribute('aria-label')
    if (aria?.trim()) return clip(aria)
    const by = el.getAttribute('aria-labelledby')
    if (by) {
      const text = clip(by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '))
      if (text) return text
    }
    const fromLabel = labelText(el.labels?.[0] ?? null)
    if (fromLabel) return fromLabel
    const placeholder = el.getAttribute('placeholder')
    if (placeholder?.trim()) return clip(placeholder)
    if (el.title.trim()) return clip(el.title)
    return ''
  }

  function groupLabel(el: Control): string {
    const group = el.closest('fieldset, [role=radiogroup], [role=group]')
    if (group) {
      const legend = group.querySelector('legend')
      const text = labelText(legend) || clip(group.getAttribute('aria-label') ?? '')
      if (text) return text
    }
    return ''
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
      const base = el.name || el.id || ownLabel(el) || kind
      if (kind === 'radio') {
        const groupKey = `radio:${el.name || groupLabel(el) || base}`
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
      let key = `${kind}:${base}`
      if (kind === 'checkbox' && el.value && el.value !== 'on') key += `=${el.value}`
      const seen = used.get(key) ?? 0
      used.set(key, seen + 1)
      if (seen > 0) key += `#${seen + 1}`
      entries.push({ key, kind, els: [el] })
    }
    return entries
  }

  function optionLabel(el: HTMLInputElement): string {
    return labelText(el.labels?.[0] ?? null) || clip(el.getAttribute('aria-label') ?? '') || el.value
  }

  function read(entry: Entry): CapturedField {
    const el = entry.els[0]
    const auto = el.getAttribute('autocomplete') ?? undefined
    const common = {
      key: entry.key,
      kind: entry.kind,
      name: el.name || undefined,
      auto: auto || undefined,
      inputType: el instanceof HTMLInputElement ? el.type : undefined,
    }
    if (entry.kind === 'radio') {
      const checked = entry.els.find((radio) => (radio as HTMLInputElement).checked) as HTMLInputElement | undefined
      return {
        ...common,
        label: groupLabel(el) || el.name || ownLabel(el) || 'Choice',
        value: checked?.value ?? '',
        display: checked ? optionLabel(checked) : undefined,
      }
    }
    const label = ownLabel(el) || el.name || el.id || entry.kind
    if (entry.kind === 'checkbox') return { ...common, label, value: (el as HTMLInputElement).checked }
    if (entry.kind === 'multi') {
      const options = [...(el as HTMLSelectElement).selectedOptions]
      return {
        ...common,
        label,
        value: options.map((option) => option.value),
        display: options.map((option) => clip(option.text, 60)).join(', '),
      }
    }
    if (entry.kind === 'select') {
      const option = (el as HTMLSelectElement).selectedOptions[0]
      return { ...common, label, value: (el as HTMLSelectElement).value, display: option ? clip(option.text, 120) : undefined }
    }
    return { ...common, label, value: el.value }
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
      el.animate(
        [{ boxShadow: `0 0 0 3px ${color}` }, { boxShadow: '0 0 0 0 transparent' }],
        { duration: 1100, easing: 'ease-out' },
      )
    } catch {
      /* decoration only */
    }
  }

  const FILL_COLOR = 'rgb(16 185 129 / 0.55)'
  const CLEAR_COLOR = 'rgb(148 163 184 / 0.6)'

  function writable(el: Control): boolean {
    if (el.disabled) return false
    return el instanceof HTMLSelectElement || !el.readOnly
  }

  function hasValue(entry: Entry): boolean {
    const el = entry.els[0]
    if (entry.kind === 'text' || entry.kind === 'textarea') return el.value.trim() !== ''
    if (entry.kind === 'checkbox') return (el as HTMLInputElement).checked
    if (entry.kind === 'radio') return entry.els.some((radio) => (radio as HTMLInputElement).checked)
    return false
  }

  function apply(entry: Entry, field: MemoryField, overwrite: boolean): boolean {
    const el = entry.els[0]
    if (entry.kind !== field.kind) return false
    if (entry.kind === 'radio') {
      const target = entry.els.find((radio) => radio.value === field.value) as HTMLInputElement | undefined
      if (!target || target.checked || !writable(target)) return false
      if (!overwrite && hasValue(entry)) return false
      target.click()
      flash(target, FILL_COLOR)
      return true
    }
    if (!writable(el)) return false
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

  function clearEntry(entry: Entry): boolean {
    const el = entry.els[0]
    if (entry.kind === 'radio') {
      const checked = entry.els.filter((radio) => (radio as HTMLInputElement).checked && writable(radio))
      for (const radio of checked) {
        setNative(radio, 'checked', false)
        fire(radio)
        flash(radio, CLEAR_COLOR)
      }
      return checked.length > 0
    }
    if (!writable(el)) return false
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
    if (el.value === '') return false
    setNative(el, 'value', '')
    fire(el)
    flash(el, CLEAR_COLOR)
    return true
  }

  const norm = (value: string | undefined) => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  function sharedFor(entry: Entry, shared: MemoryField[]): MemoryField | undefined {
    const el = entry.els[0]
    const auto = (el.getAttribute('autocomplete') ?? '').toLowerCase()
    const usefulAuto = auto && !/^(on|off)$/.test(auto) ? auto : ''
    const name = el.name.toLowerCase()
    const label = norm(read(entry).label)
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
    </style><div class="t" role="status"><span class="b" aria-hidden="true">✓</span><span></span></div>`
    const label = root.querySelector('.t > span:last-child')
    if (label) {
      label.textContent = message
      if (args.brand) {
        const brand = document.createElement('span')
        brand.className = 's'
        brand.textContent = ` · ${args.brand}`
        label.append(brand)
      }
    }
    document.documentElement.append(host)
    window.setTimeout(() => host.remove(), 2600)
  }

  function watch(): void {
    const scope = window as unknown as { __tbxFormMemory?: { alive: () => boolean } }
    if (scope.__tbxFormMemory?.alive()) return
    const alive = () => {
      try {
        return Boolean(chrome.runtime?.id)
      } catch {
        return false
      }
    }
    const touched = new Set<Control>()
    let timer = 0
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    const teardown = () => {
      document.removeEventListener('input', onEdit, true)
      document.removeEventListener('change', onEdit, true)
      document.removeEventListener('submit', flush, true)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', flush)
    }
    function flush(): void {
      window.clearTimeout(timer)
      timer = 0
      if (touched.size === 0) return
      if (!alive()) {
        teardown()
        return
      }
      const edited = new Set(touched)
      touched.clear()
      const fields = collect()
        .filter((entry) => entry.els.some((el) => edited.has(el)))
        .map(read)
      if (fields.length === 0) return
      void chrome.runtime
        .sendMessage({ type: 'FORM_MEMORY_CAPTURE', url: location.href, title: document.title, fields })
        .catch(() => undefined)
    }
    function onEdit(event: Event): void {
      if (!event.isTrusted) return
      const target = event.composedPath()[0]
      if (!eligible(target)) return
      touched.add(target)
      window.clearTimeout(timer)
      timer = window.setTimeout(flush, 700)
    }
    document.addEventListener('input', onEdit, true)
    document.addEventListener('change', onEdit, true)
    document.addEventListener('submit', flush, true)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHidden)
    scope.__tbxFormMemory = { alive }
  }

  const result: FormPageResult = { ok: true, filled: 0, cleared: 0, total: 0, populated: 0, matched: 0 }
  try {
    if (args.watch) watch()
    if (args.notice) toast(args.notice)
    const fields = args.fields ?? []
    if (args.action === 'fill') {
      const shared = args.shared ?? []
      const done = new Set<string>()
      result.filled = fillPass(fields, shared, Boolean(args.overwrite), done)
      const pending = () => fields.some((field) => !done.has(field.key))
      if (args.retry && pending()) {
        const first = result.filled
        let total = first
        const delays = [600, 1500, 3200]
        const step = (index: number) => {
          window.setTimeout(
            () => {
              total += fillPass(fields, [], false, done)
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
      for (const entry of collect()) if (clearEntry(entry)) result.cleared += 1
    }
    const entries = collect()
    result.total = entries.length
    result.populated = entries.filter(
      (entry) => (entry.kind === 'text' || entry.kind === 'textarea') && hasValue(entry),
    ).length
    const keys = new Set(entries.map((entry) => entry.key))
    result.matched = fields.filter((field) => keys.has(field.key)).length
    if (args.action === 'snapshot') {
      // Boxes left at their default say nothing about the user; only ticks and deliberate unticks count.
      result.fields = entries
        .filter((entry) => {
          if (entry.kind !== 'checkbox') return true
          const box = entry.els[0] as HTMLInputElement
          return box.checked || box.checked !== box.defaultChecked
        })
        .map(read)
        .filter((field) => (Array.isArray(field.value) ? field.value.length > 0 : field.value !== ''))
    }
  } catch {
    result.ok = false
  }
  return result
}
