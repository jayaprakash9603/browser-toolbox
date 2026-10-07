import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ApiClient, {
  createDefaultI18n,
  createExtensionAdapters,
  registerExtensionHistoryListener,
  shadcnKit,
} from 'postman-lite'
import 'postman-lite/style.css'

import {
  ApiClientHostLifecycle,
  useToolboxApiClientAppearanceSync,
} from '@/features/api-client/ApiClientHostLifecycle'
import { buildApiClientTheme } from '@/features/api-client/build-api-client-theme'
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
  const appearanceSync = useToolboxApiClientAppearanceSync(themeMode)

  const settingsExtras = useMemo(
    () => (
      <>
        <ApiClientHostLifecycle />
        {HOST_APPEARANCE_NOTE}
      </>
    ),
    [],
  )

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
      persistSidebarState={false}
      defaultSidebarOpen={false}
      settingsExtras={settingsExtras}
      workingDirectoryHostContent={
        <p className="text-xs text-muted-foreground">{t('apiClient.storageHostHint')}</p>
      }
      appearanceControlledByHost
      appearanceSync={appearanceSync}
    />
  )
}
