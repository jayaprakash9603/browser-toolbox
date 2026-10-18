import { useMemo } from 'react'
import ApiClient, {
  createDefaultI18n,
  createExtensionAdapters,
  shadcnKit,
} from 'postman-lite'
import 'postman-lite/style.css'

import {
  ApiClientHostLifecycle,
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

  const settingsExtras = useMemo(
    () => (
      <>
        <ApiClientHostLifecycle />
        {HOST_APPEARANCE_NOTE}
      </>
    ),
    [],
  )

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
    />
  )
}
