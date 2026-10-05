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
  permissions: ['sidePanel', 'storage', 'clipboardRead', 'clipboardWrite', 'contextMenus'],
  commands: {
    'open-command-palette': {
      suggested_key: { default: 'Ctrl+Shift+Space', mac: 'Command+Shift+Space' },
      description: '__MSG_commandPaletteDescription__',
    },
  },
})
