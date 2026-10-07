import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ApiClient, {
  createDefaultI18n,
  createExtensionAdapters,
  registerExtensionHistoryListener,
  shadcnKit,
} from 'postman-lite'
import 'postman-lite/style.css'

import { buildApiClientTheme, TOOLBOX_THEME_ID } from '@/features/api-client/build-api-client-theme'
import type { ThemeMode } from '@/features/settings/settingsService'
import { useSettings } from '@/shared/hooks/useSettings'

const HOST_APPEARANCE_NOTE = (
  <p className="text-xs text-muted-foreground">
    Light, dark, and system appearance follow Browser Toolbox Settings → Theme.
  </p>
)

export function ToolboxApiClient() {
  const { t } = useTranslation()
  const settings = useSettings()
  const themeMode: ThemeMode = settings?.theme ?? 'system'

  const adapters = useMemo(
    () =>
      createExtensionAdapters(createDefaultI18n(), {
        folderStorage: 'none',
      }),
    [],
  )

  const theme = useMemo(() => buildApiClientTheme(themeMode), [themeMode])

  useEffect(() => {
    registerExtensionHistoryListener()
  }, [])

  return (
    <ApiClient
      embedded
      adapters={adapters}
      uiKit={shadcnKit}
      theme={theme}
      locale="en"
      storageNamespace="browser_toolbox_apiclient"
      persistSidebarState
      defaultSidebarOpen={false}
      settingsExtras={HOST_APPEARANCE_NOTE}
      workingDirectoryHostContent={
        <p className="text-xs text-muted-foreground">{t('apiClient.storageHostHint')}</p>
      }
      appearanceControlledByHost
      appearanceSync={{ darkMode: themeMode, themeId: TOOLBOX_THEME_ID }}
    />
  )
}
