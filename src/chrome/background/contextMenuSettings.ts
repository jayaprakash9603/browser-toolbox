import { STORAGE_KEYS } from '@/core/constants'

import { enqueueContextMenuRebuild } from './contextMenus'

export function registerContextMenuSettingsSync(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEYS.settings in changes)) return
    void enqueueContextMenuRebuild()
  })
}
