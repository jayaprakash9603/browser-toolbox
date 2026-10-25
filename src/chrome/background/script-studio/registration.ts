import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'
import {
  getScriptCode,
  getScriptExternals,
  getScriptStudioIndex,
  getScriptStudioSettings,
  getScriptValues,
  listActiveScripts,
  userScriptFingerprint,
  type BuiltScriptBundle,
} from '@/core/script-studio'
import {
  buildRegistrationBundle as buildBundle,
  buildRelaySource,
  SS_RELAY_ID,
} from '@/core/script-studio/registration'

import { upgradeGalleryScripts } from './gallery'

const logger = createLogger('script-studio-register')

const OWNED_PREFIX = 'ss-'
const RELAY_NONCE_KEY = 'scriptStudioRelayNonce'
let runtimeJsCache: string | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let nonceCache: string | null = null
let galleryChecked = false

async function getReportNonce(): Promise<string> {
  if (nonceCache) return nonceCache
  const stored = (await chrome.storage.local.get(RELAY_NONCE_KEY))[RELAY_NONCE_KEY]
  if (typeof stored === 'string' && stored) {
    nonceCache = stored
  } else {
    nonceCache = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    await chrome.storage.local.set({ [RELAY_NONCE_KEY]: nonceCache })
  }
  return nonceCache
}

function relayBundle(bundles: BuiltScriptBundle[], nonce: string): BuiltScriptBundle | null {
  const main = bundles.filter((b) => b.world === 'MAIN')
  if (!main.length) return null
  const code = buildRelaySource(nonce)
  return {
    scriptId: '',
    userScriptId: SS_RELAY_ID,
    matches: [...new Set(main.flatMap((b) => b.matches))].sort(),
    excludeMatches: [],
    includeGlobs: [],
    excludeGlobs: [],
    runAt: 'document_start',
    world: 'USER_SCRIPT',
    allFrames: main.some((b) => b.allFrames),
    code,
    contextMenuOnly: false,
  }
}

async function loadRuntimeJs(): Promise<string> {
  if (runtimeJsCache) return runtimeJsCache
  const url = chrome.runtime.getURL('script-studio/gm-runtime.js')
  runtimeJsCache = await (await fetch(url)).text()
  return runtimeJsCache
}

async function collectBundles(): Promise<BuiltScriptBundle[]> {
  const index = await getScriptStudioIndex()
  const settings = await getScriptStudioSettings()
  if (!index.globalEnabled) return []

  const runtimeJs = await loadRuntimeJs()
  const handlerVersion = chrome.runtime.getManifest().version
  const nonce = await getReportNonce()
  const bundles: BuiltScriptBundle[] = []

  for (const record of await listActiveScripts(index)) {
    if (!record.enabled) continue
    const code = await getScriptCode(record.id)
    if (!code) continue
    const values = await getScriptValues(record.id)
    const externals = await getScriptExternals(record.id)
    const bundle = buildBundle(
      record,
      code,
      values,
      externals,
      runtimeJs,
      settings,
      handlerVersion,
      nonce,
    )
    if (!bundle || bundle.contextMenuOnly) continue
    if (!bundle.code) continue
    bundles.push(bundle)
  }

  const relay = relayBundle(bundles, nonce)
  // The relay must be registered first so it is listening before document_start page-world scripts report.
  return relay ? [relay, ...bundles] : bundles
}

export async function syncScriptStudioUserScripts(): Promise<void> {
  if (!chrome.userScripts) return
  const bundles = await collectBundles()
  const desired = bundles.map((b) => ({
    id: b.userScriptId,
    matches: b.matches,
    excludeMatches: b.excludeMatches.length ? b.excludeMatches : undefined,
    includeGlobs: b.includeGlobs.length ? b.includeGlobs : undefined,
    excludeGlobs: b.excludeGlobs.length ? b.excludeGlobs : undefined,
    runAt: b.runAt,
    world: b.world,
    allFrames: b.allFrames,
    js: [{ code: b.code }],
  }))

  try {
    const existing = await chrome.userScripts.getScripts()
    const owned = existing.filter((s) => s.id.startsWith(OWNED_PREFIX))
    const desiredIds = new Set(desired.map((d) => d.id))

    const toRemove = owned.filter((s) => !desiredIds.has(s.id)).map((s) => s.id)
    if (toRemove.length) await chrome.userScripts.unregister({ ids: toRemove })

    const fpById = new Map(bundles.map((b) => [b.userScriptId, userScriptFingerprint(b)]))
    for (const script of desired) {
      const prev = owned.find((s) => s.id === script.id)
      const nextFp = fpById.get(script.id)
      const prevBundle = prev
        ? {
            id: prev.id,
            matches: prev.matches ?? [],
            excludeMatches: prev.excludeMatches ?? [],
            runAt: prev.runAt ?? 'document_idle',
            world: prev.world ?? 'USER_SCRIPT',
            allFrames: prev.allFrames ?? false,
            codeLen: prev.js?.[0]?.code?.length ?? 0,
            contextMenuOnly: false,
          }
        : null
      const prevFp = prevBundle
        ? JSON.stringify({
            id: prevBundle.id,
            matches: prevBundle.matches,
            excludeMatches: prevBundle.excludeMatches,
            runAt: prevBundle.runAt,
            world: prevBundle.world,
            allFrames: prevBundle.allFrames,
            codeLen: prevBundle.codeLen,
            contextMenuOnly: false,
          })
        : null

      if (prevFp !== nextFp) {
        if (prev) await chrome.userScripts.unregister({ ids: [script.id] })
        await chrome.userScripts.register([script])
      }
    }
  } catch (error) {
    logger.warn('sync userScripts failed', error)
  }
}

export function scheduleScriptStudioSync(): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncScriptStudioUserScripts()
  }, 300)
}

export async function executeScriptOnTab(tabId: number, scriptId: string): Promise<void> {
  const code = await getScriptCode(scriptId)
  if (!code) return
  const index = await getScriptStudioIndex()
  const record = index.scripts.find((s) => s.id === scriptId)
  if (!record) return
  const settings = await getScriptStudioSettings()
  const values = await getScriptValues(scriptId)
  const externals = await getScriptExternals(scriptId)
  const runtimeJs = await loadRuntimeJs()
  const handlerVersion = chrome.runtime.getManifest().version
  const bundle = buildBundle(record, code, values, externals, runtimeJs, settings, handlerVersion)
  if (!bundle?.code) return
  await chrome.scripting.executeScript({
    target: { tabId },
    world: bundle.world === 'MAIN' ? 'MAIN' : 'MAIN',
    injectImmediately: true,
    func: (src: string) => {
      const el = document.createElement('script')
      el.textContent = src
      ;(document.head || document.documentElement).appendChild(el)
      el.remove()
    },
    args: [bundle.code],
  })
}

export function watchScriptStudioStorage(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    const keys = Object.keys(changes)
    if (
      keys.includes(STORAGE_KEYS.scriptStudio) ||
      keys.includes(STORAGE_KEYS.scriptStudioSettings) ||
      keys.some((k) => k.startsWith('ss:'))
    ) {
      scheduleScriptStudioSync()
    }
  })
}

export async function initScriptStudioRegistration(): Promise<void> {
  try {
    if (chrome.userScripts) await chrome.userScripts.configureWorld({ messaging: true })
  } catch {
    /* permission not granted yet */
  }
  if (!galleryChecked) {
    galleryChecked = true
    await upgradeGalleryScripts().catch((e) => logger.warn('gallery upgrade failed', e))
  }
  await syncScriptStudioUserScripts()
}
