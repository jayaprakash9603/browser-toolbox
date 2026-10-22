/**
 * Runtime helpers shared by every scriptlet. They run in the page's MAIN world before any page
 * script, so the natives captured here are the browser's own.
 */
export function makeHelpers(trusted) {
  const win = window
  const doc = document
  const { apply } = Reflect
  const defineProperty = Object.defineProperty
  const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  const NativeRegExp = RegExp
  const nativeToString = Function.prototype.toString
  const NativeError = Error
  const magic = `tbx${Math.floor(Math.random() * 1e12).toString(36)}`
  let swallowing = false

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const isObject = (v) => v !== null && (typeof v === 'object' || typeof v === 'function')

  /** `''` matches everything, `!x` negates, `/re/flags` is a regex, anything else a substring. */
  function pattern(raw, literalFlags = '') {
    let source = raw == null ? '' : String(raw)
    let negate = false
    if (source.startsWith('!')) {
      negate = true
      source = source.slice(1)
    }
    let re = null
    if (source !== '') {
      const m = /^\/(.+)\/([dimsuy]*)$/.exec(source)
      try {
        re = m ? new NativeRegExp(m[1], m[2]) : new NativeRegExp(escapeRe(source), literalFlags)
      } catch {
        re = /(?!)/
      }
    }
    return {
      empty: source === '',
      re,
      test: (s) => (re === null ? true : re.test(String(s))) !== negate,
    }
  }

  function text(value) {
    if (typeof value === 'function') {
      try {
        return apply(nativeToString, value, [])
      } catch {
        return ''
      }
    }
    try {
      return String(value)
    } catch {
      return ''
    }
  }

  function abortError() {
    if (!swallowing) {
      swallowing = true
      win.addEventListener('error', (ev) => {
        if (typeof ev.message === 'string' && ev.message.includes(magic)) ev.preventDefault()
      })
    }
    return new ReferenceError(magic)
  }

  function wrapApply(owner, prop, handler) {
    const original = owner && owner[prop]
    if (typeof original !== 'function') return
    try {
      owner[prop] = new Proxy(original, { apply: handler })
    } catch {
      /* frozen */
    }
  }

  /** Waits for the owners of `a.b.c` to exist and hands the final owner/property to `onLeaf`. */
  function trapChain(chain, onLeaf, root = win) {
    const step = (owner, path) => {
      const dot = path.indexOf('.')
      if (dot === -1) {
        const desc = onLeaf(owner, path)
        if (desc) {
          try {
            defineProperty(owner, path, desc)
          } catch {
            /* non-configurable */
          }
        }
        return
      }
      const prop = path.slice(0, dot)
      const rest = path.slice(dot + 1)
      let current
      try {
        current = owner[prop]
      } catch {
        return
      }
      if (isObject(current)) {
        step(current, rest)
        return
      }
      const desc = getOwnPropertyDescriptor(owner, prop)
      if (desc && desc.configurable === false) return
      let value = current
      try {
        defineProperty(owner, prop, {
          configurable: true,
          enumerable: true,
          get: () => value,
          set: (next) => {
            value = next
            if (isObject(next)) step(next, rest)
          },
        })
      } catch {
        /* sealed */
      }
    }
    if (chain) step(root, String(chain))
  }

  /** uBO's set-constant vocabulary; `trusted` scriptlets may also use any JSON value. */
  function constant(raw) {
    const value = raw == null ? 'undefined' : String(raw)
    const fn = (body) => ({ value: body })
    switch (value) {
      case 'undefined':
        return fn(undefined)
      case 'false':
        return fn(false)
      case 'true':
        return fn(true)
      case 'null':
        return fn(null)
      case "''":
      case '':
      case 'emptyStr':
        return fn('')
      case 'noopFunc':
        return fn(function () {})
      case 'noopCallbackFunc':
        return fn(function () {
          return function () {}
        })
      case 'trueFunc':
        return fn(function () {
          return true
        })
      case 'falseFunc':
        return fn(function () {
          return false
        })
      case 'throwFunc':
        return fn(function () {
          throw new NativeError('')
        })
      case 'noopPromiseResolve':
        return fn(function () {
          return Promise.resolve()
        })
      case 'noopPromiseReject':
        return fn(function () {
          return Promise.reject(new NativeError(''))
        })
      case '[]':
      case 'emptyArr':
        return fn([])
      case '{}':
      case 'emptyObj':
        return fn({})
      case 'NaN':
        return fn(Number.NaN)
      case 'Infinity':
        return fn(Number.POSITIVE_INFINITY)
      case '-Infinity':
        return fn(Number.NEGATIVE_INFINITY)
      case 'yes':
      case 'no':
      case 'on':
      case 'off':
      case 'ok':
      case 'accept':
      case 'accepted':
      case 'reject':
      case 'rejected':
      case 'allow':
      case 'allowed':
      case 'deny':
      case 'denied':
        return fn(value)
      default:
        break
    }
    if (/^-?\d+$/.test(value)) {
      const n = Number(value)
      if (trusted || Math.abs(n) <= 0x7fff) return fn(n)
    }
    if (trusted) {
      try {
        return fn(JSON.parse(value))
      } catch {
        return fn(value)
      }
    }
    return null
  }

  /** Trailing `name, value` pairs after the positional arguments. */
  function extras(args) {
    const out = {}
    for (let i = 0; i + 1 < args.length; i += 2) out[String(args[i])] = String(args[i + 1])
    return out
  }

  /** `key:value` (or a bare URL needle) pairs, all of which must match the request details. */
  function propsMatcher(raw) {
    const needles = []
    for (const part of String(raw ?? '').split(/\s+/)) {
      if (!part) continue
      const colon = part.indexOf(':')
      const isKey = colon > 0 && /^[a-zA-Z]+$/.test(part.slice(0, colon)) && !/^https?$/.test(part.slice(0, colon))
      needles.push(isKey ? [part.slice(0, colon), pattern(part.slice(colon + 1))] : ['url', pattern(part)])
    }
    return {
      empty: needles.length === 0,
      test(details) {
        for (const [key, p] of needles) {
          const value = details[key]
          if (value === undefined || !p.test(value)) return false
        }
        return true
      },
    }
  }

  function stackText() {
    const raw = new NativeError().stack || ''
    const here = doc.location.href.split('#')[0]
    const out = []
    for (const line of raw.split('\n')) {
      if (/chrome-extension:\/\//.test(line)) continue
      const url = /(?:https?|blob|data|file):[^\s)]+?(?=:\d+:\d+)/.exec(line)
      if (url && url[0].split('#')[0] === here) out.push('inlineScript')
      else if (/<anonymous>/.test(line)) out.push('injectedScript')
      else if (url) out.push(url[0])
      else if (/\S/.test(line) && !/^Error/.test(line.trim())) out.push(line.trim())
    }
    return out.join('\t')
  }

  /** Runs `fn` once the DOM is ready, then again on (throttled) mutations until load unless `stay`. */
  function domRunner(fn, behavior = '') {
    let timer = 0
    let observer = null
    const run = () => {
      timer = 0
      try {
        fn()
      } catch {
        /* page DOM changed under us */
      }
    }
    const schedule = () => {
      if (!timer) timer = setTimeout(run, 16)
    }
    const start = () => {
      run()
      if (!observer && typeof MutationObserver === 'function') {
        observer = new MutationObserver(schedule)
        observer.observe(doc, { childList: true, subtree: true, attributes: true })
      }
      if (!/stay/.test(behavior)) {
        const stop = () => setTimeout(() => observer && observer.disconnect(), 2000)
        if (doc.readyState === 'complete') stop()
        else win.addEventListener('load', stop, { once: true })
      }
    }
    if (/asap/.test(behavior)) start()
    else if (/complete/.test(behavior)) {
      if (doc.readyState === 'complete') start()
      else win.addEventListener('load', start, { once: true })
    } else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true })
    else start()
  }

  function observeNodes(onNode, quitAfter) {
    if (typeof MutationObserver !== 'function') return
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) onNode(node)
      }
    })
    observer.observe(doc, { childList: true, subtree: true })
    const ms = Number.parseInt(quitAfter, 10)
    if (ms > 0) setTimeout(() => observer.disconnect(), ms)
  }

  function randomText(length = 10) {
    let out = ''
    while (out.length < length) out += Math.random().toString(36).slice(2)
    return out.slice(0, length)
  }

  function tokenValue(value) {
    if (value === '$now$') return String(Date.now())
    if (value === '$currentDate$') return new Date().toUTCString()
    if (value === '$currentISODate$') return new Date().toISOString()
    return value
  }

  /** Walks `a.b.[].c` / `a.*.c` and calls `onMatch(owner, key)` for every resolved leaf. */
  function walkPath(root, path, onMatch) {
    const segments = String(path).split('.')
    const visit = (node, index) => {
      if (!isObject(node)) return
      const segment = segments[index]
      const last = index === segments.length - 1
      const keys = segment === '[]' || segment === '*' ? Object.keys(node) : segment in node ? [segment] : []
      for (const key of keys) {
        if (last) onMatch(node, key)
        else visit(node[key], index + 1)
      }
    }
    if (segments.length && segments[0] !== '') visit(root, 0)
  }

  function jsonPruner(rawPrune, rawNeedles) {
    const prunePaths = String(rawPrune ?? '').split(/\s+/).filter(Boolean)
    const needlePaths = String(rawNeedles ?? '').split(/\s+/).filter(Boolean)
    return (data) => {
      if (!isObject(data) || !prunePaths.length) return false
      for (const needle of needlePaths) {
        let found = false
        walkPath(data, needle, () => {
          found = true
        })
        if (!found) return false
      }
      let pruned = false
      for (const path of prunePaths) {
        walkPath(data, path, (owner, key) => {
          try {
            if (delete owner[key]) pruned = true
          } catch {
            /* frozen */
          }
        })
      }
      return pruned
    }
  }

  function cookieDomains() {
    const parts = doc.location.hostname.split('.')
    const out = ['']
    for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'))
    return out
  }

  return {
    win,
    doc,
    trusted,
    apply,
    defineProperty,
    getOwnPropertyDescriptor,
    isObject,
    pattern,
    text,
    abortError,
    wrapApply,
    trapChain,
    constant,
    extras,
    propsMatcher,
    stackText,
    domRunner,
    observeNodes,
    randomText,
    tokenValue,
    walkPath,
    jsonPruner,
    cookieDomains,
  }
}
