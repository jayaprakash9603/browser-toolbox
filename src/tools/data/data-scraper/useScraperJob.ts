import { useEffect, useState } from 'react'

import { SCRAPER_PICK_KEY, scraperJobKey, type ScrapeJobState, type ScraperPickResult } from '@/core/scraper'

export function useScraperJob(tabId: number | undefined) {
  const [job, setJob] = useState<ScrapeJobState | null>(null)
  const [pick, setPick] = useState<ScraperPickResult | null>(null)

  useEffect(() => {
    if (tabId == null) return
    const load = () => {
      void chrome.storage.session.get(scraperJobKey(tabId)).then((data) => {
        setJob((data[scraperJobKey(tabId)] as ScrapeJobState) ?? null)
      })
    }
    load()
    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'session') return
      const key = scraperJobKey(tabId)
      if (changes[key]) setJob(changes[key].newValue as ScrapeJobState)
      if (changes[SCRAPER_PICK_KEY]) setPick(changes[SCRAPER_PICK_KEY].newValue as ScraperPickResult)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [tabId])

  return { job, pick, setPick }
}
