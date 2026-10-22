import { makeHelpers } from '../../../../../scripts/adblock/scriptlets/helpers.mjs'
import { SCRIPTLETS } from '../../../../../scripts/adblock/scriptlets/library.mjs'

import { SCRIPTLET_ATTR, SCRIPTLET_EVENT, type ScriptletCall } from './protocol'

let started = false

export function runScriptlets(payload: string): void {
  if (started) return
  started = true
  let calls: ScriptletCall[]
  try {
    calls = JSON.parse(payload) as ScriptletCall[]
  } catch {
    return
  }
  for (const [name, args] of calls) {
    const spec = SCRIPTLETS[name]
    if (!spec) continue
    try {
      spec.fn(makeHelpers(Boolean(spec.trusted)), ...args)
    } catch {
      /* one broken scriptlet must not stop the others */
    }
  }
}

function init(): void {
  const root = document.documentElement
  const pending = root?.getAttribute(SCRIPTLET_ATTR)
  if (pending != null) {
    root.removeAttribute(SCRIPTLET_ATTR)
    runScriptlets(pending)
    return
  }
  const onEvent = (event: Event): void => {
    document.removeEventListener(SCRIPTLET_EVENT, onEvent)
    document.documentElement?.removeAttribute(SCRIPTLET_ATTR)
    const detail = (event as CustomEvent<unknown>).detail
    if (typeof detail === 'string') runScriptlets(detail)
  }
  document.addEventListener(SCRIPTLET_EVENT, onEvent)
  // Hosts without scriptlets never get the event; stop listening once the page is parsed.
  document.addEventListener('DOMContentLoaded', () => document.removeEventListener(SCRIPTLET_EVENT, onEvent), {
    once: true,
  })
}

init()
