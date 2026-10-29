import {
  classifyTabUrl,
  getActiveBrowserTab,
  isFileUrlTab,
} from '@/chrome/contentScriptClient'
import { collectLookups, detectTechnologies, DETECTION_ENGINE_VERSION } from '@/core/engines/techStack/detect'
import type { TechScan } from '@/core/engines/techStack/types'
import type { PageLoadResult } from '@/tools/seo/pageDataClient'

import { collectDomSignals, collectJsValues } from './inPage'

const SCAN_TIMEOUT_MS = 8000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Scan timed out')), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function scanActiveTabTech(): Promise<PageLoadResult<TechScan>> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return { ok: false, code: 'NO_TAB' }
  const restriction = classifyTabUrl(tab.url)
  if (restriction) return { ok: false, code: restriction }

  const { jsPaths, selectors } = collectLookups()
  const target = { tabId: tab.id }
  const started = performance.now()
  try {
    const [dom, main] = await withTimeout(
      Promise.all([
        chrome.scripting.executeScript({ target, func: collectDomSignals, args: [selectors] }),
        chrome.scripting
          .executeScript({ target, world: 'MAIN', func: collectJsValues, args: [jsPaths] })
          .catch(() => []),
      ]),
      SCAN_TIMEOUT_MS,
    )
    const domScan = dom[0]?.result
    if (!domScan) return { ok: false, code: 'CONTENT_SCRIPT_UNAVAILABLE' }

    const url = tab.url ?? ''
    const signals = { ...domScan.signals, url, jsValues: main[0]?.result ?? {} }
    const scan: TechScan = {
      url,
      scannedAt: new Date().toISOString(),
      hits: detectTechnologies(signals),
      facts: domScan.facts,
      headers: signals.headers,
      protocol: signals.protocol,
      durationMs: Math.round(performance.now() - started),
      headersAvailable: domScan.headersAvailable,
      engineVersion: DETECTION_ENGINE_VERSION,
    }
    return { ok: true, data: scan, tabId: tab.id, tabUrl: url }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, code: isFileUrlTab(tab.url) ? 'FILE_URL_ACCESS' : 'INJECT_FAILED', message }
  }
}
