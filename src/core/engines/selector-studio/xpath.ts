import { xpathLiteral } from './escape'
import { generatedClassesOf, looksStableId } from './stability'
import type { AncestorNode, SelectorCandidate, SelectorSnapshot } from './types'
import { TEST_ATTRIBUTES } from './types'

function draft(
  snapshot: SelectorSnapshot,
  strategy: SelectorCandidate['strategy'],
  expression: string,
  reasons: string[],
  warnings: string[] = [],
): SelectorCandidate {
  const context: SelectorCandidate['context'] = snapshot.shadowHosts.length
    ? 'requires-shadow'
    : snapshot.frame.isTop
      ? 'browser'
      : 'requires-frame'
  if (snapshot.shadowHosts.length) {
    warnings.push('Ordinary XPath does not traverse shadow roots.')
  }
  if (!snapshot.frame.isTop) {
    warnings.push('Switch into this frame before using the locator.')
  }
  if (!snapshot.connected) warnings.push('The element is not connected to the document.')
  return {
    id: `xpath:${strategy}:${expression}`,
    kind: 'xpath',
    strategy,
    expression,
    context,
    uniqueness: 'unknown',
    matchCount: null,
    intendedMatched: null,
    syntaxValid: null,
    score: 0,
    reasons,
    warnings,
  }
}

function xpathName(tag: string, svg: boolean): string {
  if (svg && tag !== 'html' && tag !== 'body') return `*[local-name()=${xpathLiteral(tag)}]`
  return tag || '*'
}

function attrPredicate(name: string, value: string): string {
  return `@${name}=${xpathLiteral(value)}`
}

function classTokenPredicate(cls: string): string {
  return `contains(concat(" ", normalize-space(@class), " "), ${xpathLiteral(` ${cls} `)})`
}

function stableAncestor(chain: AncestorNode[]): AncestorNode | undefined {
  return chain.find(
    (node) =>
      (node.id && looksStableId(node.id)) ||
      TEST_ATTRIBUTES.some((attr) => node.attributes[attr]) ||
      node.attributes['aria-label'] ||
      node.attributes.role === 'main' ||
      ['form', 'nav', 'main', 'section', 'header', 'footer', 'article'].includes(node.tag),
  )
}

function textValue(snapshot: SelectorSnapshot): string {
  const own = snapshot.ownText.trim()
  if (own && own.length <= 60) return own
  const full = snapshot.text.trim()
  return full.length <= 60 ? full : ''
}

export function generateXPathCandidates(snapshot: SelectorSnapshot): SelectorCandidate[] {
  const out: SelectorCandidate[] = []
  const tag = xpathName(snapshot.tag, snapshot.isSvg)
  const htmlTag = snapshot.tag || '*'
  const seen = new Set<string>()

  const add = (candidate: SelectorCandidate) => {
    if (!candidate.expression || seen.has(candidate.expression)) return
    seen.add(candidate.expression)
    out.push(candidate)
  }

  if (snapshot.id) {
    const warnings: string[] = []
    if (snapshot.idUnique === false) warnings.push('This id is duplicated on the page.')
    if (!looksStableId(snapshot.id)) warnings.push('This id looks generated.')
    add(
      draft(
        snapshot,
        'id',
        `//*[@id=${xpathLiteral(snapshot.id)}]`,
        snapshot.idUnique ? ['Unique id'] : ['Id attribute'],
        warnings,
      ),
    )
  }

  for (const name of TEST_ATTRIBUTES) {
    const value = snapshot.attributes[name]
    if (!value) continue
    add(
      draft(
        snapshot,
        'test-attribute',
        `//${htmlTag}[${attrPredicate(name, value)}]`,
        [`Test attribute ${name}`],
        snapshot.testIdUnique === false ? ['This test id matches more than one element.'] : [],
      ),
    )
  }

  const semanticAttrs = ['name', 'aria-label', 'title', 'role', 'placeholder', 'alt'] as const
  for (const name of semanticAttrs) {
    const value = snapshot.attributes[name]
    if (!value) continue
    add(
      draft(snapshot, 'semantic', `//${htmlTag}[${attrPredicate(name, value)}]`, [`${name} attribute`]),
    )
  }

  for (const name of ['type', 'href', 'value'] as const) {
    const value = snapshot.attributes[name]
    if (!value) continue
    add(draft(snapshot, 'attribute', `//${htmlTag}[${attrPredicate(name, value)}]`, [`${name} attribute`]))
  }

  const typeAndName = snapshot.attributes.type && snapshot.attributes.name
  if (typeAndName) {
    add(
      draft(
        snapshot,
        'compound',
        `//${htmlTag}[${attrPredicate('type', snapshot.attributes.type)} and ${attrPredicate('name', snapshot.attributes.name)}]`,
        ['Combined type and name'],
      ),
    )
  }

  const stableClasses = snapshot.classes.filter((cls) => !generatedClassesOf([cls]).length)
  const volatile = generatedClassesOf(snapshot.classes)
  if (stableClasses.length) {
    const predicates = stableClasses.slice(0, 2).map(classTokenPredicate).join(' and ')
    add(
      draft(
        snapshot,
        'class',
        `//${htmlTag}[${predicates}]`,
        ['Class token match'],
        volatile.length ? ['Other classes on this element look generated.'] : [],
      ),
    )
  } else if (snapshot.classes[0]) {
    add(
      draft(
        snapshot,
        'class',
        `//${htmlTag}[${classTokenPredicate(snapshot.classes[0])}]`,
        ['Class token match'],
        ['Class names look generated or hashed.'],
      ),
    )
  }

  const text = textValue(snapshot)
  if (text && text.length >= 2) {
    add(
      draft(
        snapshot,
        'text',
        `//${htmlTag}[normalize-space(.)=${xpathLiteral(text)}]`,
        ['Exact normalized text'],
        ['Visible text can change with copy or locale.'],
      ),
    )
    if (text.length >= 6) {
      const partial = text.slice(0, Math.min(24, text.length))
      add(
        draft(
          snapshot,
          'text',
          `//${htmlTag}[contains(normalize-space(.), ${xpathLiteral(partial)})]`,
          ['Partial text'],
          ['Partial text is often shared by other nodes.'],
        ),
      )
    }
    const testName = TEST_ATTRIBUTES.find((name) => snapshot.attributes[name])
    if (testName) {
      add(
        draft(
          snapshot,
          'text',
          `//${htmlTag}[${attrPredicate(testName, snapshot.attributes[testName])} and normalize-space(.)=${xpathLiteral(text)}]`,
          ['Text constrained by a test attribute'],
        ),
      )
    }
  }

  const anchor = stableAncestor(snapshot.parentChain)
  if (anchor) {
    const anchorSel = anchor.id
      ? `//${anchor.tag}[@id=${xpathLiteral(anchor.id)}]`
      : TEST_ATTRIBUTES.some((name) => anchor.attributes[name])
        ? `//${anchor.tag}[${attrPredicate(
            TEST_ATTRIBUTES.find((name) => anchor.attributes[name])!,
            anchor.attributes[TEST_ATTRIBUTES.find((name) => anchor.attributes[name])!] ?? '',
          )}]`
        : anchor.attributes['aria-label']
          ? `//${anchor.tag}[@aria-label=${xpathLiteral(anchor.attributes['aria-label'])}]`
          : `//${anchor.tag}`
    const leaf =
      snapshot.attributes.type
        ? `${htmlTag}[@type=${xpathLiteral(snapshot.attributes.type)}]`
        : snapshot.id
          ? `${htmlTag}[@id=${xpathLiteral(snapshot.id)}]`
          : `${htmlTag}`
    add(draft(snapshot, 'relative', `${anchorSel}//${leaf}`, ['Relative to a meaningful ancestor']))
    add(draft(snapshot, 'ancestor', `${anchorSel}//${leaf}`, ['Ancestor-anchored locator']))
    const depth = snapshot.parentChain.findIndex((node) => node === anchor)
    if (depth === 0) {
      add(draft(snapshot, 'parent-child', `${anchorSel}/${leaf}`, ['Direct parent-child path']))
    }
  }

  if (snapshot.label) {
    const labelExpr = `//label[normalize-space(.)=${xpathLiteral(snapshot.label.text)}]`
    if (snapshot.label.relationship === 'preceding-sibling') {
      add(
        draft(
          snapshot,
          'sibling',
          `${labelExpr}/following-sibling::${htmlTag}`,
          ['Label preceding-sibling'],
        ),
      )
    } else if (snapshot.label.relationship === 'wrapping') {
      add(draft(snapshot, 'parent-child', `${labelExpr}//${htmlTag}`, ['Control inside its label']))
    } else if (snapshot.id) {
      add(
        draft(
          snapshot,
          'sibling',
          `${labelExpr}/following::${htmlTag}[@id=${xpathLiteral(snapshot.id)}]`,
          ['Labelled control'],
        ),
      )
    }
  }

  const parent = snapshot.parentChain[0]
  if (parent && (parent.id || TEST_ATTRIBUTES.some((name) => parent.attributes[name]))) {
    const parentExpr = parent.id
      ? `//${parent.tag}[@id=${xpathLiteral(parent.id)}]`
      : `//${parent.tag}[${attrPredicate(
          TEST_ATTRIBUTES.find((name) => parent.attributes[name])!,
          parent.attributes[TEST_ATTRIBUTES.find((name) => parent.attributes[name])!] ?? '',
        )}]`
    add(
      draft(
        snapshot,
        'parent-child',
        `${parentExpr}/${htmlTag}`,
        ['Parent-child from a stable parent'],
      ),
    )
  }

  if (snapshot.previousSibling?.tag === 'label' && snapshot.previousSibling.text) {
    add(
      draft(
        snapshot,
        'sibling',
        `//label[normalize-space(.)=${xpathLiteral(snapshot.previousSibling.text)}]/following-sibling::${htmlTag}`,
        ['Previous sibling label'],
      ),
    )
  }

  const structural = xpathStructural(snapshot)
  add(
    draft(snapshot, 'structural', structural, ['Positional document path'], [
      'Positional XPath breaks when siblings are inserted.',
    ]),
  )

  const shortStructural = xpathShortStructural(snapshot)
  if (shortStructural !== structural) {
    add(
      draft(snapshot, 'structural', shortStructural, ['Shorter relative structural path'], [
        'Still depends on sibling order.',
      ]),
    )
  }

  if (snapshot.attributes.disabled === undefined && ['button', 'input', 'select', 'textarea'].includes(snapshot.tag)) {
    add(
      draft(snapshot, 'predicate', `//${htmlTag}[not(@disabled)]`, ['Enabled control predicate'], [
        'not(@disabled) is rarely unique on its own.',
      ]),
    )
  }

  if (snapshot.indexAmongSameTag > 1) {
    add(
      draft(
        snapshot,
        'predicate',
        `//${htmlTag}[position()=${snapshot.indexAmongSameTag}]`,
        ['Position predicate'],
        ['Position predicates are brittle.'],
      ),
    )
  }

  if (snapshot.isSvg) {
    add(
      draft(
        snapshot,
        'attribute',
        `//${tag}`,
        ['SVG local-name() locator'],
        ['Automation XML drivers may need explicit namespaces.'],
      ),
    )
  }

  if (snapshot.shadowHosts.length) {
    const host = snapshot.shadowHosts[0]
    const hostExpr = host.id
      ? `//*[@id=${xpathLiteral(host.id)}]`
      : `//${host.tag}`
    add(
      draft(
        snapshot,
        'shadow',
        hostExpr,
        ['Shadow host only — inner nodes need a nested locator'],
        ['A single XPath cannot enter this shadow root.'],
      ),
    )
  }

  return out
}

export function xpathStructural(snapshot: SelectorSnapshot): string {
  const parts = snapshot.parentChain
    .slice()
    .reverse()
    .filter((node) => node.tag !== 'html')
    .map((node) => `${node.tag}[${node.indexAmongSameTag}]`)
  return `/${['html', ...parts, `${snapshot.tag}[${snapshot.indexAmongSameTag}]`].join('/')}`
}

function xpathShortStructural(snapshot: SelectorSnapshot): string {
  const anchor = snapshot.parentChain.find((node) => node.id || TEST_ATTRIBUTES.some((name) => node.attributes[name]))
  if (!anchor) return xpathStructural(snapshot)
  const index = snapshot.parentChain.indexOf(anchor)
  const tail = snapshot.parentChain
    .slice(0, index)
    .reverse()
    .map((node) => `${node.tag}[${node.indexAmongSameTag}]`)
  const head = anchor.id
    ? `//${anchor.tag}[@id=${xpathLiteral(anchor.id)}]`
    : `//${anchor.tag}`
  return [head, ...tail, `${snapshot.tag}[${snapshot.indexAmongSameTag}]`].join('/')
}
