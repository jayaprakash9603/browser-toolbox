export interface InPageQuery {
  kind: 'css' | 'xpath'
  expression: string
}

export interface InPageEvaluation {
  syntaxValid: boolean
  matchCount: number
  error?: string
  intendedMatched: boolean | null
}

export interface InPageHighlightResult {
  count: number
  error?: string
}

function queryNodes(kind: 'css' | 'xpath', expression: string): { nodes: Element[]; error?: string } {
  try {
    if (kind === 'css') {
      return { nodes: [...document.querySelectorAll(expression)] }
    }
    const snapshot = document.evaluate(
      expression,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    )
    const nodes: Element[] = []
    for (let index = 0; index < snapshot.snapshotLength; index += 1) {
      const node = snapshot.snapshotItem(index)
      if (node instanceof Element) nodes.push(node)
    }
    return { nodes }
  } catch (error) {
    return { nodes: [], error: error instanceof Error ? error.message : 'Invalid selector' }
  }
}

function findByIdentity(identityPath: string | null): Element | null {
  if (!identityPath || identityPath.includes('shadow()')) return null
  try {
    const result = document.evaluate(identityPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    return result.singleNodeValue instanceof Element ? result.singleNodeValue : null
  } catch {
    return null
  }
}

/** Self-contained for chrome.scripting.executeScript. */
export function evaluateSelectorsInPage(
  queries: InPageQuery[],
  identityPath: string | null,
): InPageEvaluation[] {
  const intended = findByIdentity(identityPath)
  return queries.map((query) => {
    const { nodes, error } = queryNodes(query.kind, query.expression)
    if (error) {
      return { syntaxValid: false, matchCount: 0, error: error.split('\n')[0], intendedMatched: false }
    }
    return {
      syntaxValid: true,
      matchCount: nodes.length,
      intendedMatched: intended ? nodes.includes(intended) : identityPath?.includes('shadow()') ? null : false,
    }
  })
}

const LAYER_ID = 'toolbox-selector-studio-highlights'

export function clearSelectorHighlights(): void {
  document.getElementById(LAYER_ID)?.remove()
}

/** Isolated overlay boxes. Does not mutate page styles. */
export function highlightSelectorMatches(
  kind: 'css' | 'xpath',
  expression: string,
  identityPath: string | null,
): InPageHighlightResult {
  clearSelectorHighlights()
  const { nodes, error } = queryNodes(kind, expression)
  if (error) return { count: 0, error: error.split('\n')[0] }
  if (!nodes.length) return { count: 0 }

  const layer = document.createElement('div')
  layer.id = LAYER_ID
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483645',
    pointerEvents: 'none',
  })
  const intended = findByIdentity(identityPath)
  const total = nodes.length
  nodes.forEach((node, index) => {
    const rect = node.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const box = document.createElement('div')
    const selected = intended === node
    Object.assign(box.style, {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: selected ? '2px solid #ff7700' : '1px solid rgba(14, 165, 233, 0.9)',
      background: selected ? 'rgba(255, 119, 0, 0.14)' : 'rgba(14, 165, 233, 0.1)',
      boxSizing: 'border-box',
      borderRadius: '2px',
    })
    const label = document.createElement('span')
    const matchIndex = index + 1
    label.textContent = selected && total === 1 ? '1' : `${matchIndex}${total > 1 ? `/${total}` : ''}`
    Object.assign(label.style, {
      position: 'absolute',
      top: '-1px',
      left: '-1px',
      font: 'bold 9px/14px system-ui,sans-serif',
      color: '#fff',
      background: selected ? '#ff7700' : '#0ea5e9',
      borderRadius: '8px',
      padding: '0 4px',
      minWidth: '14px',
      textAlign: 'center',
    })
    box.appendChild(label)
    layer.appendChild(box)
  })
  document.documentElement.appendChild(layer)
  return { count: nodes.length }
}

export function inspectConnected(identityPath: string | null): boolean {
  const node = findByIdentity(identityPath)
  return Boolean(node?.isConnected)
}
