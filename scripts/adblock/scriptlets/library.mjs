/**
 * Scriptlet implementations, compatible with uBlock Origin's `##+js(...)` names and arguments.
 * Each receives `h` (see helpers.mjs) followed by the filter's arguments. They are bundled into
 * the MAIN-world page script, and the list build uses SCRIPTLETS to validate filters.
 */

import { createJsonPath } from './jsonpath.mjs'

function setConstant(h, chain, rawValue, ...rest) {
  if (!chain) return
  const parsed = h.constant(rawValue)
  if (!parsed) return
  let value = parsed.value
  const as = h.extras(rest).as
  if (as === 'function') {
    const inner = value
    value = function () {
      return inner
    }
  } else if (as === 'callback') {
    const inner = value
    value = function () {
      return function () {
        return inner
      }
    }
  } else if (as === 'resolved') value = Promise.resolve(value)
  else if (as === 'rejected') value = Promise.reject(value)
  h.trapChain(chain, (owner, prop) => {
    const existing = h.getOwnPropertyDescriptor(owner, prop)
    if (existing && existing.configurable === false) return null
    let current
    try {
      current = owner[prop]
    } catch {
      current = undefined
    }
    if (current != null && value != null && typeof current !== typeof value) return null
    return { configurable: true, enumerable: true, get: () => value, set: () => {} }
  })
}

function abortOnPropertyRead(h, chain) {
  if (!chain) return
  h.trapChain(chain, () => ({
    configurable: true,
    get: () => {
      throw h.abortError()
    },
    set: () => {},
  }))
}

function abortOnPropertyWrite(h, chain) {
  if (!chain) return
  h.trapChain(chain, (owner, prop) => {
    let value = owner[prop]
    return {
      configurable: true,
      get: () => value,
      set: () => {
        throw h.abortError()
      },
    }
  })
}

function abortCurrentScript(h, chain, needle, context) {
  if (!chain) return
  const doc = h.doc
  const own = doc.currentScript
  const needleP = h.pattern(needle)
  const contextP = h.pattern(context)
  const validate = () => {
    const script = doc.currentScript
    if (!(script instanceof HTMLScriptElement) || script === own) return
    if (!contextP.empty && !contextP.test(script.src)) return
    if (!needleP.empty && !needleP.test(script.textContent || script.src)) return
    throw h.abortError()
  }
  h.trapChain(chain, (owner, prop) => {
    const existing = h.getOwnPropertyDescriptor(owner, prop)
    if (existing && existing.configurable === false) return null
    const getter = existing && existing.get
    const setter = existing && existing.set
    let value = existing && !getter ? existing.value : undefined
    return {
      configurable: true,
      get() {
        validate()
        return getter ? getter.call(this) : value
      },
      set(next) {
        validate()
        if (setter) setter.call(this, next)
        else value = next
      },
    }
  })
}

function abortOnStackTrace(h, chain, needle) {
  if (!chain || !needle) return
  const needleP = h.pattern(needle)
  const check = () => {
    if (needleP.test(h.stackText())) throw h.abortError()
  }
  h.trapChain(chain, (owner, prop) => {
    const existing = h.getOwnPropertyDescriptor(owner, prop)
    if (existing && existing.configurable === false) return null
    const getter = existing && existing.get
    const setter = existing && existing.set
    let value = existing && !getter ? existing.value : undefined
    return {
      configurable: true,
      get() {
        check()
        return getter ? getter.call(this) : value
      },
      set(next) {
        check()
        if (setter) setter.call(this, next)
        else value = next
      },
    }
  })
}

function addEventListenerDefuser(h, type, needle) {
  if (!type && !needle) return
  const typeP = h.pattern(type)
  const needleP = h.pattern(needle)
  h.wrapApply(EventTarget.prototype, 'addEventListener', (target, thisArg, args) => {
    const handler = args[1]
    const source =
      handler && typeof handler === 'object' && typeof handler.handleEvent === 'function'
        ? h.text(handler.handleEvent)
        : h.text(handler)
    if (typeP.test(args[0]) && needleP.test(source)) return undefined
    return h.apply(target, thisArg, args)
  })
}

function timerDefuser(h, timerName, needle, delay) {
  if (!needle && !delay) return
  const needleP = h.pattern(needle)
  let raw = delay == null ? '' : String(delay)
  const negateDelay = raw.startsWith('!')
  if (negateDelay) raw = raw.slice(1)
  const wanted = raw === '' ? null : Number.parseInt(raw, 10)
  h.wrapApply(h.win, timerName, (target, thisArg, args) => {
    const delayOk = wanted === null || ((Number(args[1]) || 0) === wanted) !== negateDelay
    if (delayOk && needleP.test(h.text(args[0]))) args[0] = function () {}
    return h.apply(target, thisArg, args)
  })
}

function noSetTimeoutIf(h, needle, delay) {
  timerDefuser(h, 'setTimeout', needle, delay)
}

function noSetIntervalIf(h, needle, delay) {
  timerDefuser(h, 'setInterval', needle, delay)
}

function noRequestAnimationFrameIf(h, needle) {
  if (!needle) return
  const needleP = h.pattern(needle)
  h.wrapApply(h.win, 'requestAnimationFrame', (target, thisArg, args) => {
    if (needleP.test(h.text(args[0]))) args[0] = function () {}
    return h.apply(target, thisArg, args)
  })
}

function timerBooster(h, timerName, needle, delay, boost) {
  const needleP = h.pattern(needle)
  const wanted = delay === '*' ? null : Number.parseInt(delay, 10) || 1000
  let factor = Number.parseFloat(boost)
  if (!Number.isFinite(factor)) factor = 0.05
  factor = Math.min(50, Math.max(0.001, factor))
  h.wrapApply(h.win, timerName, (target, thisArg, args) => {
    const ms = Number(args[1]) || 0
    if ((wanted === null || ms === wanted) && needleP.test(h.text(args[0]))) args[1] = ms * factor
    return h.apply(target, thisArg, args)
  })
}

function adjustSetTimeout(h, needle, delay, boost) {
  timerBooster(h, 'setTimeout', needle, delay, boost)
}

function adjustSetInterval(h, needle, delay, boost) {
  timerBooster(h, 'setInterval', needle, delay, boost)
}

function noWindowOpenIf(h, needle) {
  const needleP = h.pattern(needle)
  const fake = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'closed') return false
      if (prop === 'then') return undefined
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => ''
      return fake
    },
    set: () => true,
    apply: () => fake,
  })
  h.wrapApply(h.win, 'open', (target, thisArg, args) => {
    if (!needleP.test(args[0] == null ? '' : args[0])) return h.apply(target, thisArg, args)
    return fake
  })
}

function noFetchIf(h, propsToMatch, responseBody, responseType) {
  const matcher = h.propsMatcher(propsToMatch)
  if (matcher.empty) return
  const bodies = { '': '', emptyStr: '', emptyObj: '{}', emptyArr: '[]' }
  h.wrapApply(h.win, 'fetch', (target, thisArg, args) => {
    const [resource, init] = args
    const details = { url: '', method: 'GET' }
    if (resource instanceof Request) {
      for (const key of ['url', 'method', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy']) {
        details[key] = String(resource[key])
      }
    } else details.url = String(resource)
    if (init && typeof init === 'object') {
      for (const key of Object.keys(init)) {
        if (typeof init[key] !== 'object') details[key] = String(init[key])
      }
    }
    if (!matcher.test(details)) return h.apply(target, thisArg, args)
    const body = responseBody === 'true' ? h.randomText(10) : (bodies[responseBody ?? ''] ?? '')
    const response = new Response(body, { status: 200, statusText: 'OK' })
    h.defineProperty(response, 'url', { value: details.url })
    if (responseType === 'opaque' || responseType === 'cors' || responseType === 'basic') {
      h.defineProperty(response, 'type', { value: responseType })
    }
    return Promise.resolve(response)
  })
}

function noXhrIf(h, propsToMatch, directive) {
  const matcher = h.propsMatcher(propsToMatch)
  if (matcher.empty) return
  const proto = XMLHttpRequest.prototype
  const blocked = new WeakMap()
  h.wrapApply(proto, 'open', (target, xhr, args) => {
    const details = { method: String(args[0]), url: String(args[1]) }
    if (matcher.test(details)) blocked.set(xhr, details)
    else blocked.delete(xhr)
    return h.apply(target, xhr, args)
  })
  h.wrapApply(proto, 'send', (target, xhr, args) => {
    const details = blocked.get(xhr)
    if (!details) return h.apply(target, xhr, args)
    const body = directive === 'true' ? h.randomText(10) : ''
    const json = xhr.responseType === 'json'
    const props = {
      readyState: 4,
      status: 200,
      statusText: 'OK',
      responseURL: details.url,
      response: json ? null : body,
      responseText: json ? '' : body,
      responseXML: null,
    }
    for (const key of Object.keys(props)) {
      h.defineProperty(xhr, key, { value: props[key], configurable: true })
    }
    setTimeout(() => {
      for (const type of ['readystatechange', 'load', 'loadend']) xhr.dispatchEvent(new Event(type))
    }, 1)
    return undefined
  })
}

function noEvalIf(h, needle) {
  const needleP = h.pattern(needle)
  h.wrapApply(h.win, 'eval', (target, thisArg, args) => {
    if (needleP.test(h.text(args[0]))) return undefined
    return h.apply(target, thisArg, args)
  })
}

function noEval(h) {
  h.wrapApply(h.win, 'eval', () => undefined)
}

/**
 * Rewrites the text of matching nodes (inline scripts included, before they run) as uBO's
 * replace-node-text does: existing nodes first, then added ones until the DOM is interactive
 * (or `quitAfter` ms later), unless `stay`. Varargs: `includes`/`condition`, `excludes`,
 * `sedCount`, `stay`, `quitAfter`.
 */
function replaceNodeTextFn(h, nodeName = '', needle = '', replacement = '', ...rest) {
  const reNodeName = h.toRegex(nodeName, 'i', true)
  const rePattern = h.toRegex(needle, 'gms')
  const opts = h.extras(rest)
  const includes = opts.includes || opts.condition
  const reIncludes = includes ? h.toRegex(includes, 'ms') : null
  const reExcludes = opts.excludes ? h.toRegex(opts.excludes, 'ms') : null
  let sedCount = /^\d+$/.test(opts.sedCount ?? '') ? Number(opts.sedCount) : Number.MAX_SAFE_INTEGER
  const handleNode = (node) => {
    const before = node.textContent
    if (reIncludes) {
      reIncludes.lastIndex = 0
      if (!reIncludes.test(before)) return
    }
    if (reExcludes) {
      reExcludes.lastIndex = 0
      if (reExcludes.test(before)) return
    }
    rePattern.lastIndex = 0
    if (!rePattern.test(before)) return
    rePattern.lastIndex = 0
    const after = needle !== '' ? before.replace(rePattern, replacement) : replacement
    try {
      node.textContent = node.nodeName === 'SCRIPT' ? h.scriptText(after) : after
    } catch {
      return
    }
    sedCount -= 1
  }
  const handleTree = (root) => {
    const walker = h.doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    const self = h.doc.currentScript
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (node === self) continue
      if (reNodeName.test(node.nodeName)) handleNode(node)
      else if (node.nodeName === 'TEMPLATE') handleTree(node.content)
      else continue
      if (sedCount === 0) break
    }
  }
  if (h.doc.documentElement) handleTree(h.doc.documentElement)
  const stay = Boolean(opts.stay)
  if ((sedCount === 0 && !stay) || typeof MutationObserver !== 'function') return
  let observer = null
  const handleMutations = (records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (reNodeName.test(node.nodeName)) handleNode(node)
        else if (node.nodeName === 'TEMPLATE') handleTree(node.content)
        else continue
        if (sedCount === 0) {
          observer.disconnect()
          return
        }
      }
    }
  }
  const stop = () => {
    const pending = observer.takeRecords()
    observer.disconnect()
    handleMutations(pending)
  }
  observer = new MutationObserver(handleMutations)
  observer.observe(h.doc, { childList: true, subtree: true })
  if (stay) return
  const quit = () => {
    const ms = Number.parseInt(opts.quitAfter ?? '', 10)
    if (ms > 0) setTimeout(stop, ms)
    else stop()
  }
  if (h.doc.readyState !== 'loading') quit()
  else {
    const onState = () => {
      if (h.doc.readyState === 'loading') return
      h.doc.removeEventListener('readystatechange', onState)
      quit()
    }
    h.doc.addEventListener('readystatechange', onState)
  }
}

function removeNodeText(h, nodeName, includes, ...rest) {
  if (!nodeName || !includes) return
  replaceNodeTextFn(h, nodeName, '', '', 'includes', includes, ...rest)
}

function replaceNodeText(h, nodeName, needle, replacement, ...rest) {
  if (!nodeName) return
  replaceNodeTextFn(h, nodeName, needle, replacement ?? '', ...rest)
}

function removeAttr(h, rawAttrs, selector, behavior) {
  const attrs = String(rawAttrs ?? '').split(/\s*\|\s*/).filter(Boolean)
  if (!attrs.length) return
  const target = selector || attrs.map((a) => `[${CSS.escape(a)}]`).join(',')
  h.domRunner(() => {
    for (const el of h.doc.querySelectorAll(target)) {
      for (const attr of attrs) if (el.hasAttribute(attr)) el.removeAttribute(attr)
    }
  }, behavior)
}

function removeClass(h, rawClasses, selector, behavior) {
  const classes = String(rawClasses ?? '').split(/\s*\|\s*/).filter(Boolean)
  if (!classes.length) return
  const target = selector || classes.map((c) => `.${CSS.escape(c)}`).join(',')
  h.domRunner(() => {
    for (const el of h.doc.querySelectorAll(target)) el.classList.remove(...classes)
  }, behavior)
}

function setAttr(h, selector, attr, rawValue = '') {
  if (!selector || !attr || /^on/i.test(attr)) return
  const value = String(rawValue)
  const copyFrom = /^\[([\w-]+)\]$/.exec(value)
  const safe = value === '' || value === 'true' || value === 'false' || (/^\d+$/.test(value) && Number(value) <= 0x7fff)
  if (!h.trusted && !safe && !copyFrom) return
  h.domRunner(() => {
    for (const el of h.doc.querySelectorAll(selector)) {
      const next = copyFrom ? el.getAttribute(copyFrom[1]) : value
      if (next != null && el.getAttribute(attr) !== next) el.setAttribute(attr, next)
    }
  }, 'stay')
}

function setCookie(h, name, rawValue, ...rest) {
  if (!name || /[;=\s]/.test(name)) return
  const reload = h.reload === true
  let value = String(rawValue ?? '')
  let offset = ''
  let path = '/'
  if (h.trusted) {
    ;[offset = '', path = '/'] = rest
    value = h.tokenValue(value)
    if (/[;\r\n]/.test(value)) return
  } else {
    path = rest[0] || '/'
    const safe =
      /^(?:accept(?:ed)?|notaccepted|reject(?:ed)?|allow(?:ed)?|disallow|deny|denied|approved|disapproved|checked|unchecked|dismiss(?:ed)?|enable(?:d)?|disable(?:d)?|essential|nonessential|forbidden|forever|hide|hidden|necessary|required|ok|on|off|true|t|false|f|yes|y|no|n|all|none|functional|granted|done|decline(?:d)?|closed|next|mandatory|show|shown|-1|\d{0,15})$/i
    if (!safe.test(value)) return
    value = encodeURIComponent(value)
  }
  const read = () => {
    for (const part of h.doc.cookie.split(';')) {
      const eq = part.indexOf('=')
      if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
    }
    return null
  }
  const before = read()
  if (before === value) return
  let cookie = `${name}=${value}`
  if (path && path !== 'none') cookie += `; path=${path === '/' ? '/' : path}`
  if (offset) {
    const units = { '1day': 86_400, '1year': 31_536_000 }
    const seconds = units[offset] ?? Number.parseInt(offset, 10)
    if (Number.isFinite(seconds)) cookie += `; expires=${new Date(Date.now() + seconds * 1000).toUTCString()}`
  }
  try {
    h.doc.cookie = cookie
  } catch {
    return
  }
  if (reload && read() === value) h.win.location.reload()
}

function setCookieReload(h, ...args) {
  h.reload = true
  setCookie(h, ...args)
}

function removeCookie(h, needle) {
  const needleP = h.pattern(needle)
  const remove = () => {
    let cookies
    try {
      cookies = h.doc.cookie.split(';')
    } catch {
      return
    }
    for (const part of cookies) {
      const name = part.split('=')[0].trim()
      if (!name || !needleP.test(name)) continue
      for (const domain of h.cookieDomains()) {
        for (const path of ['', '; path=/']) {
          const scope = domain ? `; domain=${domain}` : ''
          h.doc.cookie = `${name}=; max-age=-1000${scope}${path}`
        }
      }
    }
  }
  remove()
  h.win.addEventListener('beforeunload', remove)
  h.doc.addEventListener('visibilitychange', remove)
}

function setStorageItem(h, storageName, key, rawValue) {
  if (!key) return
  let storage
  try {
    storage = h.win[storageName]
  } catch {
    return
  }
  if (!storage) return
  const raw = String(rawValue ?? '')
  if (raw === '$remove$') {
    const keyP = h.pattern(key)
    const exact = !/^\/.+\/[a-z]*$/.test(key)
    try {
      if (exact) storage.removeItem(key)
      else for (const name of Object.keys(storage)) if (keyP.test(name)) storage.removeItem(name)
    } catch {
      /* storage disabled */
    }
    return
  }
  let value
  if (h.trusted) value = h.tokenValue(raw)
  else {
    const named = { emptyArr: '[]', emptyObj: '{}', '': '', "''": '' }
    if (raw in named) value = named[raw]
    else if (
      /^(?:undefined|false|true|null|yes|no|on|off|ok|accept(?:ed)?|reject(?:ed)?|allow(?:ed)?|deny|denied|-1)$/i.test(raw) ||
      (/^\d+$/.test(raw) && Number(raw) <= 0x7fff)
    ) {
      value = raw
    } else return
  }
  try {
    if (storage.getItem(key) !== value) storage.setItem(key, value)
  } catch {
    /* quota or disabled */
  }
}

function setLocalStorageItem(h, key, value) {
  setStorageItem(h, 'localStorage', key, value)
}

function setSessionStorageItem(h, key, value) {
  setStorageItem(h, 'sessionStorage', key, value)
}

function jsonPrune(h, rawPrune, rawNeedles, stackNeedle) {
  if (!rawPrune) return
  const prune = h.jsonPruner(rawPrune, rawNeedles)
  const stackP = stackNeedle ? h.pattern(stackNeedle) : null
  h.wrapApply(JSON, 'parse', (target, thisArg, args) => {
    const data = h.apply(target, thisArg, args)
    if (stackP && !stackP.test(h.stackText())) return data
    prune(data)
    return data
  })
}

/**
 * Proxies `fetch` so matching responses (`propsToMatch`, implicit key `url`) can be rewritten.
 * `edit(responseBefore)` resolves to a replacement Response, or to undefined to keep the original.
 */
function wrapFetchResponse(h, propsToMatch, edit) {
  const matcher = h.propsMatcher(propsToMatch)
  h.wrapApply(h.win, 'fetch', (target, thisArg, args) => {
    const pending = h.apply(target, thisArg, args)
    if (!matcher.empty && !matcher.test(h.fetchDetails(args[0], args[1]))) return pending
    return pending
      .then((before) =>
        edit(before).then(
          (after) => after || before,
          () => before,
        ),
      )
      .catch(() => pending)
  })
}

function jsonFetchEdit(h, propsToMatch, editObject) {
  wrapFetchResponse(h, propsToMatch, (before) =>
    before
      .clone()
      .json()
      .then((data) => {
        if (typeof data !== 'object' || data === null) return undefined
        const after = editObject(data)
        if (after === undefined) return undefined
        const init = { status: before.status, statusText: before.statusText, headers: before.headers }
        return h.withResponseMeta(h.native.Response_json(after, init), before)
      }),
  )
}

function jsonPruneFetchResponse(h, rawPrune, rawNeedles, ...rest) {
  if (!rawPrune) return
  const prune = h.jsonPruner(rawPrune, rawNeedles)
  jsonFetchEdit(h, h.extras(rest).propsToMatch, (data) => (prune(data) ? data : undefined))
}

/**
 * Swaps in an `XMLHttpRequest` subclass whose `response`/`responseText` pass matching requests'
 * bodies through `transform(text|object)`; results are cached per response length.
 */
function wrapXhrResponse(h, propsToMatch, transform) {
  const matcher = h.propsMatcher(propsToMatch)
  const tracked = new WeakMap()
  const Base = h.win.XMLHttpRequest
  if (typeof Base !== 'function') return
  h.win.XMLHttpRequest = class extends Base {
    open(method, url, ...args) {
      const details = { method, url }
      if (matcher.empty || matcher.test(details)) tracked.set(this, details)
      else tracked.delete(this)
      return super.open(method, url, ...args)
    }
    get response() {
      const inner = super.response
      const details = tracked.get(this)
      if (details === undefined) return inner
      const length = typeof inner === 'string' ? inner.length : undefined
      if (details.lastLength !== length) {
        details.response = undefined
        details.lastLength = length
      }
      if (details.response !== undefined) return details.response
      let outer = inner
      try {
        outer = transform(inner)
      } catch {
        /* leave the body alone */
      }
      details.response = outer
      return outer
    }
    get responseText() {
      const response = this.response
      return typeof response === 'string' ? response : super.responseText
    }
  }
}

function jsonPruneXhrResponse(h, rawPrune, rawNeedles, ...rest) {
  if (!rawPrune) return
  const prune = h.jsonPruner(rawPrune, rawNeedles)
  wrapXhrResponse(h, h.extras(rest).propsToMatch, (inner) => {
    let data = inner
    if (typeof inner === 'string') {
      try {
        data = h.native.JSON_parse(inner)
      } catch {
        return inner
      }
    }
    if (typeof data !== 'object' || data === null || !prune(data)) return inner
    return typeof inner === 'string' ? h.native.JSON_stringify(data) : data
  })
}

function replaceResponseRegex(h, pattern, rest) {
  const opts = h.extras(rest)
  return {
    re: h.toRegex(pattern === '*' ? '.*' : pattern),
    includes: opts.includes ? h.toRegex(opts.includes) : null,
  }
}

function trustedReplaceFetchResponse(h, pattern = '', replacement = '', propsToMatch = '', ...rest) {
  if (pattern === '') return
  const { re, includes } = replaceResponseRegex(h, pattern, rest)
  wrapFetchResponse(h, propsToMatch, (before) =>
    before
      .clone()
      .text()
      .then((textBefore) => {
        if (includes && !includes.test(textBefore)) return undefined
        const textAfter = textBefore.replace(re, replacement)
        if (textAfter === textBefore) return undefined
        const init = { status: before.status, statusText: before.statusText, headers: before.headers }
        return h.withResponseMeta(new Response(textAfter, init), before)
      }),
  )
}

function trustedReplaceXhrResponse(h, pattern = '', replacement = '', propsToMatch = '', ...rest) {
  const { re, includes } = replaceResponseRegex(h, pattern, rest)
  wrapXhrResponse(h, propsToMatch, (inner) => {
    if (typeof inner !== 'string') return inner
    if (includes && !includes.test(inner)) return inner
    return inner.replace(re, replacement)
  })
}

/** A uBO JSONPath query; assignments are only honoured from trusted (uBO-owned) lists. */
function jsonPathFor(h, jsonq) {
  const jsonp = createJsonPath(jsonq)
  if (!jsonp.valid || (jsonp.value !== undefined && !h.trusted)) return null
  return jsonp
}

function editInboundObject(h, propChain = '', argPosRaw = '', jsonq = '') {
  if (!propChain) return
  const jsonp = jsonPathFor(h, jsonq)
  if (!jsonp) return
  const argPos = Number.parseInt(argPosRaw, 10)
  if (Number.isNaN(argPos)) return
  const target = h.resolveChain(propChain)
  if (!target) return
  h.wrapApply(target.owner, target.prop, (fn, thisArg, args) => {
    const i = argPos >= 0 ? argPos : args.length + argPos
    if (i >= 0 && i < args.length) {
      let clone
      try {
        clone = h.native.JSON_parse(h.native.JSON_stringify(args[i]))
      } catch {
        /* not serialisable */
      }
      if (typeof clone === 'object' && clone !== null) {
        const after = jsonp.apply(clone)
        if (after) args[i] = after
      }
    }
    return h.apply(fn, thisArg, args)
  })
}

function editOutboundObject(h, propChain = '', jsonq = '') {
  if (!propChain) return
  const jsonp = jsonPathFor(h, jsonq)
  const target = jsonp && h.resolveChain(propChain)
  if (!target) return
  h.wrapApply(target.owner, target.prop, (fn, thisArg, args) => {
    const obj = h.apply(fn, thisArg, args)
    const after = jsonp.apply(obj)
    return after === undefined ? obj : after
  })
}

function jsonEdit(h, jsonq = '', ...rest) {
  const jsonp = jsonPathFor(h, jsonq)
  if (!jsonp) return
  const matches = h.extras(rest).matches
  const needle = matches ? h.pattern(matches) : null
  h.wrapApply(JSON, 'parse', (fn, thisArg, args) => {
    const obj = h.apply(fn, thisArg, args)
    if (needle && !needle.test(args[0])) return obj
    const after = jsonp.apply(obj)
    return after === undefined ? obj : after
  })
}

function jsonEditFetchResponse(h, jsonq = '', ...rest) {
  const jsonp = jsonPathFor(h, jsonq)
  if (!jsonp) return
  jsonFetchEdit(h, h.extras(rest).propsToMatch, (data) => jsonp.apply(data))
}

/**
 * Stops pages from fetching pristine natives (`fetch`, `JSON.parse`, ...) out of a fresh
 * same-origin iframe: after `methodPath` inserts one, its `targetProp` is ours again.
 */
function trustedPreventDomBypass(h, methodPath = '', targetProp = '') {
  if (!methodPath) return
  const target = h.resolveChain(methodPath)
  if (!target) return
  h.wrapApply(target.owner, target.prop, (fn, thisArg, args) => {
    const elems = args.filter((e) => e instanceof HTMLElement)
    const result = h.apply(fn, thisArg, args)
    for (const elem of elems) {
      try {
        const it = elem.contentWindow
        if (`${it}` !== '[object Window]') continue
        const href = it.location.href
        if (href !== 'about:blank' && href !== h.win.location.href) continue
        if (targetProp === '') {
          h.defineProperty(elem, 'contentWindow', { value: h.win })
          continue
        }
        const mine = h.resolveChain(targetProp)
        const theirs = h.resolveChain(targetProp, it)
        if (mine && theirs) theirs.owner[theirs.prop] = mine.owner[mine.prop]
      } catch {
        /* cross-origin frame */
      }
    }
    return result
  })
}

function hrefSanitizer(h, selector, source = '') {
  if (!selector) return
  const extract = (a) => {
    if (source === '' || source === 'text') return (a.textContent || '').trim()
    if (source.startsWith('?')) {
      try {
        return new URL(a.href).searchParams.get(source.slice(1)) || ''
      } catch {
        return ''
      }
    }
    const attr = /^\[([\w-]+)\]$/.exec(source)
    return attr ? a.getAttribute(attr[1]) || '' : ''
  }
  h.domRunner(() => {
    for (const a of h.doc.querySelectorAll(selector)) {
      if (a.localName !== 'a') continue
      const candidate = extract(a)
      let url
      try {
        url = new URL(candidate)
      } catch {
        continue
      }
      if ((url.protocol === 'https:' || url.protocol === 'http:') && a.href !== url.href) a.setAttribute('href', url.href)
    }
  }, 'stay')
}

function noWebrtc(h) {
  const Stub = function () {}
  Stub.prototype = {
    close() {},
    createDataChannel() {
      return {}
    },
    createOffer: () => Promise.resolve(),
    createAnswer: () => Promise.resolve(),
    setLocalDescription: () => Promise.resolve(),
    setRemoteDescription: () => Promise.resolve(),
    addIceCandidate: () => Promise.resolve(),
    addEventListener() {},
    removeEventListener() {},
  }
  for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection']) {
    if (typeof h.win[name] === 'function') h.win[name] = Stub
  }
}

function refreshDefuser(h, delay) {
  const defuse = () => {
    const meta = h.doc.querySelector('meta[http-equiv="refresh" i][content]')
    if (!meta) return
    const match = /^\s*(\d+)/.exec(meta.getAttribute('content') || '')
    const seconds = Number.parseInt(delay, 10) || (match ? Number(match[1]) : 0)
    setTimeout(() => h.win.stop(), Math.max(seconds - 1, 0) * 1000)
  }
  if (h.doc.readyState === 'loading') h.doc.addEventListener('DOMContentLoaded', defuse, { once: true })
  else defuse()
}

function disableNewtabLinks(h) {
  h.doc.addEventListener(
    'click',
    (ev) => {
      let el = ev.target
      while (el && el.localName !== 'a') el = el.parentElement
      if (el && el.hasAttribute('target')) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    },
    true,
  )
}

function clickElement(h, rawSelectors, extraMatch, delay) {
  const selectors = String(rawSelectors ?? '').split(/\s*,\s*/).filter(Boolean)
  if (!selectors.length) return
  for (const raw of String(extraMatch ?? '').split(/\s*,\s*/).filter(Boolean)) {
    const negate = raw.startsWith('!')
    const [kind, key = ''] = (negate ? raw.slice(1) : raw).split(':')
    let present = false
    try {
      if (kind === 'cookie') present = h.doc.cookie.split(';').some((c) => c.split('=')[0].trim() === key)
      else if (kind === 'localStorage') present = h.win.localStorage.getItem(key) !== null
      else continue
    } catch {
      present = false
    }
    if (present === negate) return
  }
  const pause = Math.min(Math.max(Number.parseInt(delay, 10) || 1, 1), 10_000)
  const deadline = Date.now() + 10_000
  const query = (selector) => {
    let root = h.doc
    const parts = selector.split(/\s*>>>\s*/)
    for (let i = 0; i < parts.length; i++) {
      const el = root.querySelector(parts[i])
      if (!el || i === parts.length - 1) return el
      root = el.shadowRoot
      if (!root) return null
    }
    return null
  }
  let index = 0
  let waiting = false
  let observer = null
  const done = () => observer && observer.disconnect()
  const step = () => {
    if (waiting) return
    if (index >= selectors.length || Date.now() > deadline) {
      done()
      return
    }
    const el = query(selectors[index])
    if (!el) return
    waiting = true
    setTimeout(() => {
      waiting = false
      index++
      try {
        el.click()
      } catch {
        /* detached */
      }
      step()
    }, pause)
  }
  const start = () => {
    observer = new MutationObserver(step)
    observer.observe(h.doc, { childList: true, subtree: true, attributes: true })
    setTimeout(done, 10_000)
    step()
  }
  if (h.doc.readyState === 'loading') h.doc.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}

function fuckAdBlockDefuser(h) {
  const Fab = function () {}
  Fab.prototype = {
    check: () => false,
    clearEvent() {},
    emitEvent() {},
    on(detected, fn) {
      if (!detected && typeof fn === 'function') setTimeout(fn, 1)
      return this
    },
    onDetected() {
      return this
    },
    onNotDetected(fn) {
      if (typeof fn === 'function') setTimeout(fn, 1)
      return this
    },
    setOption() {
      return this
    },
    options: { set() {}, get() {} },
  }
  const instance = new Fab()
  const define = (name, value) => {
    try {
      h.defineProperty(h.win, name, { configurable: true, get: () => value, set: () => {} })
    } catch {
      /* already locked */
    }
  }
  define('FuckAdBlock', Fab)
  define('BlockAdBlock', Fab)
  define('fuckAdBlock', instance)
  define('blockAdBlock', instance)
  define('sniffAdBlock', instance)
}

function popadsDummy(h) {
  for (const name of ['PopAds', 'popns']) {
    try {
      h.defineProperty(h.win, name, { configurable: true, get: () => ({}), set: () => {} })
    } catch {
      /* already locked */
    }
  }
}

/**
 * Canonical name → implementation. `trusted` scriptlets can write arbitrary values and are only
 * accepted from uBO's own lists, as in uBlock Origin.
 */
export const SCRIPTLETS = {
  'set-constant': { fn: setConstant, aliases: ['set'] },
  'trusted-set-constant': { fn: setConstant, trusted: true, aliases: ['trusted-set'] },
  'abort-on-property-read': { fn: abortOnPropertyRead, aliases: ['aopr'] },
  'abort-on-property-write': { fn: abortOnPropertyWrite, aliases: ['aopw'] },
  'abort-current-script': {
    fn: abortCurrentScript,
    aliases: ['acs', 'abort-current-inline-script', 'acis'],
  },
  'abort-on-stack-trace': { fn: abortOnStackTrace, aliases: ['aost'] },
  'addEventListener-defuser': {
    fn: addEventListenerDefuser,
    aliases: ['aeld', 'prevent-addEventListener'],
  },
  'no-setTimeout-if': {
    fn: noSetTimeoutIf,
    aliases: ['nostif', 'prevent-setTimeout', 'setTimeout-defuser'],
  },
  'no-setInterval-if': {
    fn: noSetIntervalIf,
    aliases: ['nosiif', 'prevent-setInterval', 'setInterval-defuser'],
  },
  'no-requestAnimationFrame-if': {
    fn: noRequestAnimationFrameIf,
    aliases: ['norafif', 'prevent-requestAnimationFrame'],
  },
  'adjust-setTimeout': {
    fn: adjustSetTimeout,
    aliases: ['nano-stb', 'nano-setTimeout-booster'],
  },
  'adjust-setInterval': {
    fn: adjustSetInterval,
    aliases: ['nano-sib', 'nano-setInterval-booster'],
  },
  'no-window-open-if': {
    fn: noWindowOpenIf,
    aliases: ['nowoif', 'prevent-window-open', 'window.open-defuser'],
  },
  'no-fetch-if': { fn: noFetchIf, aliases: ['prevent-fetch'] },
  'no-xhr-if': { fn: noXhrIf, aliases: ['prevent-xhr'] },
  'noeval-if': { fn: noEvalIf, aliases: ['prevent-eval-if'] },
  noeval: { fn: noEval, aliases: ['silent-noeval'] },
  'remove-node-text': { fn: removeNodeText, aliases: ['rmnt'] },
  'trusted-replace-node-text': {
    fn: replaceNodeText,
    trusted: true,
    aliases: ['trusted-rpnt', 'replace-node-text', 'rpnt'],
  },
  'remove-attr': { fn: removeAttr, aliases: ['ra'] },
  'remove-class': { fn: removeClass, aliases: ['rc'] },
  'set-attr': { fn: setAttr },
  'trusted-set-attr': { fn: setAttr, trusted: true },
  'set-cookie': { fn: setCookie },
  'trusted-set-cookie': { fn: setCookie, trusted: true },
  'set-cookie-reload': { fn: setCookieReload },
  'trusted-set-cookie-reload': { fn: setCookieReload, trusted: true },
  'remove-cookie': { fn: removeCookie, aliases: ['cookie-remover'] },
  'set-local-storage-item': { fn: setLocalStorageItem },
  'trusted-set-local-storage-item': { fn: setLocalStorageItem, trusted: true },
  'set-session-storage-item': { fn: setSessionStorageItem },
  'trusted-set-session-storage-item': {
    fn: setSessionStorageItem,
    trusted: true,
  },
  'json-prune': { fn: jsonPrune },
  'json-prune-fetch-response': { fn: jsonPruneFetchResponse },
  'json-prune-xhr-response': { fn: jsonPruneXhrResponse },
  'trusted-replace-fetch-response': {
    fn: trustedReplaceFetchResponse,
    trusted: true,
    aliases: ['trusted-rpfr'],
  },
  'trusted-replace-xhr-response': { fn: trustedReplaceXhrResponse, trusted: true },
  'edit-inbound-object': { fn: editInboundObject },
  'trusted-edit-inbound-object': { fn: editInboundObject, trusted: true },
  'edit-outbound-object': { fn: editOutboundObject },
  'trusted-edit-outbound-object': { fn: editOutboundObject, trusted: true },
  'json-edit': { fn: jsonEdit },
  'trusted-json-edit': { fn: jsonEdit, trusted: true },
  'json-edit-fetch-response': { fn: jsonEditFetchResponse },
  'trusted-json-edit-fetch-response': { fn: jsonEditFetchResponse, trusted: true },
  'trusted-prevent-dom-bypass': { fn: trustedPreventDomBypass, trusted: true },
  'href-sanitizer': { fn: hrefSanitizer },
  nowebrtc: { fn: noWebrtc },
  'refresh-defuser': { fn: refreshDefuser },
  'disable-newtab-links': { fn: disableNewtabLinks },
  'trusted-click-element': { fn: clickElement, trusted: true },
  'fuckadblock.js-3.2.0': { fn: fuckAdBlockDefuser, aliases: ['nofab', 'fuckadblock-defuser'] },
  'popads-dummy': { fn: popadsDummy, aliases: ['popads-dummy.js'] },
}

const ALIASES = new Map()
for (const [name, entry] of Object.entries(SCRIPTLETS)) {
  ALIASES.set(name, name)
  for (const alias of entry.aliases ?? []) ALIASES.set(alias, name)
}

/** Canonical scriptlet name, or null when this build has no implementation for it. */
export function canonicalScriptletName(raw) {
  const name = String(raw ?? '').trim()
  return ALIASES.get(name) ?? ALIASES.get(name.replace(/\.js$/, '')) ?? null
}
