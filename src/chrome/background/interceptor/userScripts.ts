import { getInterceptorState, isRuleActive, needsUserScripts } from '@/core/interceptor'
import type { InsertScriptRule, LibraryItem } from '@/core/interceptor'
import { createLogger } from '@/core/logging'

const logger = createLogger('interceptor-userscripts')

function resolveScriptContent(rule: InsertScriptRule, library: LibraryItem[]): string | null {
  if (rule.scriptSource === 'inline') return rule.code ?? null
  if (rule.scriptSource === 'library' && rule.libraryId) {
    return library.find((i) => i.id === rule.libraryId)?.content ?? null
  }
  return null
}

export async function syncInterceptorUserScripts(): Promise<void> {
  const state = await getInterceptorState()
  const has = needsUserScripts(state.rules, state.settings.paused, state.groups)
  if (!has) {
    try {
      const registered = await chrome.userScripts?.getScripts() ?? []
      const ids = registered.map((s) => s.id).filter((id) => id.startsWith('interceptor-'))
      if (ids.length) await chrome.userScripts?.unregister({ ids })
    } catch {
      /* userScripts unavailable */
    }
    return
  }

  if (!chrome.userScripts) {
    logger.warn('userScripts API unavailable')
    return
  }

  const scripts: chrome.userScripts.RegisteredUserScript[] = []
  for (const rule of state.rules) {
    if (rule.type !== 'insertScript' || !isRuleActive(rule, state.groups)) continue
    const content = resolveScriptContent(rule, state.library)
    if (!content) continue
    const isCss = rule.kind === 'css'
    scripts.push({
      id: `interceptor-${rule.id}`,
      matches: ['<all_urls>'],
      runAt: rule.timing === 'document_idle' ? 'document_idle' : 'document_start',
      world: 'MAIN',
      js: isCss
        ? [{ code: `(()=>{const l=document.createElement('style');l.textContent=${JSON.stringify(content)};document.documentElement.appendChild(l);})();` }]
        : [{ code: content }],
    })
  }

  try {
    const existing = await chrome.userScripts.getScripts()
    const removeIds = existing.map((s) => s.id).filter((id) => id.startsWith('interceptor-'))
    if (removeIds.length) await chrome.userScripts.unregister({ ids: removeIds })
    if (scripts.length) await chrome.userScripts.register(scripts)
  } catch (error) {
    logger.warn('userScripts register failed', error)
  }
}
