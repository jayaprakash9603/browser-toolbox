import { useEffect, useState } from 'react'

import { IMAGE_DOWNLOAD_JOB_KEY, readImageDownloadJob, type ImageDownloadJob } from '@/core/imageDownloadJob'

export function useImageDownloadJob(): ImageDownloadJob | null {
  const [job, setJob] = useState<ImageDownloadJob | null>(null)

  useEffect(() => {
    let alive = true
    void readImageDownloadJob().then((stored) => {
      if (alive) setJob(stored)
    })
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'session' || !(IMAGE_DOWNLOAD_JOB_KEY in changes)) return
      setJob((changes[IMAGE_DOWNLOAD_JOB_KEY].newValue as ImageDownloadJob | undefined) ?? null)
    }
    chrome.storage?.onChanged?.addListener(onChanged)
    return () => {
      alive = false
      chrome.storage?.onChanged?.removeListener(onChanged)
    }
  }, [])

  return job
}
