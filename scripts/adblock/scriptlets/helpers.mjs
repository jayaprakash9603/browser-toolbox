const NATIVE = {
  JSON_parse: JSON.parse,
  JSON_stringify: JSON.stringify,
  hasOwn: Object.hasOwn,
  Request_clone: typeof Request === 'function' ? Request.prototype.clone : null,
  Response_json: typeof Response === 'function' ? Response.json : null,
  objectToString: Object.prototype.toString,
}
let scriptPolicy

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
      // Another trap may already sit on this owner (several filters share a root): chain to it.
      const prevGet = desc && typeof desc.get === 'function' ? desc.get : null
      const prevSet = desc && typeof desc.set === 'function' ? desc.set : null
      let value = current
      try {
        defineProperty(owner, prop, {
          configurable: true,
          enumerable: true,
          get: () => (prevGet ? apply(prevGet, owner, []) : value),
          set: (next) => {
            if (prevSet) apply(prevSet, owner, [next])
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

  /** uBO's patternToRegex: `/re/flags` as written, anything else a literal (`verbatim` anchors it). */
  function toRegex(raw, flags, verbatim = false) {
    const source = raw == null ? '' : String(raw)
    if (source === '') return /^/
    const m = /^\/(.+)\/([gimsu]*)$/.exec(source)
    if (m === null) {
      const escaped = escapeRe(source)
      return new NativeRegExp(verbatim ? `^${escaped}$` : escaped, flags)
    }
    try {
      return new NativeRegExp(m[1], m[2] || undefined)
    } catch {
      return /^/
    }
  }

  /**
   * `key:value` (or a bare URL needle) pairs, all of which must match the request details. As in
   * uBO, a property the request doesn't carry is skipped rather than failing the match.
   */
  function propsMatcher(raw) {
    const needles = []
    for (const part of String(raw ?? '').split(/\s+/)) {
      if (!part) continue
      const colon = part.indexOf(':')
      const key = colon === -1 ? '' : part.slice(0, colon)
      const isKey = key !== '' && !/[^$\w -]/.test(key) && !/^https?$/.test(key)
      needles.push(isKey ? [key, pattern(part.slice(colon + 1))] : ['url', pattern(part)])
    }
    return {
      empty: needles.length === 0,
      test(details) {
        for (const [key, p] of needles) {
          let value = details[key]
          if (value === undefined) continue
          if (typeof value !== 'string') {
            try {
              value = NATIVE.JSON_stringify(value)
            } catch {
              continue
            }
            if (typeof value !== 'string') continue
          }
          if (!p.test(value)) return false
        }
        return true
      },
    }
  }

  const FETCH_PROPS = [
    'body', 'cache', 'credentials', 'duplex', 'headers', 'integrity', 'keepalive', 'method', 'mode',
    'priority', 'redirect', 'referrer', 'referrerPolicy', 'url',
  ]

  /** The request details `fetch(resource, options)` will use, for `propsToMatch`. */
  function fetchDetails(resource, options) {
    const out = {}
    const collect = (src) => {
      for (const prop of FETCH_PROPS) if (src[prop] !== undefined) out[prop] = src[prop]
    }
    if (typeof resource === 'object' && resource !== null && apply(NATIVE.objectToString, resource, []) === '[object Request]') {
      let clone = null
      try {
        clone = apply(NATIVE.Request_clone, resource, [])
      } catch {
        /* body already used */
      }
      collect(clone || resource)
    } else out.url = `${resource}`
    if (typeof options === 'object' && options !== null) collect(options)
    return out
  }

  /** Copies the response metadata a rebuilt `Response` would otherwise lose. */
  function withResponseMeta(after, before) {
    Object.defineProperties(after, {
      ok: { value: before.ok },
      redirected: { value: before.redirected },
      type: { value: before.type },
      url: { value: before.url },
    })
    return after
  }

  /** Script text through a Trusted Types policy, since sites like YouTube enforce them. */
  function scriptText(value) {
    if (scriptPolicy === undefined) {
      scriptPolicy = null
      const tt = win.trustedTypes
      if (tt && typeof tt.createPolicy === 'function') {
        try {
          scriptPolicy = tt.createPolicy(magic, { createScript: (s) => s })
        } catch {
          /* policy name not allowed by the page CSP */
        }
      }
    }
    return scriptPolicy ? scriptPolicy.createScript(value) : value
  }

  /** Resolves `a.b.c` to `{ owner, prop }` without creating anything. */
  function resolveChain(chain, root = win) {
    let owner = root
    const parts = String(chain).split('.')
    const prop = parts.pop()
    for (const part of parts) {
      try {
        owner = owner[part]
      } catch {
        return null
      }
      if (!isObject(owner)) return null
    }
    return { owner, prop }
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

  /**
   * uBO's object path lookup: `a.b`, `[]`/`{}`/`*` fan out over array items / object keys, and
   * `[-]`/`{-}` remove the whole item whose remaining path matches. With `prune`, the leaf (or
   * every key for a `*` leaf) is deleted. Returns whether anything matched.
   */
  function findOwner(root, path, prune = false) {
    let owner = root
    let chain = path
    for (;;) {
      if (typeof owner !== 'object' || owner === null) return false
      const pos = chain.indexOf('.')
      if (pos === -1) {
        if (!prune) return NATIVE.hasOwn(owner, chain)
        let modified = false
        try {
          if (chain === '*') {
            for (const key in owner) {
              if (!NATIVE.hasOwn(owner, key)) continue
              delete owner[key]
              modified = true
            }
          } else if (NATIVE.hasOwn(owner, chain)) {
            delete owner[chain]
            modified = true
          }
        } catch {
          /* frozen */
        }
        return modified
      }
      const prop = chain.slice(0, pos)
      const next = chain.slice(pos + 1)
      let found = false
      if (prop === '[-]' && Array.isArray(owner)) {
        let i = owner.length
        while (i--) {
          if (!findOwner(owner[i], next)) continue
          owner.splice(i, 1)
          found = true
        }
        return found
      }
      if (prop === '{-}' && owner instanceof Object) {
        for (const key of Object.keys(owner)) {
          if (!findOwner(owner[key], next)) continue
          delete owner[key]
          found = true
        }
        return found
      }
      if ((prop === '[]' && Array.isArray(owner)) || ((prop === '{}' || prop === '*') && owner instanceof Object)) {
        for (const key of Object.keys(owner)) {
          if (findOwner(owner[key], next, prune)) found = true
        }
        return found
      }
      if (!NATIVE.hasOwn(owner, prop)) return false
      owner = owner[prop]
      chain = next
    }
  }

  /** Returns a pruner that reports whether it changed the object (uBO's object-prune). */
  function jsonPruner(rawPrune, rawNeedles) {
    const prunePaths = String(rawPrune ?? '').split(/ +/).filter(Boolean)
    const needlePaths = prunePaths.length ? String(rawNeedles ?? '').split(/ +/).filter(Boolean) : []
    return (data) => {
      if (!isObject(data) || !prunePaths.length) return false
      for (const needle of needlePaths) if (!findOwner(data, needle)) return false
      let pruned = false
      for (const path of prunePaths) if (findOwner(data, path, true)) pruned = true
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
    findOwner,
    jsonPruner,
    cookieDomains,
    toRegex,
    fetchDetails,
    withResponseMeta,
    scriptText,
    resolveChain,
    native: NATIVE,
  }
}
