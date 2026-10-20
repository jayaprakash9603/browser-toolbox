import {
  hasYoutubeAdPayload,
  isYoutubePlayerEndpoint,
  pruneYoutubeAdsInPlace,
  pruneYoutubeResponseText,
} from '../scriptlets/jsonPrune'

import { tryAutoSkipAd } from './skipAd'

type GuardedWindow = Window & { __toolboxAdblockYtMain?: boolean }

const SKIP_POLL_MS = 200

const MESSAGE_SOURCE = 'toolbox-adblock'

function reportPruned(count: number): void {
  if (count > 0) window.postMessage({ source: MESSAGE_SOURCE, type: 'yt-pruned', count }, '*')
}

function patchJsonParse(): void {
  JSON.parse = new Proxy(JSON.parse, {
    apply(target, thisArg, args: Parameters<typeof JSON.parse>) {
      const result: unknown = Reflect.apply(target, thisArg, args)
      if (hasYoutubeAdPayload(result)) reportPruned(pruneYoutubeAdsInPlace(result))
      return result
    },
  })
}

function patchResponse(): void {
  const proto = Response.prototype
  proto.json = new Proxy(proto.json, {
    apply(target, thisArg: Response, args: []) {
      const promise = Reflect.apply(target, thisArg, args) as Promise<unknown>
      return promise.then((data) => {
        if (hasYoutubeAdPayload(data)) reportPruned(pruneYoutubeAdsInPlace(data))
        return data
      })
    },
  })
  proto.text = new Proxy(proto.text, {
    apply(target, thisArg: Response, args: []) {
      const promise = Reflect.apply(target, thisArg, args) as Promise<string>
      if (!isYoutubePlayerEndpoint(thisArg.url)) return promise
      return promise.then((text) => {
        const pruned = pruneYoutubeResponseText(text)
        reportPruned(pruned.removed)
        return pruned.text
      })
    },
  })
}

function patchXhr(): void {
  const proto = XMLHttpRequest.prototype
  const textDesc = Object.getOwnPropertyDescriptor(proto, 'responseText')
  const responseDesc = Object.getOwnPropertyDescriptor(proto, 'response')
  if (!textDesc?.get || !responseDesc?.get) return
  const getText = textDesc.get
  const getResponse = responseDesc.get
  const cache = new WeakMap<XMLHttpRequest, string>()

  const prunedText = (xhr: XMLHttpRequest): string | null => {
    if (xhr.readyState !== 4 || !isYoutubePlayerEndpoint(xhr.responseURL)) return null
    const cached = cache.get(xhr)
    if (cached != null) return cached
    const pruned = pruneYoutubeResponseText(getText.call(xhr) as string)
    reportPruned(pruned.removed)
    cache.set(xhr, pruned.text)
    return pruned.text
  }

  Object.defineProperty(proto, 'responseText', {
    ...textDesc,
    get(this: XMLHttpRequest) {
      if (this.responseType !== '' && this.responseType !== 'text') return getText.call(this)
      return prunedText(this) ?? getText.call(this)
    },
  })
  Object.defineProperty(proto, 'response', {
    ...responseDesc,
    get(this: XMLHttpRequest) {
      const raw: unknown = getResponse.call(this)
      if (this.responseType === 'json') {
        if (hasYoutubeAdPayload(raw)) reportPruned(pruneYoutubeAdsInPlace(raw))
        return raw
      }
      if (this.responseType !== '' && this.responseType !== 'text') return raw
      return prunedText(this) ?? raw
    },
  })
}

function trapGlobal(name: 'ytInitialPlayerResponse' | 'ytInitialData'): void {
  const win = window as unknown as Record<string, unknown>
  let current = win[name]
  if (current) reportPruned(pruneYoutubeAdsInPlace(current))
  try {
    Object.defineProperty(win, name, {
      configurable: true,
      get: () => current,
      set(value: unknown) {
        reportPruned(pruneYoutubeAdsInPlace(value))
        current = value
      },
    })
  } catch {
    /* property already locked by the page */
  }
}

function pruneInlineGlobals(): void {
  const win = window as unknown as Record<string, unknown>
  for (const key of ['ytInitialPlayerResponse', 'ytInitialData'] as const) {
    if (win[key]) reportPruned(pruneYoutubeAdsInPlace(win[key]))
  }
}

let skipObserver: MutationObserver | null = null
let skipDebounce: ReturnType<typeof setTimeout> | null = null

function scheduleSkipTry(): void {
  if (skipDebounce) return
  skipDebounce = setTimeout(() => {
    skipDebounce = null
    tryAutoSkipAd()
  }, 40)
}

function attachSkipObserver(): void {
  const player = document.querySelector('#movie_player')
  if (!player || skipObserver) return
  skipObserver = new MutationObserver(() => scheduleSkipTry())
  skipObserver.observe(player, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-disabled', 'style'],
  })
}

function startAutoSkip(): void {
  window.setInterval(() => {
    const player = document.querySelector('#movie_player')
    if (!player) return
    const adLikely =
      player.classList.contains('ad-showing') ||
      player.classList.contains('ad-interrupting') ||
      Boolean(player.querySelector('.ytp-ad-player-overlay, .ytp-ad-module'))
    if (adLikely) tryAutoSkipAd()
  }, SKIP_POLL_MS)
  window.setInterval(attachSkipObserver, 2000)
  document.addEventListener('yt-navigate-finish', () => {
    skipObserver?.disconnect()
    skipObserver = null
    attachSkipObserver()
    tryAutoSkipAd()
  })
  attachSkipObserver()
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxAdblockYtMain && window === window.top) {
  guarded.__toolboxAdblockYtMain = true
  patchJsonParse()
  patchResponse()
  patchXhr()
  trapGlobal('ytInitialPlayerResponse')
  trapGlobal('ytInitialData')
  pruneInlineGlobals()
  startAutoSkip()
}
