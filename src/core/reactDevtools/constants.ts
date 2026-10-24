export const REACT_DEVTOOLS_BUILD_PREFIX = 'react-devtools/build'

export const REACT_DEVTOOLS_SCRIPT_IDS = {
  proxy: 'bt-react-devtools-proxy',
  fileFetcher: 'bt-react-devtools-file-fetcher',
  prepareInjection: 'bt-react-devtools-prepare-injection',
  fallbackEvalContext: 'bt-react-devtools-fallback-eval-context',
  installHook: 'bt-react-devtools-install-hook',
  hookSettingsInjector: 'bt-react-devtools-hook-settings-injector',
} as const

export const REACT_DEVTOOLS_OWNED_SCRIPT_IDS = Object.values(REACT_DEVTOOLS_SCRIPT_IDS)

export const REACT_DEVTOOLS_BUILD_FILES = {
  proxy: `${REACT_DEVTOOLS_BUILD_PREFIX}/proxy.js`,
  fileFetcher: `${REACT_DEVTOOLS_BUILD_PREFIX}/fileFetcher.js`,
  prepareInjection: `${REACT_DEVTOOLS_BUILD_PREFIX}/prepareInjection.js`,
  fallbackEvalContext: `${REACT_DEVTOOLS_BUILD_PREFIX}/fallbackEvalContext.js`,
  installHook: `${REACT_DEVTOOLS_BUILD_PREFIX}/installHook.js`,
  hookSettingsInjector: `${REACT_DEVTOOLS_BUILD_PREFIX}/hookSettingsInjector.js`,
  backendManager: `${REACT_DEVTOOLS_BUILD_PREFIX}/backendManager.js`,
  backendCompact: `${REACT_DEVTOOLS_BUILD_PREFIX}/react_devtools_backend_compact.js`,
  main: `${REACT_DEVTOOLS_BUILD_PREFIX}/main.js`,
} as const

export const REACT_DEVTOOLS_HOOK_SETTINGS_KEY = 'reactDevtoolsHookSettings'

export const REACT_DEVTOOLS_SESSION_DETECTION_KEY = 'reactDevtoolsTabDetection'

export type ReactDevtoolsSurfaceKey =
  | 'components'
  | 'profiler'
  | 'suspense'
  | 'elementsSidebar'
  | 'sourcesEditor'

export const REACT_DEVTOOLS_SURFACE_KEYS: ReactDevtoolsSurfaceKey[] = [
  'components',
  'profiler',
  'suspense',
  'elementsSidebar',
  'sourcesEditor',
]

export const EXTENSION_BRIDGE_CONNECTION_READY =
  'react-devtools-extension-bridge-connection-ready'
export const EXTENSION_BRIDGE_CONNECTION_DISCONNECTED =
  'react-devtools-extension-bridge-connection-disconnected'
