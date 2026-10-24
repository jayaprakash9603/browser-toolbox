import { STORAGE_KEYS } from '@/core/constants'
import { REACT_DEVTOOLS_BUILD_FILES } from '@/core/reactDevtools/constants'
import type { ReactDevtoolsState } from '@/core/reactDevtools/state'
import { resolveBrowserThemeFromSettings } from '@/core/reactDevtools/theme'
import type { Settings } from '@/features/settings/settingsService'

import '@/chrome/devtools/react-devtools-theme.css'

declare global {
  interface Window {
    __BT_REACT_DEVTOOLS__?: {
      surfaces: ReactDevtoolsState['surfaces']
      theme: ReactDevtoolsState['theme']
      palette?: string
      density?: string
    }
  }
}

async function readLocal<T>(key: string): Promise<T | undefined> {
  const bag = await chrome.storage.local.get(key)
  return bag[key] as T | undefined
}

export async function bootstrapReactDevtoolsHost(): Promise<void> {
  const reactState = await readLocal<ReactDevtoolsState>(STORAGE_KEYS.reactDevtools)
  if (reactState?.enabled === false) return

  const settings = await readLocal<Settings>(STORAGE_KEYS.settings)
  const devtoolsTheme = chrome.devtools?.panels?.themeName
  const resolved =
    reactState?.theme && reactState.theme !== 'system'
      ? reactState.theme
      : settings
        ? resolveBrowserThemeFromSettings(settings, devtoolsTheme)
        : devtoolsTheme === 'dark'
          ? 'dark'
          : 'light'

  window.__BT_REACT_DEVTOOLS__ = {
    surfaces: reactState?.surfaces ?? {
      components: true,
      profiler: true,
      suspense: true,
      elementsSidebar: true,
      sourcesEditor: true,
    },
    theme: reactState?.theme ?? 'system',
    palette: settings?.palette,
    density: settings?.density,
  }

  document.documentElement.classList.toggle('dark', resolved === 'dark')
  if (settings?.palette) {
    document.documentElement.dataset.palette = settings.palette
  }
  if (settings?.density) {
    document.documentElement.dataset.density = settings.density
  }

  const mainUrl = chrome.runtime.getURL(REACT_DEVTOOLS_BUILD_FILES.main)
  const script = document.createElement('script')
  script.src = mainUrl
  script.async = false
  script.onerror = () => {
    console.error(
      '[One Panel] React DevTools failed to load. Run `npm run react-devtools:vendor` and reload the extension.',
      mainUrl,
    )
  }
  document.head.appendChild(script)
}

void bootstrapReactDevtoolsHost()
