/**
 * When YouTube suspects an ad blocker it schedules playback behind a 17 s timer (the
 * "Experiencing interruptions?" buffering) and pauses or tears down the player from an
 * `onAbnormalityDetected` callback. These hooks mirror uBO's quick fixes for both:
 * `nano-stb, [native code], 17000, 0.001` and the Promise.then filter in its serverContract patch.
 */

export const PENALTY_DELAY_MS = 17000
const BOOST_FACTOR = 0.001

export function boostedDelay(handler: unknown, delay: unknown): unknown {
  if (Number(delay) !== PENALTY_DELAY_MS || typeof handler !== 'function') return delay
  return String(handler).includes('[native code]') ? PENALTY_DELAY_MS * BOOST_FACTOR : delay
}

export function installPenaltyTimerBooster(win: Window & typeof globalThis = window): void {
  win.setTimeout = new Proxy(win.setTimeout, {
    apply(target, thisArg, args: unknown[]) {
      if (args.length > 1) args[1] = boostedDelay(args[0], args[1])
      return Reflect.apply(target, thisArg, args)
    },
  })
}

const checked = new WeakMap<object, boolean>()

export function isAbnormalityHandler(fn: unknown): boolean {
  if (typeof fn !== 'function') return false
  let hit = checked.get(fn)
  if (hit === undefined) {
    try {
      hit = Function.prototype.toString.call(fn).includes('onAbnormalityDetected')
    } catch {
      hit = false
    }
    checked.set(fn, hit)
  }
  return hit
}

const noop = () => undefined

export function installAbnormalityFilter(win: Window & typeof globalThis = window): void {
  const proto = win.Promise.prototype
  proto.then = new Proxy(proto.then, {
    apply(target, thisArg, args: unknown[]) {
      if (isAbnormalityHandler(args[0])) args[0] = noop
      return Reflect.apply(target, thisArg, args)
    },
  })
}
