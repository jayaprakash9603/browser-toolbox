import type {
  A11yAuditOptions,
  A11yHeading,
  A11yLandmark,
  A11yNode,
  A11yPageScan,
  A11yRuleId,
  A11yRuleScan,
} from '@/core/engines/a11y/types'

/**
 * Runs inside the inspected tab through chrome.scripting.executeScript, which serializes the
 * function source: everything it uses must be declared inside it.
 */
export function auditPage(options: A11yAuditOptions): A11yPageScan {
  const started = performance.now()
  const doc = document
  const root = doc.documentElement
  const maxNodes = Math.max(1, options.maxNodes)

  const FOCUSABLE =
    'a[href], area[href], button, input:not([type="hidden" i]), select, textarea, iframe, summary, audio[controls], video[controls], [contenteditable=""], [contenteditable="true" i], [tabindex]'
  const VALID_ROLES = new Set(
    (
      'alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox comment complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img image insertion link list listbox listitem log main mark marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong subscript suggestion superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem graphics-document graphics-object graphics-symbol'
    ).split(' '),
  )
  const REQUIRED_ATTRS: Record<string, string[]> = {
    checkbox: ['aria-checked'],
    radio: ['aria-checked'],
    switch: ['aria-checked'],
    menuitemcheckbox: ['aria-checked'],
    menuitemradio: ['aria-checked'],
    slider: ['aria-valuenow'],
    scrollbar: ['aria-valuenow', 'aria-controls'],
    heading: ['aria-level'],
    combobox: ['aria-expanded'],
  }
  const AUTOCOMPLETE_FIELDS = new Set(
    (
      'name honorific-prefix given-name additional-name family-name honorific-suffix nickname email username new-password current-password one-time-code organization-title organization street-address address-line1 address-line2 address-line3 address-level4 address-level3 address-level2 address-level1 country country-name postal-code cc-name cc-given-name cc-additional-name cc-family-name cc-number cc-exp cc-exp-month cc-exp-year cc-csc cc-type transaction-currency transaction-amount language bday bday-day bday-month bday-year sex tel tel-country-code tel-national tel-area-code tel-local tel-local-prefix tel-local-suffix tel-extension impp url photo'
    ).split(' '),
  )
  const AUTOCOMPLETE_MODIFIERS = new Set(['shipping', 'billing', 'home', 'work', 'mobile', 'fax', 'pager', 'webauthn'])
  const GENERIC_LINK =
    /^(click|click here|here|tap here|read more|more|learn more|more info|more information|details|link|this|this link|continue|go|view|view more|see more|info)[.…!]*$/i
  const SUSPICIOUS_ALT =
    /(\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)(\?.*)?$)|^(image|img|photo|picture|pic|graphic|icon|logo|banner|spacer|untitled|placeholder|thumbnail|dsc[_-]?\d+|img[_-]?\d+)$|^(an? )?(image|picture|photo|graphic) of\b/i

  const results = new Map<A11yRuleId, A11yRuleScan>()
  const bucket = (id: A11yRuleId): A11yRuleScan => {
    let entry = results.get(id)
    if (!entry) {
      entry = { id, checked: 0, failed: 0, nodes: [] }
      results.set(id, entry)
    }
    return entry
  }
  const check = (id: A11yRuleId, count = 1) => {
    bucket(id).checked += count
  }

  const idCounts = new Map<string, number>()
  for (const el of doc.querySelectorAll('[id]')) {
    const id = el.getAttribute('id') ?? ''
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }

  const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)
  const squash = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

  const selectorFor = (el: Element): string => {
    const parts: string[] = []
    let node: Element | null = el
    while (node && node !== root) {
      const id = node.getAttribute('id')
      if (id && idCounts.get(id) === 1) {
        parts.unshift(`#${CSS.escape(id)}`)
        break
      }
      const tag = node.tagName.toLowerCase()
      const parent: Element | null = node.parentElement
      if (!parent) {
        parts.unshift(tag)
        break
      }
      const current: Element = node
      const sameTag = Array.from(parent.children).filter((child) => child.tagName === current.tagName)
      parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(current) + 1})` : tag)
      node = parent
    }
    return parts.length ? parts.join(' > ') : 'html'
  }

  const snippetFor = (el: Element): string => {
    const tag = el.tagName.toLowerCase()
    const attrs = Array.from(el.attributes)
      .slice(0, 6)
      .map((attr) => (attr.value === '' ? attr.name : `${attr.name}="${clip(attr.value, 40)}"`))
      .join(' ')
    const text = el === root || el === doc.body ? '' : clip(squash(el.textContent), 48)
    const open = `<${tag}${attrs ? ` ${attrs}` : ''}>`
    return text ? `${open}${text}</${tag}>` : open
  }

  /** `el` is null for page-level findings, which have nothing to point at. */
  const fail = (id: A11yRuleId, el: Element | null, extra: Partial<A11yNode> = {}) => {
    const entry = bucket(id)
    entry.failed += 1
    if (entry.nodes.length < maxNodes) {
      entry.nodes.push({ selector: el ? selectorFor(el) : '', snippet: el ? snippetFor(el).slice(0, 220) : '', ...extra })
    }
  }

  const rendered = (el: Element): boolean => {
    const probe = el as Element & { checkVisibility?: (options?: { visibilityProperty?: boolean }) => boolean }
    if (typeof probe.checkVisibility === 'function') return probe.checkVisibility({ visibilityProperty: true })
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (node.hasAttribute('hidden')) return false
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
    return true
  }
  const inTree = (el: Element) => rendered(el) && !el.closest('[aria-hidden="true"], [inert]')
  const all = (selector: string) => Array.from(doc.querySelectorAll(selector))

  const roleOf = (el: Element): string => {
    const explicit = squash(el.getAttribute('role')).toLowerCase()
    if (explicit) return explicit.split(' ')[0]
    return ''
  }

  const textOfIds = (ids: string | null): string =>
    squash(
      (ids ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => doc.getElementById(id))
        .map((node) => (node ? (node.getAttribute('aria-label') ?? node.textContent ?? '') : ''))
        .join(' '),
    )

  const contentText = (el: Element): string => {
    let out = ''
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += ` ${child.textContent ?? ''}`
        continue
      }
      if (!(child instanceof Element)) continue
      if (child.getAttribute('aria-hidden') === 'true') continue
      const tag = child.tagName.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'template') continue
      if (getComputedStyle(child).display === 'none') continue
      const aria = squash(child.getAttribute('aria-label'))
      if (aria) {
        out += ` ${aria}`
      } else if (tag === 'img' || tag === 'area' || (tag === 'input' && child.getAttribute('type') === 'image')) {
        out += ` ${child.getAttribute('alt') ?? ''}`
      } else if (tag === 'svg') {
        out += ` ${child.querySelector('title')?.textContent ?? ''}`
      } else {
        out += ` ${contentText(child)}`
      }
    }
    return squash(out)
  }

  const nameOf = (el: Element, fromContent: boolean): string => {
    const labelled = textOfIds(el.getAttribute('aria-labelledby'))
    if (labelled) return labelled
    const aria = squash(el.getAttribute('aria-label'))
    if (aria) return aria
    const tag = el.tagName.toLowerCase()
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      const labels = (el as HTMLInputElement).labels
      const labelText = labels ? squash(Array.from(labels, (label) => contentText(label)).join(' ')) : ''
      if (labelText) return labelText
      if (tag === 'input') {
        const type = (el.getAttribute('type') ?? 'text').toLowerCase()
        if (type === 'submit' || type === 'reset' || type === 'button') {
          const value = squash(el.getAttribute('value'))
          if (value) return value
          if (type !== 'button') return type
        }
        if (type === 'image') return squash(el.getAttribute('alt'))
      }
    }
    if (tag === 'img' || tag === 'area') {
      const alt = el.getAttribute('alt')
      if (alt !== null) return squash(alt)
    }
    if (fromContent) {
      const text = contentText(el)
      if (text) return text
    }
    return squash(el.getAttribute('title'))
  }

  const isFocusable = (el: Element): boolean => {
    if (!el.matches(FOCUSABLE)) return false
    if (el.getAttribute('tabindex') === '-1') return false
    if ((el as HTMLButtonElement).disabled) return false
    return true
  }

  // Images and other non-text content.
  let imageCount = 0
  for (const el of all('img, input[type="image" i], area[href], [role="img"]')) {
    if (!el.closest('[aria-hidden="true"], [inert]') && (el.tagName === 'AREA' || rendered(el))) {
      imageCount += 1
      const tag = el.tagName.toLowerCase()
      const role = roleOf(el)
      if (tag === 'img' && (role === 'presentation' || role === 'none')) continue
      check('img-alt')
      const alt = el.getAttribute('alt')
      const labelled = textOfIds(el.getAttribute('aria-labelledby')) || squash(el.getAttribute('aria-label'))
      const title = squash(el.getAttribute('title'))
      if (tag === 'img') {
        if (alt === null && !labelled && !title) {
          const src = (el as HTMLImageElement).currentSrc || el.getAttribute('src') || ''
          fail('img-alt', el, { detail: clip(src.split('/').pop()?.split('?')[0] || src, 60) })
        }
      } else if (tag === 'input' || tag === 'area') {
        if (!squash(alt) && !labelled && !title) fail('img-alt', el)
      } else if (!labelled && !title && !squash(el.querySelector(':scope > title')?.textContent)) {
        fail('img-alt', el)
      }
      if (alt && alt.trim()) {
        const trimmed = alt.trim()
        check('img-alt-suspicious')
        if (SUSPICIOUS_ALT.test(trimmed)) fail('img-alt-suspicious', el, { detail: `alt="${clip(trimmed, 60)}"` })
        check('img-alt-long')
        if (trimmed.length > 150) fail('img-alt-long', el, { detail: `${trimmed.length} characters` })
      }
    }
  }

  // Links and buttons.
  let linkCount = 0
  for (const el of all('a[href], [role="link"]')) {
    if (!inTree(el)) continue
    linkCount += 1
    check('link-name')
    const name = nameOf(el, true)
    const href = el.getAttribute('href') ?? ''
    if (!name) {
      fail('link-name', el, { detail: clip(href, 80) || undefined })
    } else {
      check('link-generic')
      if (GENERIC_LINK.test(name) && !el.getAttribute('aria-describedby')) {
        fail('link-generic', el, { detail: `“${clip(name, 40)}”` })
      }
    }
    if (el.tagName === 'A') {
      if (el.getAttribute('target') === '_blank') {
        check('link-new-window')
        const hint = `${name} ${el.getAttribute('title') ?? ''} ${textOfIds(el.getAttribute('aria-describedby'))}`
        if (!/new (tab|window)|opens in|external/i.test(hint)) fail('link-new-window', el, { detail: clip(name, 40) })
      }
      const role = roleOf(el)
      if (role !== 'button') {
        check('link-empty-href')
        if (href.trim() === '#' || /^\s*javascript:/i.test(href)) fail('link-empty-href', el, { detail: clip(href, 40) })
      }
    }
  }

  let buttonCount = 0
  for (const el of all('button, [role="button"], input[type="button" i], input[type="submit" i], input[type="reset" i]')) {
    if (!inTree(el)) continue
    buttonCount += 1
    check('button-name')
    if (!nameOf(el, true)) fail('button-name', el)
  }

  // Form fields.
  let fieldCount = 0
  const SKIP_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image'])
  for (const el of all('input, select, textarea')) {
    const type = (el.getAttribute('type') ?? '').toLowerCase()
    if (el.tagName === 'INPUT' && SKIP_TYPES.has(type)) continue
    if (!inTree(el)) continue
    fieldCount += 1
    check('label')
    const name = nameOf(el, false)
    if (!name) {
      const placeholder = squash(el.getAttribute('placeholder'))
      if (placeholder) {
        check('label-placeholder-only')
        fail('label-placeholder-only', el, { detail: `placeholder="${clip(placeholder, 40)}"` })
      } else {
        fail('label', el, { detail: type || el.tagName.toLowerCase() })
      }
    } else {
      check('label-placeholder-only')
    }
    const autocomplete = squash(el.getAttribute('autocomplete')).toLowerCase()
    if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') {
      check('autocomplete-valid')
      const tokens = autocomplete.split(' ').filter((token) => token !== 'webauthn')
      const field = tokens.pop() ?? ''
      const valid =
        AUTOCOMPLETE_FIELDS.has(field) &&
        tokens.every((token) => token.startsWith('section-') || AUTOCOMPLETE_MODIFIERS.has(token))
      if (!valid) fail('autocomplete-valid', el, { detail: `autocomplete="${clip(autocomplete, 40)}"` })
    }
  }

  // Headings.
  const headings: A11yHeading[] = []
  let previousLevel = 0
  for (const el of all('h1, h2, h3, h4, h5, h6, [role="heading"]')) {
    if (!inTree(el)) continue
    const tagLevel = /^H([1-6])$/.exec(el.tagName)?.[1]
    const level = Number(el.getAttribute('aria-level')) || (tagLevel ? Number(tagLevel) : 2)
    const text = nameOf(el, true)
    const skipped = previousLevel > 0 && level > previousLevel + 1
    headings.push({ level, text: clip(text, 120), selector: selectorFor(el), skipped })
    check('empty-heading')
    if (!text) fail('empty-heading', el, { detail: `h${level}` })
    if (previousLevel > 0) {
      check('heading-order')
      if (skipped) fail('heading-order', el, { detail: `h${previousLevel} → h${level}` })
    }
    previousLevel = level
  }
  check('page-has-h1')
  if (!headings.some((heading) => heading.level === 1)) fail('page-has-h1', null)

  // Landmarks.
  const landmarks: A11yLandmark[] = []
  const sectioning = 'article, aside, main, nav, section'
  const LANDMARK_ROLES = new Set(['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'form', 'region', 'search'])
  for (const el of all('header, nav, main, aside, footer, form, section, search, [role]')) {
    if (!inTree(el)) continue
    const tag = el.tagName.toLowerCase()
    const explicit = roleOf(el)
    const label = nameOf(el, false)
    let role = LANDMARK_ROLES.has(explicit) ? explicit : ''
    if (!explicit) {
      if (tag === 'header' && !el.parentElement?.closest(sectioning)) role = 'banner'
      else if (tag === 'footer' && !el.parentElement?.closest(sectioning)) role = 'contentinfo'
      else if (tag === 'nav') role = 'navigation'
      else if (tag === 'main') role = 'main'
      else if (tag === 'aside') role = 'complementary'
      else if (tag === 'search') role = 'search'
      else if ((tag === 'form' || tag === 'section') && label) role = tag === 'form' ? 'form' : 'region'
    }
    if (role) landmarks.push({ role, label: clip(label, 60), selector: selectorFor(el) })
  }
  check('landmark-main')
  if (!landmarks.some((landmark) => landmark.role === 'main')) fail('landmark-main', null)

  const focusables = all(FOCUSABLE).filter((el) => isFocusable(el) && inTree(el))
  check('skip-link')
  const skip = focusables
    .slice(0, 5)
    .some((el) => el.tagName === 'A' && /^#.+/.test(el.getAttribute('href') ?? '') && doc.getElementById(decodeURIComponent((el.getAttribute('href') ?? '').slice(1))))
  if (!skip) fail('skip-link', null)

  // Lists and tables.
  for (const el of all('li')) {
    if (!inTree(el)) continue
    check('list-structure')
    const parent = el.parentElement
    const parentRole = parent ? roleOf(parent) : ''
    if (!parent || (!/^(UL|OL|MENU)$/.test(parent.tagName) && parentRole !== 'list')) {
      fail('list-structure', el, { detail: `<li> inside <${parent?.tagName.toLowerCase() ?? 'root'}>` })
    }
  }
  for (const list of all('ul, ol')) {
    if (!inTree(list) || roleOf(list)) continue
    for (const child of Array.from(list.children)) {
      if (/^(LI|SCRIPT|TEMPLATE)$/.test(child.tagName)) continue
      check('list-structure')
      fail('list-structure', child, { detail: `<${child.tagName.toLowerCase()}> inside <${list.tagName.toLowerCase()}>` })
    }
  }
  for (const table of all('table')) {
    const role = roleOf(table)
    if (role === 'presentation' || role === 'none' || !inTree(table)) continue
    const rows = (table as HTMLTableElement).rows.length
    const cells = table.querySelectorAll('td').length
    if (rows < 2 || cells < 4) continue
    check('table-headers')
    if (!table.querySelector('th, [scope], [role="columnheader"], [role="rowheader"]')) {
      fail('table-headers', table, { detail: `${rows} rows` })
    }
  }

  // IDs referenced by ARIA and labels.
  const REF_ATTRS = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-errormessage']
  const referenced = new Set<string>()
  for (const el of all(REF_ATTRS.map((attr) => `[${attr}]`).join(', '))) {
    const missing: string[] = []
    for (const attr of REF_ATTRS) {
      for (const id of squash(el.getAttribute(attr)).split(' ').filter(Boolean)) {
        referenced.add(id)
        if (!idCounts.has(id)) missing.push(`${attr} → #${id}`)
      }
    }
    check('aria-valid-reference')
    if (missing.length) fail('aria-valid-reference', el, { detail: clip(missing.join(', '), 80) })
  }
  for (const label of all('label[for]')) referenced.add(label.getAttribute('for') ?? '')
  for (const id of referenced) {
    if (!id) continue
    check('duplicate-id-aria')
    const count = idCounts.get(id) ?? 0
    if (count > 1) fail('duplicate-id-aria', doc.getElementById(id), { detail: `id="${clip(id, 40)}" ×${count}` })
  }

  // ARIA roles and states.
  const NATIVE_STATE = /^(INPUT|SELECT|TEXTAREA|OPTION)$/
  for (const el of all('[role]')) {
    const tokens = squash(el.getAttribute('role')).toLowerCase().split(' ').filter(Boolean)
    if (!tokens.length) continue
    check('aria-valid-role')
    const valid = tokens.find((token) => VALID_ROLES.has(token) || token.startsWith('doc-'))
    if (!valid) {
      fail('aria-valid-role', el, { detail: `role="${clip(tokens.join(' '), 40)}"` })
      continue
    }
    const required = REQUIRED_ATTRS[valid]
    if (!required || NATIVE_STATE.test(el.tagName) || (valid === 'heading' && /^H[1-6]$/.test(el.tagName))) continue
    check('aria-required-attr')
    const missing = required.filter((attr) => !el.hasAttribute(attr))
    if (missing.length) fail('aria-required-attr', el, { detail: `role="${valid}" needs ${missing.join(', ')}` })
  }
  for (const el of all('[aria-hidden="true"]')) {
    if (!rendered(el)) continue
    check('aria-hidden-focus')
    const focusable = isFocusable(el) ? el : Array.from(el.querySelectorAll(FOCUSABLE)).find((child) => isFocusable(child) && rendered(child))
    if (focusable) fail('aria-hidden-focus', focusable, { detail: 'Focusable inside aria-hidden' })
  }

  // Keyboard.
  for (const el of all('[tabindex]')) {
    const value = Number.parseInt(el.getAttribute('tabindex') ?? '', 10)
    if (Number.isNaN(value)) continue
    check('tabindex-positive')
    if (value > 0) fail('tabindex-positive', el, { detail: `tabindex="${value}"` })
  }
  const NATIVE_FOCUS = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|IFRAME|AREA|AUDIO|VIDEO|OPTION)$/
  for (const el of all('[onclick], [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="radio"], [role="tab"]')) {
    if (el === doc.body || el === root || !inTree(el)) continue
    if (NATIVE_FOCUS.test(el.tagName) || el.hasAttribute('tabindex') || el.closest('[aria-activedescendant]')) continue
    if ((el as HTMLElement).isContentEditable) continue
    check('clickable-focusable')
    fail('clickable-focusable', el, { detail: roleOf(el) ? `role="${roleOf(el)}"` : 'onclick' })
  }

  // Media.
  for (const el of all('video')) {
    if (!inTree(el)) continue
    const video = el as HTMLVideoElement
    if ((video.muted || el.hasAttribute('muted')) && !el.hasAttribute('controls')) continue
    check('video-caption')
    if (!el.querySelector('track[kind="captions" i], track[kind="subtitles" i]')) fail('video-caption', el)
  }
  for (const el of all('video[autoplay], audio[autoplay]')) {
    check('media-autoplay')
    if (!(el as HTMLMediaElement).muted && !el.hasAttribute('muted')) fail('media-autoplay', el)
  }
  for (const el of all('blink, marquee')) {
    check('blink-marquee')
    fail('blink-marquee', el)
  }

  // Document setup.
  check('document-title')
  if (!squash(doc.title)) fail('document-title', null)
  const lang = squash(root.getAttribute('lang') ?? root.getAttribute('xml:lang'))
  check('html-lang')
  if (!lang) {
    fail('html-lang', root)
  } else {
    check('html-lang-valid')
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(lang)) fail('html-lang-valid', root, { detail: `lang="${clip(lang, 30)}"` })
  }
  const viewport = doc.querySelector('meta[name="viewport" i]')
  if (viewport) {
    check('meta-viewport-zoom')
    const content = (viewport.getAttribute('content') ?? '').toLowerCase()
    const max = /maximum-scale\s*=\s*([\d.]+)/.exec(content)
    if (/user-scalable\s*=\s*(no|0)\b/.test(content) || (max && Number(max[1]) < 2)) {
      fail('meta-viewport-zoom', viewport, { detail: clip(content, 80) })
    }
  }
  for (const meta of all('meta[http-equiv="refresh" i]')) {
    check('meta-refresh')
    const delay = Number(/^\s*(\d+)/.exec(meta.getAttribute('content') ?? '')?.[1] ?? 0)
    if (delay > 0 && delay < 72000) fail('meta-refresh', meta, { detail: `${delay}s` })
  }
  for (const el of all('iframe, frame')) {
    const role = roleOf(el)
    if (role === 'presentation' || role === 'none' || !inTree(el)) continue
    check('frame-title')
    if (!nameOf(el, false)) fail('frame-title', el, { detail: clip(el.getAttribute('src') ?? '', 60) || undefined })
  }

  // Colour and text. Ancestor backgrounds are blended; text over images or gradients needs a human.
  let textNodes = 0
  if (options.contrast && doc.body) {
    type Rgba = [number, number, number, number]
    const parseColor = (value: string): Rgba | null => {
      const match = /rgba?\(([^)]+)\)/.exec(value)
      if (!match) return null
      const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1]
    }
    const blend = (top: Rgba, bottom: Rgba): Rgba => {
      const alpha = top[3] + bottom[3] * (1 - top[3])
      if (alpha === 0) return [0, 0, 0, 0]
      const mix = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha
      return [mix(0), mix(1), mix(2), alpha]
    }
    const luminance = ([r, g, b]: Rgba) => {
      const channel = (value: number) => {
        const s = value / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const ratioOf = (a: Rgba, b: Rgba) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    const hex = ([r, g, b]: Rgba) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

    const backgroundCache = new Map<Element, Rgba | 'image'>()
    const backgroundOf = (el: Element): Rgba | 'image' => {
      const cached = backgroundCache.get(el)
      if (cached) return cached
      const style = getComputedStyle(el)
      let result: Rgba | 'image'
      if (style.backgroundImage && style.backgroundImage !== 'none') {
        result = 'image'
      } else {
        const own = parseColor(style.backgroundColor) ?? [0, 0, 0, 0]
        const parent = el.parentElement
        if (own[3] >= 1) result = own
        else {
          const below = parent ? backgroundOf(parent) : ([255, 255, 255, 1] as Rgba)
          result = below === 'image' ? (own[3] > 0.9 ? blend(own, [255, 255, 255, 1]) : 'image') : blend(own, below)
        }
      }
      backgroundCache.set(el, result)
      return result
    }

    const seen = new Set<Element>()
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    const LIMIT = 3000
    for (let node = walker.nextNode(); node && seen.size < LIMIT; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue
      const el = node.parentElement
      if (!el || seen.has(el)) continue
      seen.add(el)
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|TEXTAREA)$/.test(el.tagName) || el.closest('svg')) continue
      if (el.closest('[disabled], [aria-disabled="true"]')) continue
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2 || !rendered(el)) continue
      const style = getComputedStyle(el)
      if (Number(style.opacity) === 0) continue
      const fgRaw = parseColor(style.color)
      if (!fgRaw || fgRaw[3] === 0) continue
      textNodes += 1
      const size = Number.parseFloat(style.fontSize) || 16
      const weight = Number.parseInt(style.fontWeight, 10) || 400
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      const sample = clip(squash(el.textContent), 48)

      check('text-small')
      if (size < 12) fail('text-small', el, { detail: `${Math.round(size * 10) / 10}px · “${sample}”` })

      const bg = backgroundOf(el)
      check('contrast-review')
      if (bg === 'image') {
        fail('contrast-review', el, { detail: `“${sample}”` })
        continue
      }
      const background = bg[3] < 1 ? blend(bg, [255, 255, 255, 1]) : bg
      const fg = fgRaw[3] < 1 ? blend(fgRaw, background) : fgRaw
      const ratio = Math.round(ratioOf(fg, background) * 100) / 100
      const required = large ? 3 : 4.5
      const enhanced = large ? 4.5 : 7
      const colors = { fg: hex(fg), bg: hex(background), ratio }
      check('color-contrast')
      if (ratio < required) {
        fail('color-contrast', el, { ...colors, required, detail: `${ratio}:1, needs ${required}:1 · “${sample}”` })
      } else {
        check('color-contrast-enhanced')
        if (ratio < enhanced) fail('color-contrast-enhanced', el, { ...colors, required: enhanced, detail: `${ratio}:1, AAA needs ${enhanced}:1` })
      }
    }

    // Links inside running text must stand out by more than colour alone.
    for (const link of all('p a[href], li a[href], td a[href], dd a[href], blockquote a[href]')) {
      if (!inTree(link)) continue
      const parent = link.parentElement
      if (!parent) continue
      const linkText = squash(link.textContent)
      const blockText = squash(parent.textContent)
      if (!linkText || blockText.length < linkText.length + 12) continue
      const style = getComputedStyle(link)
      check('link-distinguishable')
      const underlined = /underline/.test(style.textDecorationLine || style.textDecoration)
      const bordered = style.borderBottomStyle !== 'none' && Number.parseFloat(style.borderBottomWidth) > 0
      if (underlined || bordered) continue
      const linkColor = parseColor(style.color)
      const textColor = parseColor(getComputedStyle(parent).color)
      if (!linkColor || !textColor) continue
      const ratio = Math.round(ratioOf(linkColor, textColor) * 100) / 100
      if (ratio < 3) fail('link-distinguishable', link, { detail: `${ratio}:1 against surrounding text, no underline` })
    }
  }

  return {
    url: location.href,
    title: doc.title,
    lang,
    rules: Array.from(results.values()),
    headings,
    landmarks,
    stats: {
      elements: doc.getElementsByTagName('*').length,
      images: imageCount,
      links: linkCount,
      buttons: buttonCount,
      formFields: fieldCount,
      focusable: focusables.length,
      textNodes,
      durationMs: Math.round(performance.now() - started),
    },
  }
}
