import { useMemo } from 'react'
import ApiClient, {
  createDefaultI18n,
  createExtensionAdapters,
  shadcnKit,
} from 'postman-lite'

import {
  ApiClientHostLifecycle,
} from '@/features/api-client/ApiClientHostLifecycle'
import { buildApiClientTheme } from '@/features/api-client/build-api-client-theme'
import { usePostmanLiteStylesheet } from '@/features/api-client/usePostmanLiteStylesheet'
import type { ThemeMode } from '@/features/settings/settingsService'
import { useSettings } from '@/shared/hooks/useSettings'
import { DEFAULT_PALETTE } from '@/shared/lib/theme/palettes'

const HOST_APPEARANCE_NOTE = (
  <p className="text-xs text-muted-foreground">
    Theme and color palette follow Browser Toolbox Settings → Appearance.
  </p>
)

export function ToolboxApiClient() {
  usePostmanLiteStylesheet()
  const settings = useSettings()
  const themeMode: ThemeMode = settings?.theme ?? 'system'
  const palette = settings?.palette ?? DEFAULT_PALETTE

  const adapters = useMemo(
    () =>
      createExtensionAdapters(createDefaultI18n(), {
        folderStorage: 'none',
      }),
    [],
  )

  const theme = useMemo(() => buildApiClientTheme(themeMode, palette), [themeMode, palette])

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
