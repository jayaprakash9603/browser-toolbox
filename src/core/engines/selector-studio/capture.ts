import type { SelectorSnapshot } from './types'

/** Capture a serializable snapshot. Self-contained so it can be eval'd against $0. */
export function captureSelectorSnapshot(element: Element): SelectorSnapshot {
  function attrMap(node: Element): Record<string, string> {
    const attributes: Record<string, string> = {}
    for (const attr of node.attributes) attributes[attr.name] = attr.value
    return attributes
  }

  function siblingIndex(node: Element, sameTag: boolean): number {
    const parent = node.parentElement
    if (!parent) return 1
    const tag = node.tagName
    let index = 0
    for (const child of parent.children) {
      if (sameTag && child.tagName !== tag) continue
      index += 1
      if (child === node) return index
    }
    return index
  }

  function summarizeSibling(node: Element | null) {
    if (!node) return null
    return {
      tag: node.tagName.toLowerCase(),
      id: node.id,
      classes: [...node.classList],
      attributes: attrMap(node),
      text: (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
    }
  }

  function findLabel() {
    const id = element.id
    if (id) {
      try {
        const escape = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS?.escape
        const labeled = element.ownerDocument.querySelector(
          `label[for="${escape ? escape(id) : id.replace(/"/g, '\\"')}"]`,
        )
        const text = labeled?.textContent?.replace(/\s+/g, ' ').trim()
        if (text) return { text: text.slice(0, 80), relationship: 'for' as const }
      } catch {
        /* invalid id */
      }
    }
    const wrap = element.closest('label')
    if (wrap && wrap !== element) {
      const text = wrap.textContent?.replace(/\s+/g, ' ').trim()
      if (text) return { text: text.slice(0, 80), relationship: 'wrapping' as const }
    }
    const prev = element.previousElementSibling
    if (prev?.tagName.toLowerCase() === 'label') {
      const text = prev.textContent?.replace(/\s+/g, ' ').trim()
      if (text) return { text: text.slice(0, 80), relationship: 'preceding-sibling' as const }
    }
    return null
  }

  const parentChain: SelectorSnapshot['parentChain'] = []
  let parent = element.parentElement
  while (parent && parentChain.length < 16) {
    parentChain.push({
      tag: parent.tagName.toLowerCase(),
      id: parent.id,
      classes: [...parent.classList],
      attributes: attrMap(parent),
      indexAmongSameTag: siblingIndex(parent, true),
      indexAmongSiblings: siblingIndex(parent, false),
    })
    if (parent.tagName.toLowerCase() === 'html') break
    parent = parent.parentElement
  }

  const shadowHosts: SelectorSnapshot['shadowHosts'] = []
  let node: Node | null = element
  while (node) {
    const root: Node = node.getRootNode()
    if (root instanceof ShadowRoot) {
      const host: Element = root.host
      shadowHosts.push({
        tag: host.tagName.toLowerCase(),
        id: host.id,
        classes: [...host.classList],
        attributes: attrMap(host),
        mode: root.mode,
      })
      node = host
      continue
    }
    break
  }

  let sameOrigin = true
  try {
    void window.top?.location.href
  } catch {
    sameOrigin = false
  }

  const identity: string[] = []
  let walk: Element | null = element
  while (walk && walk.nodeType === 1) {
    const tag = walk.tagName.toLowerCase()
    identity.push(`${tag}[${siblingIndex(walk, true)}]`)
    if (tag === 'html') break
    const next: Element | null = walk.parentElement
    if (!next) {
      const root: Node = walk.getRootNode()
      if (root instanceof ShadowRoot) {
        identity.push('shadow()')
        walk = root.host
        continue
      }
    }
    walk = next
  }

  function countMatches(selector: string): number | null {
    try {
      return document.querySelectorAll(selector).length
    } catch {
      return null
    }
  }

  let ownText = ''
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) ownText += child.textContent ?? ''
  }

  const attributes = attrMap(element)
  const id = element.id
  const testId =
    attributes['data-testid'] ?? attributes['data-test'] ?? attributes['data-qa'] ?? attributes['data-cy'] ?? ''
  const ns = element.namespaceURI
  const escape = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS?.escape

  return {
    tag: element.tagName.toLowerCase(),
    id,
    classes: [...element.classList],
    attributes,
    text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
    ownText: ownText.replace(/\s+/g, ' ').trim().slice(0, 80),
    parentChain,
    indexAmongSameTag: siblingIndex(element, true),
    indexAmongSiblings: siblingIndex(element, false),
    label: findLabel(),
    previousSibling: summarizeSibling(element.previousElementSibling),
    nextSibling: summarizeSibling(element.nextElementSibling),
    namespaceURI: ns,
    isSvg: ns === 'http://www.w3.org/2000/svg' || element.tagName.toLowerCase() === 'svg',
    connected: element.isConnected,
    shadowHosts,
    frame: { url: window.location.href, sameOrigin, isTop: window.top === window },
    identityPath: `/${identity.reverse().join('/')}`,
    idUnique: id ? countMatches(`#${escape ? escape(id) : id}`) === 1 : null,
    testIdUnique: testId
      ? countMatches(
          `[data-testid="${testId}"], [data-test="${testId}"], [data-qa="${testId}"], [data-cy="${testId}"]`,
        ) === 1
      : null,
    pageUrl: window.location.href,
  }
}
