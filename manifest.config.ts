import { readFileSync } from 'node:fs'

import { defineManifest } from '@crxjs/vite-plugin'

import { buildManifestCommands } from './src/core/commands/manifest.ts'
import {
  DEFAULT_FIREFOX_EXTENSION_ID,
  isFirefoxTarget,
  resolveBuildTarget,
} from './src/platform/targets.ts'

/** package.json is the single source of the version; release.bat bumps it. */
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

const buildTarget = resolveBuildTarget(process.env.BUILD_TARGET)
const isFirefox = isFirefoxTarget(buildTarget)
const firefoxExtensionId =
  process.env.FIREFOX_EXTENSION_ID?.trim() || DEFAULT_FIREFOX_EXTENSION_ID

const chromiumPermissions = [
  'sidePanel',
  'storage',
  'clipboardWrite',
  'contextMenus',
  'activeTab',
  'scripting',
  'tabs',
  'downloads',
  'offscreen',
  'tabCapture',
  'desktopCapture',
  'declarativeNetRequest',
  'declarativeNetRequestFeedback',
  'alarms',
  'notifications',
  'webNavigation',
  'favicon',
]

const firefoxPermissions = [
  'storage',
  'clipboardWrite',
  'contextMenus',
  'activeTab',
  'scripting',
  'tabs',
  'downloads',
  'declarativeNetRequest',
  'alarms',
  'notifications',
  'webNavigation',
]

const optionalPermissions = [
  'clipboardRead',
  'webRequest',
  'userScripts',
  'debugger',
  'cookies',
  'bookmarks',
]

const firefoxOptionalPermissions = ['clipboardRead', 'webRequest', 'debugger', 'cookies', 'bookmarks']

export default defineManifest({
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extName__',
  version,
  description: '__MSG_extDescription__',
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  action: {
    default_title: '__MSG_actionTitle__',
  },
  ...(isFirefox ? {} : { side_panel: { default_path: 'index.html' } }),
  background: {
    ...(isFirefox
      ? { scripts: ['src/chrome/background/index.ts'], persistent: false }
      : { service_worker: 'src/chrome/background/index.ts', type: 'module' }),
  },
  devtools_page: 'devtools.html',
  content_scripts: [
    {
      js: ['src/chrome/content/index.ts'],
      matches: ['https://browser-toolbox.invalid/*'],
      run_at: 'document_idle',
    },
  ],
  permissions: isFirefox ? firefoxPermissions : chromiumPermissions,
  optional_permissions: isFirefox ? firefoxOptionalPermissions : optionalPermissions,
  optional_host_permissions: ['<all_urls>'],
  ...(isFirefox
    ? {}
    : {
        sandbox: {
          pages: ['script-sandbox.html'],
        },
      }),
  ...(isFirefox
    ? {
        sidebar_action: {
          default_panel: 'index.html',
          default_title: '__MSG_actionTitle__',
        },
        browser_specific_settings: {
          gecko: {
            id: firefoxExtensionId,
            strict_min_version: '113.0',
            data_collection_permissions: {
              required: ['none'],
            },
          },
        },
      }
    : {}),
  declarative_net_request: {
    rule_resources: [
      { id: 'ruleset-ads', enabled: false, path: 'adblock/rulesets/ads.json' },
      { id: 'ruleset-privacy', enabled: false, path: 'adblock/rulesets/privacy.json' },
      { id: 'ruleset-annoyances', enabled: false, path: 'adblock/rulesets/annoyances.json' },
      { id: 'ruleset-youtube', enabled: false, path: 'adblock/rulesets/youtube.json' },
    ],
  },
  web_accessible_resources: [
    {
      matches: ['<all_urls>'],
      resources: [
        'adblock/scripts/*',
        'adblock/cosmetic/*',
        'adblock/cosmetic/specific/*',
        'adblock/cosmetic/generic/*',
        'adblock/redirects/*',
        'adblock/scriptlets/data/*',
        'blocked.html',
        'protection/threats.json',
        'protection/scripts/*',
        'sites/scripts/*',
        'sites/youtube/*',
        'sites/whatsapp/*',
        'sites/instagram/*',
        'sites/vendor/*',
        'interceptor/scripts/*',
        'script-studio/*',
        'recorder.html',
        'react-devtools/build/*',
      ],
    },
  ],
  commands: buildManifestCommands(),
})
