export interface ElementDescriptor {
  tag: string
  id: string
  classes: string[]
  attributes: Record<string, string>
  text: string
  parentChain: { tag: string; id: string; classes: string[] }[]
  indexAmongSiblings: number
}

const CSS_IDENTIFIER = /^-?[_a-zA-Z][_a-zA-Z\d-]*$/

export function cssEscape(value: string): string {
  if (CSS_IDENTIFIER.test(value)) return value
  return value.replace(/([^\w-])/g, '\\$1')
}

function cssEscapeAttr(value: string): string {
  return value.replace(/(["\\])/g, '\\$1')
}

function textFingerprint(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 40)
}

export function cssIdSelector(el: ElementDescriptor): string | null {
  return el.id ? `#${cssEscape(el.id)}` : null
}

export function cssClassSelector(el: ElementDescriptor): string | null {
  if (el.classes.length === 0) return null
  return `${el.tag}${el.classes.map((cls) => `.${cssEscape(cls)}`).join('')}`
}

const ATTRIBUTE_PRIORITY = [
  'data-testid',
  'data-test',
  'data-cy',
  'name',
  'type',
  'role',
  'aria-label',
  'placeholder',
  'href',
]

export function cssAttributeSelector(el: ElementDescriptor): string | null {
  for (const name of ATTRIBUTE_PRIORITY) {
    const value = el.attributes[name]
    if (value) return `${el.tag}[${name}="${cssEscapeAttr(value)}"]`
  }
  const anyEntry = Object.entries(el.attributes).find(
    ([name]) => CSS_IDENTIFIER.test(name) && name !== 'class' && name !== 'id' && name !== 'style',
  )
  if (!anyEntry) return null
  return `${el.tag}[${anyEntry[0]}="${cssEscapeAttr(anyEntry[1])}"]`
}

function cssSegment(
  el: { tag: string; id: string; classes: string[] },
  indexAmongSiblings?: number,
): string {
  if (el.id) return `#${cssEscape(el.id)}`
  const classPart = el.classes.length > 0 ? `.${cssEscape(el.classes[0])}` : ''
  const needsNth = !el.id && el.classes.length === 0 && indexAmongSiblings !== undefined
  return `${el.tag}${classPart}${needsNth ? `:nth-of-type(${indexAmongSiblings})` : ''}`
}

export function cssRelativeSelector(el: ElementDescriptor): string {
  if (el.id) return `#${cssEscape(el.id)}`
  const anchorIndex = el.parentChain.findIndex((parent) => parent.id)
  if (anchorIndex === -1) {
    const chain = [
      ...el.parentChain
        .slice(0, 2)
        .map((parent) => cssSegment(parent))
        .reverse(),
      cssSegment(el, el.indexAmongSiblings),
    ]
    return chain.join(' > ')
  }
  const anchor = el.parentChain[anchorIndex]
  const tail = [
    ...el.parentChain
      .slice(0, anchorIndex)
      .reverse()
      .map((parent) => cssSegment(parent)),
    cssSegment(el, el.indexAmongSiblings),
  ]
  return [`#${cssEscape(anchor.id)}`, ...tail].join(' > ')
}

export function cssAbsoluteSelector(el: ElementDescriptor): string {
  const chain = [...el.parentChain].reverse().map((parent) => cssSegment(parent))
  return ['html', ...chain.slice(1), cssSegment(el, el.indexAmongSiblings)].join(' > ')
}

function xpathTag(el: ElementDescriptor): string {
  return el.tag || '*'
}

export function xpathAbsolute(el: ElementDescriptor): string {
  const parts = el.parentChain
    .slice()
    .reverse()
    .map((parent) => `${parent.tag || '*'}`)
  return `/${parts.join('/')}/${xpathTag(el)}[${el.indexAmongSiblings}]`
}

export function xpathRelative(el: ElementDescriptor): string {
  if (el.id) return `//*[@id="${el.id}"]`
  const anchor = el.parentChain.find((parent) => parent.id)
  if (anchor) {
    return `//${anchor.tag || '*'}[@id="${anchor.id}"]//${xpathTag(el)}[${el.indexAmongSiblings}]`
  }
  const cls = el.classes[0]
  if (cls)
    return `//${xpathTag(el)}[contains(concat(" ", normalize-space(@class), " "), " ${cls} ")]`
  return xpathAbsolute(el)
}

export function xpathById(el: ElementDescriptor): string | null {
  return el.id ? `//*[@id="${el.id}"]` : null
}

export function xpathByClass(el: ElementDescriptor): string | null {
  const cls = el.classes[0]
  return cls
    ? `//${xpathTag(el)}[contains(concat(" ", normalize-space(@class), " "), " ${cls} ")]`
    : null
}

export function xpathByAttribute(el: ElementDescriptor): string | null {
  for (const name of ATTRIBUTE_PRIORITY) {
    const value = el.attributes[name]
    if (value) return `//${xpathTag(el)}[@${name}="${value.replace(/"/g, '&quot;')}"]`
  }
  return null
}

export function xpathByText(el: ElementDescriptor): string | null {
  const text = textFingerprint(el.text)
  if (!text || text.length < 3) return null
  const quote = text.includes('"') ? `'${text}'` : `"${text}"`
  return `//${xpathTag(el)}[contains(normalize-space(.), ${quote})]`
}

export interface SelectorSet {
  cssId: string | null
  cssClass: string | null
  cssAttribute: string | null
  cssRelative: string
  cssAbsolute: string
  xpathId: string | null
  xpathClass: string | null
  xpathAttribute: string | null
  xpathText: string | null
  xpathRelative: string
  xpathAbsolute: string
}

export function generateSelectors(el: ElementDescriptor): SelectorSet {
  return {
    cssId: cssIdSelector(el),
    cssClass: cssClassSelector(el),
    cssAttribute: cssAttributeSelector(el),
    cssRelative: cssRelativeSelector(el),
    cssAbsolute: cssAbsoluteSelector(el),
    xpathId: xpathById(el),
    xpathClass: xpathByClass(el),
    xpathAttribute: xpathByAttribute(el),
    xpathText: xpathByText(el),
    xpathRelative: xpathRelative(el),
    xpathAbsolute: xpathAbsolute(el),
  }
}

export interface CapturedElement extends ElementDescriptor {
  html: string
  dimensions: { width: number; height: number; x: number; y: number }
  computedStyles: Record<string, string>
}

export function describeElement(element: Element, computed: CSSStyleDeclaration): CapturedElement {
  const attributes: Record<string, string> = {}
  for (const attr of element.attributes) attributes[attr.name] = attr.value
  const parentChain: ElementDescriptor['parentChain'] = []
  let parent = element.parentElement
  while (parent && parent.tagName.toLowerCase() !== 'html' && parentChain.length < 8) {
    parentChain.push({
      tag: parent.tagName.toLowerCase(),
      id: parent.id,
      classes: [...parent.classList],
    })
    parent = parent.parentElement
  }
  const tag = element.tagName.toLowerCase()
  const siblings = element.parentElement
    ? [...element.parentElement.children].filter((sibling) => sibling.tagName.toLowerCase() === tag)
    : [element]
  const rect = element.getBoundingClientRect()
  const styleProps = [
    'color',
    'background-color',
    'font-size',
    'font-family',
    'display',
    'position',
    'margin',
    'padding',
    'border',
    'z-index',
  ]
  const computedStyles: Record<string, string> = {}
  for (const prop of styleProps) {
    const value = computed.getPropertyValue(prop)
    if (value) computedStyles[prop] = value
  }
  return {
    tag,
    id: element.id,
    classes: [...element.classList],
    attributes,
    text: element.textContent ?? '',
    parentChain,
    indexAmongSiblings: siblings.indexOf(element) + 1,
    html: element.outerHTML.slice(0, 2000),
    dimensions: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
    computedStyles,
  }
}
