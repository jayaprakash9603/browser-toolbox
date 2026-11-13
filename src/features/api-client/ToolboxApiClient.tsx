import { useMemo } from 'react'
import ApiClient, {
  createDefaultI18n,
  createExtensionAdapters,
  shadcnKit,
} from 'postman-lite'

import {
  ApiClientHostLifecycle,
  useToolboxApiClientAppearanceSync,
} from '@/features/api-client/ApiClientHostLifecycle'
import { buildApiClientTheme } from '@/features/api-client/build-api-client-theme'
import { usePostmanLiteStylesheet } from '@/features/api-client/usePostmanLiteStylesheet'
import type { ThemeMode } from '@/features/settings/settingsService'
import { useSettings } from '@/shared/hooks/useSettings'
import { DEFAULT_PALETTE } from '@/shared/lib/theme/palettes'

const HOST_APPEARANCE_NOTE = (
  <p className="text-xs text-muted-foreground">
    Theme and color palette follow One Panel Settings → Appearance.
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
  const appearanceSync = useToolboxApiClientAppearanceSync(themeMode)
  const hostEffects = useMemo(() => <ApiClientHostLifecycle />, [])
  const settingsExtras = useMemo(() => HOST_APPEARANCE_NOTE, [])

  return (
    <ApiClient
      embedded
      appearanceControlledByHost
      adapters={adapters}
      uiKit={shadcnKit}
      theme={theme}
      appearanceSync={appearanceSync}
      hostEffects={hostEffects}
      locale="en"
      storageNamespace="browser_toolbox_apiclient"
      persistSidebarState={false}
      defaultSidebarOpen={true}
      settingsExtras={settingsExtras}
      features={{ importState: false, shortcutImport: false }}
    />
  )
}
