import { useEffect, useState } from 'react'

import { HTML_BUNDLE_JOB_KEY, readHtmlBundleJob, type HtmlBundleJob } from '@/core/htmlBundleJob'

export function useHtmlBundleJob(): HtmlBundleJob | null {
  const [job, setJob] = useState<HtmlBundleJob | null>(null)

  useEffect(() => {
    let alive = true
    void readHtmlBundleJob().then((stored) => {
      if (alive) setJob(stored)
    })
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'session' || !(HTML_BUNDLE_JOB_KEY in changes)) return
      setJob((changes[HTML_BUNDLE_JOB_KEY].newValue as HtmlBundleJob | undefined) ?? null)
    }
    chrome.storage?.onChanged?.addListener(onChanged)
    return () => {
      alive = false
      chrome.storage?.onChanged?.removeListener(onChanged)
    }
  }, [])

  const [, setTick] = useState(0)
  const running = job?.status === 'running'
  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 15_000)
    return () => window.clearInterval(timer)
  }, [running])

  return job
}
