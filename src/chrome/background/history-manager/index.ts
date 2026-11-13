import { HISTORY_MANAGER_REVISION_KEY } from '@/core/history-manager'

let revision = 0

async function bumpRevision(): Promise<void> {
  revision += 1
  if (!chrome.storage?.session) return
  await chrome.storage.session.set({ [HISTORY_MANAGER_REVISION_KEY]: revision })
}

export function registerHistoryManager(): void {
  chrome.history?.onVisited?.addListener(() => {
    void bumpRevision()
  })
  chrome.history?.onVisitRemoved?.addListener(() => {
    void bumpRevision()
  })
}
