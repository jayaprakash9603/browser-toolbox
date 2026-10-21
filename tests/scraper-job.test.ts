import { describe, expect, it, vi } from 'vitest'

import { runScrapeJobLoop, type ScrapeConfig } from '@/core/scraper'

const baseConfig: ScrapeConfig = {
  rowSelector: '.row',
  columns: [],
  mode: 'none',
  delayMinMs: 10,
  delayMaxMs: 20,
  maxWaitMs: 100,
  maxPages: 5,
}

describe('scraper job runner', () => {
  it('stops immediately for mode none', async () => {
    const onUpdate = vi.fn()
    await runScrapeJobLoop(baseConfig, [{ a: '1' }], {
      sleep: async () => {},
      randomDelay: () => 10,
      extractPage: async () => [],
      clickNext: async () => ({ ok: true }),
      scrollMore: async () => ({ ok: true, grew: true }),
      waitAfterNav: async () => {},
      shouldStop: () => false,
      onUpdate,
    })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ phase: 'done' }))
  })
})
