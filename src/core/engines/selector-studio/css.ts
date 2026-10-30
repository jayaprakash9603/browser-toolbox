import { cssAttrEquals, cssClassTokens, cssIdSelector, escapeCssIdent } from './escape'
import { generatedClassesOf, looksStableId } from './stability'
import type { AncestorNode, SelectorCandidate, SelectorSnapshot } from './types'
import { TEST_ATTRIBUTES } from './types'

function draft(
  snapshot: SelectorSnapshot,
  strategy: SelectorCandidate['strategy'],
  expression: string,
  reasons: string[],
  warnings: string[] = [],
  extra?: Partial<SelectorCandidate>,
): SelectorCandidate {
  const context: SelectorCandidate['context'] = snapshot.shadowHosts.length
    ? 'requires-shadow'
    : snapshot.frame.isTop
      ? 'browser'
      : 'requires-frame'
  if (snapshot.shadowHosts.length) {
    warnings.push('Ordinary CSS does not pierce shadow roots unless you use a nested locator.')
  }
  if (!snapshot.frame.isTop) warnings.push('Switch into this frame before using the locator.')
  if (!snapshot.connected) warnings.push('The element is not connected to the document.')
  return {
    id: `css:${strategy}:${expression}`,
    kind: 'css',
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
    ...extra,
  }
}

function stableAncestor(chain: AncestorNode[]): AncestorNode | undefined {
  return chain.find(
    (node) =>
      (node.id && looksStableId(node.id)) ||
      TEST_ATTRIBUTES.some((attr) => node.attributes[attr]) ||
      node.attributes['aria-label'] ||
      ['form', 'nav', 'main', 'section', 'header'].includes(node.tag),
  )
}

function nodeCss(node: { tag: string; id: string; classes: string[]; attributes: Record<string, string> }): string {
  if (node.id && looksStableId(node.id)) return cssIdSelector(node.id)
  const test = TEST_ATTRIBUTES.find((name) => node.attributes[name])
  if (test) return `${node.tag}${cssAttrEquals(test, node.attributes[test])}`
  const stable = node.classes.filter((cls) => !generatedClassesOf([cls]).length)
  if (stable[0]) return `${node.tag}.${escapeCssIdent(stable[0])}`
  return node.tag
}

export function generateCssCandidates(snapshot: SelectorSnapshot): SelectorCandidate[] {
  const out: SelectorCandidate[] = []
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
        cssIdSelector(snapshot.id),
        snapshot.idUnique ? ['Unique id'] : ['Id selector'],
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
        `${snapshot.tag}${cssAttrEquals(name, value)}`,
        [`Test attribute ${name}`],
        snapshot.testIdUnique === false ? ['This test id matches more than one element.'] : [],
      ),
    )
  }

  const semantic = ['name', 'aria-label', 'title', 'role', 'placeholder', 'alt'] as const
  for (const name of semantic) {
    const value = snapshot.attributes[name]
    if (!value) continue
    add(draft(snapshot, 'semantic', `${snapshot.tag}${cssAttrEquals(name, value)}`, [`${name} attribute`]))
  }

  for (const name of ['type', 'href', 'value'] as const) {
    const value = snapshot.attributes[name]
    if (!value) continue
    add(draft(snapshot, 'attribute', `${snapshot.tag}${cssAttrEquals(name, value)}`, [`${name} attribute`]))
  }

  const stableClasses = snapshot.classes.filter((cls) => !generatedClassesOf([cls]).length)
  const volatile = generatedClassesOf(snapshot.classes)
  if (stableClasses.length) {
    add(
      draft(
        snapshot,
        'class',
        `${snapshot.tag}${cssClassTokens(stableClasses.slice(0, 3))}`,
        ['Class selectors'],
        volatile.length ? ['Some classes look generated.'] : [],
      ),
    )
  } else if (snapshot.classes.length) {
    add(
      draft(
        snapshot,
        'class',
        `${snapshot.tag}${cssClassTokens(snapshot.classes.slice(0, 2))}`,
        ['Class selectors'],
        ['Class names look generated or hashed.'],
      ),
    )
  }

  if (snapshot.attributes.type && snapshot.attributes.name) {
    add(
      draft(
        snapshot,
        'compound',
        `${snapshot.tag}${cssAttrEquals('type', snapshot.attributes.type)}${cssAttrEquals('name', snapshot.attributes.name)}`,
        ['Compound type and name'],
      ),
    )
  }

  if (stableClasses.length && snapshot.attributes.type) {
    add(
      draft(
        snapshot,
        'compound',
        `${snapshot.tag}.${escapeCssIdent(stableClasses[0])}${cssAttrEquals('type', snapshot.attributes.type)}`,
        ['Compound class and type'],
      ),
    )
  }

  const anchor = stableAncestor(snapshot.parentChain)
  if (anchor) {
    const leaf = nodeCss(snapshot)
    add(draft(snapshot, 'relative', `${nodeCss(anchor)} ${leaf}`, ['Descendant of a stable ancestor']))
    if (snapshot.parentChain[0] === anchor) {
      add(draft(snapshot, 'parent-child', `${nodeCss(anchor)} > ${leaf}`, ['Direct child of a stable parent']))
    } else {
      add(draft(snapshot, 'ancestor', `${nodeCss(anchor)} ${leaf}`, ['Ancestor-anchored descendant']))
    }
  }

  const parent = snapshot.parentChain[0]
  if (parent) {
    add(
      draft(
        snapshot,
        'parent-child',
        `${nodeCss(parent)} > ${nodeCss(snapshot)}`,
        ['Parent-child combinator'],
      ),
    )
  }

  if (snapshot.previousSibling) {
    const prev = nodeCss(snapshot.previousSibling)
    add(draft(snapshot, 'sibling', `${prev} + ${nodeCss(snapshot)}`, ['Adjacent sibling']))
    add(draft(snapshot, 'sibling', `${prev} ~ ${nodeCss(snapshot)}`, ['General sibling']))
  }

  if (parent) {
    add(
      draft(
        snapshot,
        'nth',
        `${nodeCss(parent)} > ${snapshot.tag}:nth-child(${snapshot.indexAmongSiblings})`,
        [':nth-child()'],
        ['Positional CSS breaks when siblings are inserted.'],
      ),
    )
    add(
      draft(
        snapshot,
        'nth',
        `${nodeCss(parent)} > ${snapshot.tag}:nth-of-type(${snapshot.indexAmongSameTag})`,
        [':nth-of-type()'],
        ['Positional CSS breaks when similar siblings are inserted.'],
      ),
    )
  }

  if (snapshot.attributes.disabled === undefined && ['button', 'input', 'select'].includes(snapshot.tag)) {
    add(
      draft(snapshot, 'predicate', `${snapshot.tag}:not([disabled])`, [':not([disabled])'], [
        ':not() alone is rarely unique.',
      ]),
    )
  }

  if (parent && snapshot.attributes.type) {
    add(
      draft(
        snapshot,
        'has',
        `${nodeCss(parent)}:has(> ${snapshot.tag}${cssAttrEquals('type', snapshot.attributes.type)}) > ${snapshot.tag}${cssAttrEquals('type', snapshot.attributes.type)}`,
        [':has() parent constraint'],
        ['Unsupported in some automation engines and older browsers.'],
      ),
    )
  }

  add(
    draft(snapshot, 'scope', `:scope ${nodeCss(snapshot)}`, [':scope-relative'], [
      ':scope only works when evaluated against a specific root.',
    ]),
  )

  const structural = cssStructural(snapshot)
  add(
    draft(snapshot, 'structural', structural, ['Absolute child path'], [
      'Long structural CSS is brittle.',
    ]),
  )

  if (snapshot.shadowHosts.length) {
    const host = snapshot.shadowHosts[0]
    const hostSel = nodeCss(host)
    const inner = nodeCss(snapshot)
    add(
      draft(
        snapshot,
        'shadow',
        `${hostSel} >> ${inner}`,
        ['Nested shadow locator (not a single CSS selector)'],
        ['Use a host locator, then query inside the open shadow root.'],
        { piercePath: [...snapshot.shadowHosts.map(nodeCss).reverse(), inner], context: 'requires-shadow' },
      ),
    )
  }

  return out
}

export function cssStructural(snapshot: SelectorSnapshot): string {
  const parts = snapshot.parentChain
    .slice()
    .reverse()
    .filter((node) => node.tag !== 'html')
    .map((node) => `${node.tag}:nth-of-type(${node.indexAmongSameTag})`)
  return ['html', ...parts, `${snapshot.tag}:nth-of-type(${snapshot.indexAmongSameTag})`].join(' > ')
}
