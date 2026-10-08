import { defineManifest } from '@crxjs/vite-plugin'

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
  ],
  host_permissions: ['http://*/*', 'https://*/*'],
  commands: {
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
  },
})
