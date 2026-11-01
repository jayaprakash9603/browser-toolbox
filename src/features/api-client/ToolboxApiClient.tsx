import { useEffect, useMemo, useState } from 'react'
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
import { Button } from '@/shared/components/ui/button'

const HOST_APPEARANCE_NOTE = (
  <p className="text-xs text-muted-foreground">
    Theme and color palette follow One Panel Settings → Appearance.
  </p>
)

export function ToolboxApiClient() {
  usePostmanLiteStylesheet()
  const [settingsOpen, setSettingsOpen] = useState(false)
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

  useEffect(() => {
    const onSettingsClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button[aria-label="Settings"]')
      if (!button?.closest('.api-client-theme-host')) return
      event.preventDefault()
      event.stopPropagation()
      setSettingsOpen(true)
    }
    document.addEventListener('click', onSettingsClick, true)
    return () => document.removeEventListener('click', onSettingsClick, true)
  }, [])

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
    <>
      <ApiClient
        embedded
        appearanceControlledByHost
        adapters={adapters}
        uiKit={shadcnKit}
        theme={theme}
        appearanceSync={appearanceSync}
        locale="en"
        storageNamespace="browser_toolbox_apiclient"
        persistSidebarState={false}
        defaultSidebarOpen={false}
        settingsExtras={settingsExtras}
      />
      {settingsOpen && <ApiClientSettingsFallback onClose={() => setSettingsOpen(false)} />}
    </>
  )
}

function ApiClientSettingsFallback({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-client-settings-title"
        className="w-full max-w-lg rounded-xl border bg-background p-5 text-foreground shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="api-client-settings-title" className="text-base font-semibold">
              API Client settings
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Request Builder preferences are saved locally in this browser.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-5 grid gap-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-sm font-medium">Appearance</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Theme and color palette follow One Panel Settings → Appearance.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-sm font-medium">Workspace data</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Requests, environments and history stay in the API Client workspace storage.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
