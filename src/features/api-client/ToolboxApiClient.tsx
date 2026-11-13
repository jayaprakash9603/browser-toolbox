import { useEffect, useMemo } from 'react'
import ApiClient, {
  consumePendingOpenRequest,
  createDefaultI18n,
  createExtensionAdapters,
  PENDING_OPEN_REQUEST_KEY,
  shadcnKit,
} from 'postman-lite'

import {
  ApiClientHostLifecycle,
  useToolboxApiClientAppearanceSync,
} from '@/features/api-client/ApiClientHostLifecycle'
import { buildApiClientTheme } from '@/features/api-client/build-api-client-theme'
import { usePostmanLiteStylesheet } from '@/features/api-client/usePostmanLiteStylesheet'
import type { ThemeMode } from '@/features/settings/settingsService'
import { useToast } from '@/shared/components/toast/useToast'
import { useSettings } from '@/shared/hooks/useSettings'
import { DEFAULT_PALETTE } from '@/shared/lib/theme/palettes'

const HOST_APPEARANCE_NOTE = (
  <p className="text-xs text-muted-foreground">
    Theme and color palette follow One Panel Settings → Appearance.
  </p>
)

export function ToolboxApiClient() {
  usePostmanLiteStylesheet()
  useEffect(() => {
    void consumePendingOpenRequest()
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && changes[PENDING_OPEN_REQUEST_KEY]) void consumePendingOpenRequest()
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])
  const toast = useToast()
  const settings = useSettings()
  const themeMode: ThemeMode = settings?.theme ?? 'system'
  const palette = settings?.palette ?? DEFAULT_PALETTE

  const adapters = useMemo(
    () => ({
      ...createExtensionAdapters(createDefaultI18n(), {
        folderStorage: 'none',
      }),
      userNotify: {
        show: (message: string, options?: { variant?: 'error' | 'info' | 'success' }) => {
          toast.show(message, {
            variant: options?.variant === 'error' ? 'error' : options?.variant ?? 'info',
          })
        },
      },
    }),
    [toast],
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
      defaultSidebarOpen={false}
      settingsExtras={settingsExtras}
    />
  )
}
