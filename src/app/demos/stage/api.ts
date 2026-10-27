import { gsap } from './gsap'

export type Target = string | Element | Element[] | NodeListOf<Element> | null | undefined
type Position = gsap.Position | undefined

export interface MoveOptions {
  at?: Position
  duration?: number
  /** Anchor inside the target, 0..1 (default centre). */
  ax?: number
  ay?: number
  dx?: number
  dy?: number
}

export interface DemoApi {
  tl: gsap.core.Timeline
  root: HTMLElement
  W: number
  H: number
  /** First element whose `data-d` contains `name`. */
  q: (name: string) => HTMLElement
  qa: (name: string) => HTMLElement[]
  /** Layout position inside the canvas (ignores transforms, so it is safe during entrance animations). */
  pos: (target: Target, ax?: number, ay?: number) => { x: number; y: number; w: number; h: number }
  step: (index: number, at?: Position) => void
  final: (at?: Position) => void
  wait: (seconds: number) => void
  move: (target: Target, options?: MoveOptions) => void
  moveTo: (x: number, y: number, options?: { at?: Position; duration?: number }) => void
  click: (target?: Target, at?: Position) => void
  type: (target: Target, text: string, options?: { at?: Position; speed?: number }) => void
  scramble: (
    target: Target,
    text: string,
    options?: { at?: Position; duration?: number; chars?: string },
  ) => void
  count: (
    target: Target,
    to: number,
    options?: {
      from?: number
      at?: Position
      duration?: number
      decimals?: number
      prefix?: string
      suffix?: string
      ease?: string
    },
  ) => void
  cursorOut: (at?: Position) => void
  /** Arcs an absolutely positioned element (a direct child of the canvas) from one target's centre to another's. */
  fly: (
    element: Target,
    from: Target,
    to: Target,
    options?: { at?: Position; duration?: number; lift?: number; scale?: number },
  ) => void
}

export type Build = (api: DemoApi) => void

function resolve(root: HTMLElement, target: Target): HTMLElement[] {
  if (!target) return []
  if (typeof target === 'string')
    return Array.from(root.querySelectorAll<HTMLElement>(`[data-d~="${target}"]`))
  if (target instanceof Element) return [target as HTMLElement]
  return Array.from(target as ArrayLike<Element>) as HTMLElement[]
}

function offsetWithin(element: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = element
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    const parent = node.offsetParent as HTMLElement | null
    if (parent && parent !== root && !root.contains(parent)) break
    node = parent
  }
  return { x, y }
}

export function createApi(
  tl: gsap.core.Timeline,
  root: HTMLElement,
  W: number,
  H: number,
): DemoApi {
  const cursor = root.querySelector<HTMLElement>('[data-demo-cursor]')
  const ripple = root.querySelector<HTMLElement>('[data-demo-ripple]')
  let cx = W * 0.78
  let cy = H + 40
  if (cursor) tl.set(cursor, { x: cx, y: cy, opacity: 1, scale: 1 }, 0)

  const pos: DemoApi['pos'] = (target, ax = 0.5, ay = 0.5) => {
    const element = resolve(root, target)[0]
    if (!element) return { x: W / 2, y: H / 2, w: 0, h: 0 }
    const { x, y } = offsetWithin(element, root)
    const w = element.offsetWidth
    const h = element.offsetHeight
    return { x: x + w * ax, y: y + h * ay, w, h }
  }

  const moveTo: DemoApi['moveTo'] = (x, y, { at, duration } = {}) => {
    if (!cursor) return
    const distance = Math.hypot(x - cx, y - cy)
    cx = x
    cy = y
    tl.to(
      cursor,
      {
        x,
        y,
        opacity: 1,
        duration: duration ?? gsap.utils.clamp(0.45, 1.1, distance / 420),
        ease: 'power3.inOut',
      },
      at,
    )
  }

  // Labels never extend a timeline, so a spacer makes the next tween start at the label rather than before it.
  const mark = (label: string, at: Position) => {
    tl.addLabel(label, at)
    tl.set({}, {}, label)
  }

  return {
    tl,
    root,
    W,
    H,
    q: (name) => resolve(root, name)[0],
    qa: (name) => resolve(root, name),
    pos,
    step: (index, at) => mark(`step-${index}`, at),
    final: (at) => mark('final', at),
    wait: (seconds) => {
      tl.to({}, { duration: seconds })
    },
    moveTo,
    move: (target, { at, duration, ax, ay, dx = 0, dy = 0 } = {}) => {
      const point = pos(target, ax, ay)
      moveTo(point.x + dx, point.y + dy, { at, duration })
    },
    click: (target, at) => {
      if (cursor) {
        tl.to(cursor, { scale: 0.8, duration: 0.09, ease: 'power2.in' }, at)
        tl.to(cursor, { scale: 1, duration: 0.25, ease: 'back.out(3)' })
      }
      if (ripple) {
        tl.fromTo(
          ripple,
          { x: cx, y: cy, scale: 0, opacity: 0.6 },
          { scale: 1, opacity: 0, duration: 0.6, ease: 'power2.out', immediateRender: false },
          cursor ? '<-0.12' : at,
        )
      }
      const targets = resolve(root, target)
      if (targets.length)
        tl.to(
          targets,
          { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' },
          '<',
        )
    },
    type: (target, text, { at, speed = 0.035 } = {}) => {
      const targets = resolve(root, target)
      if (!targets.length) return
      tl.to(
        targets,
        {
          text: { value: text, delimiter: '' },
          duration: Math.max(0.2, text.length * speed),
          ease: 'none',
        },
        at,
      )
    },
    scramble: (target, text, { at, duration = 1.1, chars = 'upperAndLowerCase' } = {}) => {
      const targets = resolve(root, target)
      if (!targets.length) return
      tl.to(
        targets,
        { duration, scrambleText: { text, chars, speed: 0.7, revealDelay: 0.15 }, ease: 'none' },
        at,
      )
    },
    count: (
      target,
      to,
      {
        from = 0,
        at,
        duration = 1.2,
        decimals = 0,
        prefix = '',
        suffix = '',
        ease = 'power2.out',
      } = {},
    ) => {
      const targets = resolve(root, target)
      if (!targets.length) return
      const proxy = { v: from }
      const render = () => {
        const text = `${prefix}${proxy.v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
        targets.forEach((element) => {
          element.textContent = text
        })
      }
      tl.fromTo(
        proxy,
        { v: from },
        { v: to, duration, ease, onUpdate: render, onStart: render },
        at,
      )
    },
    cursorOut: (at) => {
      if (!cursor) return
      cx = W * 0.78
      cy = H + 40
      tl.to(cursor, { x: cx, y: cy, opacity: 0, duration: 0.7, ease: 'power2.in' }, at)
    },
    fly: (element, from, to, { at, duration = 0.8, lift = 60, scale = 1 } = {}) => {
      const node = resolve(root, element)[0]
      if (!node) return
      const half = { x: node.offsetWidth / 2, y: node.offsetHeight / 2 }
      const a = pos(from)
      const b = pos(to)
      const start = { x: a.x - half.x, y: a.y - half.y }
      const end = { x: b.x - half.x, y: b.y - half.y }
      const peak = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - lift }
      tl.fromTo(
        node,
        { x: start.x, y: start.y, opacity: 1, scale: 1 },
        {
          motionPath: { path: [start, peak, end], curviness: 1.25 },
          scale,
          duration,
          ease: 'power2.inOut',
          immediateRender: false,
        },
        at,
      )
    },
  }
}
