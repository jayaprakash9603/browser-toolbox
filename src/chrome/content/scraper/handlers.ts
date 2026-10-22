import type { ExtensionMessage } from '@/core/messaging/types'
import {
  detectAtIndex,
  detectCandidates,
  extractAllRows,
  bestNextSelector,
  type ScrapeConfig,
} from '@/core/scraper'

import { cancelScraperPick, startScraperPick } from './picker'
import { clickNextButton, scrollForMore } from './paginate'
import { clearHighlights, highlightRows } from './session'
import { waitForDataQuiet } from './waitForData'

type SendResponse = (response: { ok: true; data: unknown } | { ok: false; error: string }) => void

export function handleScraperMessage(
  raw: ExtensionMessage,
  sendResponse: SendResponse,
): boolean | void {
  switch (raw.type) {
    case 'SCRAPER_DETECT': {
      try {
        const index = (raw as { candidateIndex?: number }).candidateIndex ?? 0
        const candidate = detectAtIndex(index)
        if (!candidate) {
          sendResponse({
            ok: false,
            error:
              'No repeating table or list found. Try Pick rows on one item, or scroll so more results load.',
          })
          return false
        }
        const total = detectCandidates().length
        highlightRows(candidate.rowSelector, candidate.containerSelector)
        sendResponse({
          ok: true,
          data: { candidate, candidateIndex: index, candidateCount: total },
        })
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : 'Auto-detect failed on this page.',
        })
      }
      return false
    }
    case 'SCRAPER_EXTRACT': {
      const config = (raw as { config: ScrapeConfig }).config
      try {
        const rows = extractAllRows(config.rowSelector, config.columns)
        sendResponse({ ok: true, data: { rows } })
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : 'Extract failed.',
        })
      }
      return false
    }
    case 'SCRAPER_HIGHLIGHT': {
      const { rowSelector, containerSelector } = raw as {
        rowSelector: string
        containerSelector?: string
      }
      const count = highlightRows(rowSelector, containerSelector)
      sendResponse({ ok: true, data: { count } })
      return false
    }
    case 'SCRAPER_CLEAR':
      clearHighlights()
      sendResponse({ ok: true, data: { cleared: true } })
      return false
    case 'SCRAPER_PICK_START': {
      const { mode, rowSelector } = raw as {
        mode: 'row' | 'column' | 'next'
        rowSelector?: string
      }
      startScraperPick(mode, rowSelector)
      sendResponse({ ok: true, data: { active: true } })
      return false
    }
    case 'SCRAPER_PICK_CANCEL':
      cancelScraperPick()
      sendResponse({ ok: true, data: { active: false } })
      return false
    case 'SCRAPER_SUGGEST_NEXT':
      sendResponse({ ok: true, data: { selector: bestNextSelector() } })
      return false
    case 'SCRAPER_ROW_COUNT': {
      const { rowSelector } = raw as { rowSelector: string }
      let count = 0
      try {
        count = document.querySelectorAll(rowSelector).length
      } catch {
        count = 0
      }
      sendResponse({ ok: true, data: { count } })
      return false
    }
    case 'SCRAPER_WAIT_DATA': {
      const { rowSelector, maxWaitMs } = raw as { rowSelector: string; maxWaitMs: number }
      void waitForDataQuiet(rowSelector, maxWaitMs).then(() =>
        sendResponse({ ok: true, data: { ready: true } }),
      )
      return true
    }
    case 'SCRAPER_NEXT': {
      const { selector, rowSelector, maxWaitMs } = raw as {
        selector: string
        rowSelector: string
        maxWaitMs: number
      }
      void clickNextButton(selector, rowSelector, maxWaitMs).then((result) =>
        sendResponse({ ok: true, data: result }),
      )
      return true
    }
    case 'SCRAPER_SCROLL': {
      const { rowSelector, maxWaitMs } = raw as { rowSelector: string; maxWaitMs: number }
      void scrollForMore(rowSelector, maxWaitMs).then((result) =>
        sendResponse({ ok: true, data: result }),
      )
      return true
    }
    default:
      return false
  }
}
