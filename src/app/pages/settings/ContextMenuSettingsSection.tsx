import { useTranslation } from 'react-i18next'

import { SettingsRow } from '@/app/pages/settings/ui'
import {
  updateSettings,
  type Settings,
} from '@/features/settings/settingsService'
import type { ContextMenuVisibilityKey } from '@/core/settings/contextMenuVisibility'
import { Switch } from '@/shared/components/ui/switch'
import { useSettings } from '@/shared/hooks/useSettings'

const ROWS: { key: ContextMenuVisibilityKey; labelKey: string; descKey: string; searchId: string }[] = [
  {
    key: 'openPanel',
    labelKey: 'settings.contextMenu.openPanel',
    descKey: 'settings.contextMenu.openPanelDescription',
    searchId: 'contextMenuOpenPanel',
  },
  {
    key: 'clipboardHistory',
    labelKey: 'settings.contextMenu.clipboardHistory',
    descKey: 'settings.contextMenu.clipboardHistoryDescription',
    searchId: 'contextMenuClipboardHistory',
  },
  {
    key: 'colorPicker',
    labelKey: 'settings.contextMenu.colorPicker',
    descKey: 'settings.contextMenu.colorPickerDescription',
    searchId: 'contextMenuColorPicker',
  },
  {
    key: 'screenshot',
    labelKey: 'settings.contextMenu.screenshot',
    descKey: 'settings.contextMenu.screenshotDescription',
    searchId: 'contextMenuScreenshot',
  },
  {
    key: 'screenRecorder',
    labelKey: 'settings.contextMenu.screenRecorder',
    descKey: 'settings.contextMenu.screenRecorderDescription',
    searchId: 'contextMenuScreenRecorder',
  },
  {
    key: 'tasks',
    labelKey: 'settings.contextMenu.tasks',
    descKey: 'settings.contextMenu.tasksDescription',
    searchId: 'contextMenuTasks',
  },
  {
    key: 'readingList',
    labelKey: 'settings.contextMenu.readingList',
    descKey: 'settings.contextMenu.readingListDescription',
    searchId: 'contextMenuReadingList',
  },
  {
    key: 'bookmarks',
    labelKey: 'settings.contextMenu.bookmarks',
    descKey: 'settings.contextMenu.bookmarksDescription',
    searchId: 'contextMenuBookmarks',
  },
  {
    key: 'saveImageAs',
    labelKey: 'settings.contextMenu.saveImageAs',
    descKey: 'settings.contextMenu.saveImageAsDescription',
    searchId: 'contextMenuSaveImageAs',
  },
  {
    key: 'pictureInPicture',
    labelKey: 'settings.contextMenu.pictureInPicture',
    descKey: 'settings.contextMenu.pictureInPictureDescription',
    searchId: 'contextMenuPictureInPicture',
  },
  {
    key: 'siteQuickActions',
    labelKey: 'settings.contextMenu.siteQuickActions',
    descKey: 'settings.contextMenu.siteQuickActionsDescription',
    searchId: 'contextMenuSiteQuickActions',
  },
  {
    key: 'chatPulse',
    labelKey: 'settings.contextMenu.chatPulse',
    descKey: 'settings.contextMenu.chatPulseDescription',
    searchId: 'contextMenuChatPulse',
  },
  {
    key: 'downloadManager',
    labelKey: 'settings.contextMenu.downloadManager',
    descKey: 'settings.contextMenu.downloadManagerDescription',
    searchId: 'contextMenuDownloadManager',
  },
  {
    key: 'historyManager',
    labelKey: 'settings.contextMenu.historyManager',
    descKey: 'settings.contextMenu.historyManagerDescription',
    searchId: 'contextMenuHistoryManager',
  },
  {
    key: 'mobileSimulator',
    labelKey: 'settings.contextMenu.mobileSimulator',
    descKey: 'settings.contextMenu.mobileSimulatorDescription',
    searchId: 'contextMenuMobileSimulator',
  },
]

export function ContextMenuSettingsSection() {
  const { t } = useTranslation()
  const settings = useSettings()
  if (!settings) return null

  const patchMenu = (key: ContextMenuVisibilityKey, checked: boolean) => {
    void updateSettings({
      contextMenu: { ...settings.contextMenu, [key]: checked },
    } satisfies Partial<Settings>)
  }

  return (
    <>
      {ROWS.map(({ key, labelKey, descKey, searchId }) => (
        <SettingsRow key={key} searchId={searchId} label={t(labelKey)} description={t(descKey)}>
          <Switch
            checked={settings.contextMenu[key]}
            onCheckedChange={(checked) => patchMenu(key, checked)}
            aria-label={t(labelKey)}
          />
        </SettingsRow>
      ))}
    </>
  )
}
