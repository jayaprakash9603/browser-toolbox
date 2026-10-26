import { readFileSync } from 'node:fs'

import { defineManifest } from '@crxjs/vite-plugin'

/** package.json is the single source of the version; release.bat bumps it. */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/** Keep ids and default keys in sync with src/core/commands/manifest.ts and registry.ts */
function buildManifestCommands(): Record<
  string,
  { description: string; suggested_key: { default: string; mac: string } }
> {
  return {
    'open-command-palette': {
      suggested_key: { default: 'Ctrl+Shift+Space', mac: 'Command+Shift+Space' },
      description: '__MSG_commandPaletteDescription__',
    },
    'pick-element': {
      suggested_key: { default: 'Ctrl+Shift+E', mac: 'Command+Shift+E' },
      description: '__MSG_commandPickElement__',
    },
    'capture-screenshot': {
      suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
      description: '__MSG_commandCaptureScreenshot__',
    },
    'toggle-pip': {
      suggested_key: { default: 'Alt+P', mac: 'Alt+P' },
      description: '__MSG_commandTogglePip__',
    },
    'toggle-recording': {
      suggested_key: { default: 'Alt+Shift+R', mac: 'Alt+Shift+R' },
      description: '__MSG_commandToggleRecording__',
    },
    'add-page-task': {
      suggested_key: { default: 'Alt+Shift+Q', mac: 'Alt+Shift+Q' },
      description: '__MSG_commandAddPageTask__',
    },
  }
}

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
  side_panel: {
    default_path: 'index.html',
  },
  background: {
    service_worker: 'src/chrome/background/index.ts',
    type: 'module',
  },
  devtools_page: 'devtools.html',
  content_scripts: [
    {
      js: ['src/chrome/content/index.ts'],
      matches: ['https://browser-toolbox.invalid/*'],
      run_at: 'document_idle',
    },
  ],
  permissions: [
    'sidePanel',
    'storage',
    'clipboardRead',
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
    'webRequest',
    'webNavigation',
  ],
  optional_permissions: ['userScripts', 'debugger', 'cookies'],
  host_permissions: ['<all_urls>'],
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
