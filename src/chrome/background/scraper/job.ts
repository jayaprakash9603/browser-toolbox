import {
  runScrapeJobLoop,
  scraperJobKey,
  type ScrapeJobState,
  type ScrapeRow,
} from '@/core/scraper'
import { registerMessageHandler } from '@/core/messaging'
import type { ExtensionMessage } from '@/core/messaging/types'
import { ensureContentScriptInTab } from '@/chrome/contentScriptClient'

const activeJobs = new Map<number, { stop: () => void }>()

async function loadJob(tabId: number): Promise<ScrapeJobState | null> {
  const key = scraperJobKey(tabId)
  const data = await chrome.storage.session.get(key)
  return (data[key] as ScrapeJobState | undefined) ?? null
}

async function saveJob(state: ScrapeJobState): Promise<void> {
  await chrome.storage.session.set({ [scraperJobKey(state.tabId)]: state })
}

async function sendTab<T>(tabId: number, message: ExtensionMessage): Promise<T> {
  await ensureContentScriptInTab(tabId)
  const response = (await chrome.tabs.sendMessage(tabId, message)) as {
    ok: boolean
    data?: T
    error?: string
  }
  if (!response?.ok) throw new Error(response?.error ?? 'Tab message failed.')
  return response.data as T
}

function waitTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }, timeoutMs)
    const listener = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer)
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

export function registerScraperJobHandlers(): void {
  registerMessageHandler('SCRAPER_JOB_GET', async (message) => {
    const tabId = (message as Extract<ExtensionMessage, { type: 'SCRAPER_JOB_GET' }>).tabId
    return (await loadJob(tabId)) ?? { phase: 'idle' as const }
  })

  registerMessageHandler('SCRAPER_JOB_STOP', async (message) => {
    const tabId = (message as Extract<ExtensionMessage, { type: 'SCRAPER_JOB_STOP' }>).tabId
    activeJobs.get(tabId)?.stop()
    activeJobs.delete(tabId)
    const prev = await loadJob(tabId)
    if (prev) {
      await saveJob({ ...prev, phase: 'stopped', updatedAt: Date.now() })
    }
    return { ok: true }
  })

  registerMessageHandler('SCRAPER_JOB_START', async (message) => {
    const m = message as Extract<ExtensionMessage, { type: 'SCRAPER_JOB_START' }>
    const { tabId, config } = m
    activeJobs.get(tabId)?.stop()
    let stopped = false
    const stop = () => {
      stopped = true
    }
    activeJobs.set(tabId, { stop })

    const initialRows = m.rows ?? []
    const state: ScrapeJobState = {
      tabId,
      phase: 'extracting',
      pages: 1,
      rowCount: initialRows.length,
      rows: initialRows,
      config,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveJob(state)

    void runScrapeJobLoop(config, initialRows, {
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      randomDelay: (min, max) => min + Math.random() * (max - min),
      extractPage: async () => {
        const { rows } = await sendTab<{ rows: ScrapeRow[] }>(tabId, {
          type: 'SCRAPER_EXTRACT',
          config,
        })
        return rows
      },
      clickNext: async () => {
        if (!config.nextSelector) return { ok: false }
        return sendTab(tabId, {
          type: 'SCRAPER_NEXT',
          selector: config.nextSelector,
          rowSelector: config.rowSelector,
          maxWaitMs: config.maxWaitMs,
        })
      },
      scrollMore: async () =>
        sendTab(tabId, {
          type: 'SCRAPER_SCROLL',
          rowSelector: config.rowSelector,
          maxWaitMs: config.maxWaitMs,
        }),
      waitAfterNav: async () => {
        await waitTabComplete(tabId, config.maxWaitMs)
        await ensureContentScriptInTab(tabId)
        await sendTab(tabId, {
          type: 'SCRAPER_WAIT_DATA',
          rowSelector: config.rowSelector,
          maxWaitMs: config.maxWaitMs,
        })
      },
      shouldStop: () => stopped,
      onUpdate: async (patch) => {
        const cur = (await loadJob(tabId)) ?? state
        const next: ScrapeJobState = {
          ...cur,
          ...patch,
          rowCount: patch.rows.length,
          updatedAt: Date.now(),
        }
        await saveJob(next)
      },
    }).finally(() => {
      activeJobs.delete(tabId)
    })

    return { ok: true }
  })
}
