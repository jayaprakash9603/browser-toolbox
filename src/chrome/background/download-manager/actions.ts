import { createLogger } from '@/core/logging'

import { startDownload } from './control'
import { enqueueUrls, kickQueue } from './queue'

const logger = createLogger('download-manager-actions')

export async function downloadUrlFromMenu(url: string, referrer?: string): Promise<void> {
  try {
    await startDownload({ url, referrer })
    kickQueue()
  } catch (error) {
    logger.warn('menu download failed', error)
  }
}

export async function addUrlToQueue(url: string, referrer?: string): Promise<void> {
  await enqueueUrls([{ url, referrer }])
  kickQueue()
}
