import { getYoutubeEnhancerState } from '@/core/sites/youtube'
import { STORAGE_KEYS } from '@/core/constants'
import { registerMessageHandler } from '@/core/messaging'

import { fetchDislikes } from './dislikes'
import { fetchSponsorSegments } from './sponsorblock'
import { injectYoutubeIntoOpenTabs, syncYoutubeContentScripts } from './contentScripts'

export async function syncYoutubeEnhancerState(): Promise<void> {
  const state = await getYoutubeEnhancerState()
  await syncYoutubeContentScripts(state)
  await injectYoutubeIntoOpenTabs(state)
}

export function registerSitesYoutube(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.youtubeEnhancer]) void syncYoutubeEnhancerState()
  })

  registerMessageHandler('YT_SPONSOR_SEGMENTS', async (message) => {
    if (message.type !== 'YT_SPONSOR_SEGMENTS') return { segments: [] }
    const categories = Array.isArray(message.categories) ? message.categories.map(String) : []
    const segments = await fetchSponsorSegments(message.videoId, categories)
    return { segments }
  })

  registerMessageHandler('YT_DISLIKES', async (message) => {
    if (message.type !== 'YT_DISLIKES') return null
    return fetchDislikes(message.videoId)
  })

  registerMessageHandler('YT_DOWNLOAD_TRANSCRIPT', async () => ({ ok: false }))

  void syncYoutubeEnhancerState()
}
