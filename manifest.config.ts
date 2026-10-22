import { defineManifest } from '@crxjs/vite-plugin'

/** Keep ids in sync with src/core/commands/manifest.ts */
function buildManifestCommands(): Record<string, { description: string }> {
  return {
    'open-command-palette': { description: '__MSG_commandPaletteDescription__' },
    'pick-element': { description: '__MSG_commandPickElement__' },
    'capture-screenshot': { description: '__MSG_commandCaptureScreenshot__' },
    'toggle-pip': { description: '__MSG_commandTogglePip__' },
    'toggle-recording': { description: '__MSG_commandToggleRecording__' },
  }
}

export default defineManifest({
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extName__',
  version: '0.1.0',
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
  optional_permissions: ['userScripts', 'debugger'],
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
        'blocked.html',
        'protection/threats.json',
        'protection/scripts/*',
        'sites/scripts/*',
        'sites/youtube/*',
        'sites/whatsapp/*',
        'sites/instagram/*',
        'sites/vendor/*',
        'interceptor/scripts/*',
        'recorder.html',
      ],
    },
  ],
  commands: buildManifestCommands(),
})
