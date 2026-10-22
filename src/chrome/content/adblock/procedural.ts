/**
 * Page-side engine for uBO procedural cosmetic filters. Loaded on demand (only on sites that have
 * such filters) and driven by tasks the build compiled and validated:
 * `{ sel, ops: [[op, ...args]], action? }`.
 */

export type ProceduralOp = [string, ...unknown[]]

export interface ProceduralTask {
  sel: string | null
  ops: ProceduralOp[]
  action?: ProceduralOp
}

export interface ProceduralOptions {
  report?: (count: number) => void
}

type Pattern = [string, string]
type Root = Element | Document

const RUN_DELAY_MS = 150

const regexCache = new Map<string, RegExp>()
function regex([source, flags]: Pattern): RegExp {
  const key = `${flags}/${source}`
  let re = regexCache.get(key)
  if (!re) {
    re = new RegExp(source, flags)
    regexCache.set(key, re)
  }
  return re
}

function query(root: Root, selector: string): Element[] {
  return Array.from(root.querySelectorAll(selector))
}

/** Elements reached from `el` by a CSS step that starts with a combinator (or a descendant step). */
function walk(el: Element, step: string): Element[] {
  if (step[0] === '+' || step[0] === '~') {
    const parent = el.parentElement
    if (!parent) return []
    let index = 1
    for (let prev = el.previousElementSibling; prev; prev = prev.previousElementSibling) index++
    return query(parent, `:scope > :nth-child(${index}) ${step}`)
  }
  return query(el, `:scope ${step}`)
}

function unique(list: Element[]): Element[] {
  return list.length < 2 ? list : [...new Set(list)]
}

/** `:others()`: everything outside the targets' ancestor chains and subtrees. */
function others(targets: Element[]): Element[] {
  const keep = new Set<Element>()
  for (const target of targets) {
    for (let el: Element | null = target; el; el = el.parentElement) keep.add(el)
  }
  const out: Element[] = []
  for (const el of keep) {
    if (targets.includes(el)) continue
    for (const child of el.children) {
      if (!keep.has(child) && child.tagName !== 'HEAD' && child.tagName !== 'SCRIPT') out.push(child)
    }
  }
  return out
}

function applyOp(op: ProceduralOp, nodes: Element[]): Element[] {
  switch (op[0]) {
    case 'has-text': {
      const re = regex([op[1], op[2]] as Pattern)
      return nodes.filter((el) => re.test(el.textContent ?? ''))
    }
    case 'has':
      return nodes.filter((el) => run(op[1] as ProceduralTask, el).length > 0)
    case 'not':
      return nodes.filter((el) => run(op[1] as ProceduralTask, el).length === 0)
    case 'upward': {
      const arg = op[1]
      const out: Element[] = []
      for (const el of nodes) {
        let target: Element | null
        if (typeof arg === 'number') {
          target = el
          for (let i = 0; target && i < arg; i++) target = target.parentElement
        } else target = el.parentElement?.closest(arg as string) ?? null
        if (target) out.push(target)
      }
      return unique(out)
    }
    case 'matches-css': {
      const [, pseudo, prop, source, flags] = op as [string, string | null, string, string, string]
      const re = regex([source, flags])
      return nodes.filter((el) => re.test(getComputedStyle(el, pseudo).getPropertyValue(prop)))
    }
    case 'matches-attr': {
      const name = regex(op[1] as Pattern)
      const value = op[2] ? regex(op[2] as Pattern) : null
      return nodes.filter((el) => {
        for (const attr of el.attributes) {
          if (name.test(attr.name) && (!value || value.test(attr.value))) return true
        }
        return false
      })
    }
    case 'matches-path':
      return regex([op[1], op[2]] as Pattern).test(location.pathname + location.search) ? nodes : []
    case 'matches-media':
      return matchMedia(op[1] as string).matches ? nodes : []
    case 'min-text-length': {
      const min = op[1] as number
      return nodes.filter((el) => (el.textContent ?? '').length >= min)
    }
    case 'xpath': {
      const out: Element[] = []
      for (const el of nodes) {
        const result = document.evaluate(op[1] as string, el, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i)
          if (node instanceof Element) out.push(node)
        }
      }
      return unique(out)
    }
    case 'others':
      return others(nodes)
    case 'shadow':
      return unique(nodes.flatMap((el) => (el.shadowRoot ? query(el.shadowRoot as unknown as Document, op[1] as string) : [])))
    case 'spath':
      return unique(nodes.flatMap((el) => walk(el, op[1] as string)))
    case 'matches':
      return nodes.filter((el) => el.matches(op[1] as string))
    case 'watch-attr':
      return nodes
    default:
      return []
  }
}

/** Evaluates a task from `root`; a task without a selector starts at the root element itself. */
export function run(task: ProceduralTask, root: Root): Element[] {
  let nodes: Element[]
  if (task.sel === null) {
    const start = root instanceof Document ? root.documentElement : root
    nodes = start ? [start] : []
  } else nodes = query(root, task.sel)
  for (const op of task.ops) {
    if (!nodes.length) break
    nodes = applyOp(op, nodes)
  }
  return nodes
}

function randomToken(): string {
  return `tbx${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Starts applying `tasks` to the document and keeps them applied as the page changes.
 * Returns a function that stops the engine and undoes hiding / styling.
 */
export function startProcedural(tasks: ProceduralTask[], options: ProceduralOptions = {}): () => void {
  const token = randomToken()
  const hideAttr = `${token}-h`
  const style = document.createElement('style')
  const rules = [`[${hideAttr}]{display:none!important}`]
  const state = tasks.map((task, i) => {
    const attr = task.action?.[0] === 'style' ? `${token}-s${i}` : task.action ? null : hideAttr
    if (task.action?.[0] === 'style') rules.push(`[${attr}]{${task.action[1] as string}}`)
    return { task, attr, applied: new Set<Element>(), dead: false }
  })
  style.textContent = rules.join('\n')
  ;(document.head ?? document.documentElement).appendChild(style)

  const counted = new WeakSet<Element>()
  let fresh = 0
  const count = (el: Element) => {
    if (counted.has(el)) return
    counted.add(el)
    fresh++
  }

  const act = (action: ProceduralOp, el: Element) => {
    switch (action[0]) {
      case 'remove':
        el.remove()
        count(el)
        break
      case 'remove-attr': {
        const re = regex([action[1], action[2]] as Pattern)
        for (const name of el.getAttributeNames()) if (re.test(name)) el.removeAttribute(name)
        break
      }
      case 'remove-class': {
        const re = regex([action[1], action[2]] as Pattern)
        for (const name of [...el.classList]) if (re.test(name)) el.classList.remove(name)
        break
      }
    }
  }

  let hidden = new Set<Element>()
  /** Marks `now` with `attr` and clears it from elements that no longer match. */
  const sync = (attr: string, before: Set<Element>, now: Set<Element>) => {
    for (const el of before) if (!now.has(el)) el.removeAttribute(attr)
    for (const el of now) if (!el.hasAttribute(attr)) el.setAttribute(attr, '')
  }

  const runAll = () => {
    const hideNow = new Set<Element>()
    for (const entry of state) {
      if (entry.dead) continue
      let matched: Element[]
      try {
        matched = run(entry.task, document)
      } catch {
        // A selector this browser cannot parse: drop just this filter.
        entry.dead = true
        continue
      }
      const { attr, task } = entry
      if (!attr) {
        for (const el of matched) act(task.action!, el)
      } else if (attr === hideAttr) {
        for (const el of matched) hideNow.add(el)
      } else {
        const now = new Set(matched)
        sync(attr, entry.applied, now)
        entry.applied = now
      }
    }
    sync(hideAttr, hidden, hideNow)
    for (const el of hideNow) count(el)
    hidden = hideNow
    if (fresh) {
      options.report?.(fresh)
      fresh = 0
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = false
  const flush = () => {
    timer = null
    if (document.visibilityState === 'hidden') {
      pending = true
      return
    }
    runAll()
  }
  const schedule = () => {
    timer ??= setTimeout(flush, RUN_DELAY_MS)
  }
  const onVisible = () => {
    if (pending && document.visibilityState === 'visible') {
      pending = false
      schedule()
    }
  }

  const watched = new Set<string>()
  for (const { task } of state) {
    const visit = (t: ProceduralTask) => {
      for (const op of t.ops) {
        if (op[0] === 'watch-attr') for (const a of op[1] as string[]) watched.add(a)
        if (op[0] === 'has' || op[0] === 'not') visit(op[1] as ProceduralTask)
      }
    }
    visit(task)
  }
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    ...(watched.size ? { attributes: true, attributeFilter: [...watched] } : {}),
  })
  document.addEventListener('visibilitychange', onVisible)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  runAll()

  return () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', onVisible)
    if (timer) clearTimeout(timer)
    style.remove()
    for (const el of hidden) el.removeAttribute(hideAttr)
    for (const { attr, applied } of state) {
      if (attr && attr !== hideAttr) for (const el of applied) el.removeAttribute(attr)
    }
  }
}
