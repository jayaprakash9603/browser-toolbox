import { dedupeRows } from './dedupe'
import type { ScrapeConfig, ScrapeJobPhase, ScrapeRow } from './types'

export const SCRAPER_ROW_CAP = 50_000

export interface JobRunnerDeps {
  sleep: (ms: number) => Promise<void>
  randomDelay: (min: number, max: number) => number
  extractPage: () => Promise<ScrapeRow[]>
  clickNext: () => Promise<{ ok: boolean; navigated?: boolean }>
  scrollMore: () => Promise<{ ok: boolean; grew: boolean }>
  waitAfterNav: () => Promise<void>
  onUpdate: (patch: {
    phase: ScrapeJobPhase
    pages: number
    rows: ScrapeRow[]
    error?: string
    warning?: string
  }) => void
  shouldStop: () => boolean
}

export async function runScrapeJobLoop(
  config: ScrapeConfig,
  initialRows: ScrapeRow[],
  deps: JobRunnerDeps,
): Promise<void> {
  let rows = [...initialRows]
  let pages = 1
  let scrollStall = 0
  let lastFingerprint = ''

  const fingerprint = (r: ScrapeRow[]) =>
    r.length ? JSON.stringify(r[r.length - 1]) : ''

  deps.onUpdate({ phase: 'extracting', pages, rows })

  while (!deps.shouldStop()) {
    if (pages >= config.maxPages) {
      deps.onUpdate({ phase: 'done', pages, rows })
      return
    }

    if (config.mode === 'none') {
      deps.onUpdate({ phase: 'done', pages, rows })
      return
    }

    deps.onUpdate({ phase: 'waiting', pages, rows })
    const delay = deps.randomDelay(config.delayMinMs, config.delayMaxMs)
    await deps.sleep(delay)

    if (deps.shouldStop()) break

    if (config.mode === 'scroll') {
      deps.onUpdate({ phase: 'paginating', pages, rows })
      const { ok, grew } = await deps.scrollMore()
      if (!ok || !grew) {
        scrollStall += 1
        if (scrollStall >= 2) {
          deps.onUpdate({ phase: 'done', pages, rows })
          return
        }
        continue
      }
      scrollStall = 0
      await deps.waitAfterNav()
    } else if (config.mode === 'click' && config.nextSelector) {
      deps.onUpdate({ phase: 'paginating', pages, rows })
      const { ok, navigated } = await deps.clickNext()
      if (!ok) {
        deps.onUpdate({ phase: 'done', pages, rows })
        return
      }
      if (navigated) await deps.waitAfterNav()
      else await deps.sleep(600)
    } else {
      deps.onUpdate({ phase: 'done', pages, rows })
      return
    }

    deps.onUpdate({ phase: 'extracting', pages: pages + 1, rows })
    const batch = await deps.extractPage()
    const fp = fingerprint(batch)
    if (fp && fp === lastFingerprint && config.mode === 'click') {
      deps.onUpdate({ phase: 'done', pages, rows })
      return
    }
    lastFingerprint = fp
    rows = dedupeRows(rows, batch)
    pages += 1
    if (rows.length >= SCRAPER_ROW_CAP) {
      deps.onUpdate({
        phase: 'done',
        pages,
        rows: rows.slice(0, SCRAPER_ROW_CAP),
        warning: `Row limit reached (${SCRAPER_ROW_CAP.toLocaleString()}).`,
      })
      return
    }
    deps.onUpdate({ phase: 'extracting', pages, rows })
  }

  deps.onUpdate({ phase: 'stopped', pages, rows })
}
