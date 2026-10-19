import { useEffect } from 'react'
import { useApiClientStoreApi } from 'postman-lite'

import { TOOLBOX_THEME_ID } from '@/features/api-client/build-api-client-theme'
import { dispatchToolboxRestoreTheme } from '@/features/api-client/themeEvents'

function cleanupHostDocument() {
  const root = document.documentElement
  delete root.dataset.apiClientTheme
  delete root.dataset.themePreview
  dispatchToolboxRestoreTheme()
}

export function ApiClientHostLifecycle() {
  const storeApi = useApiClientStoreApi()

  useEffect(() => {
    document.documentElement.dataset.browserToolboxApiClient = 'open'
    return () => {
      const { openTabs, cancelActiveRequest } = storeApi.getState()
      if (openTabs.some((tab) => tab.sending)) cancelActiveRequest()
      delete document.documentElement.dataset.browserToolboxApiClient
      cleanupHostDocument()
    }
  }, [storeApi])

  return null
}

export function useToolboxApiClientAppearanceSync(themeMode: 'light' | 'dark' | 'system') {
  return { darkMode: themeMode, themeId: TOOLBOX_THEME_ID }
}
