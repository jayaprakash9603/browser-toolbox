import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Browser Toolbox',
  version: '0.1.0',
  description:
    'All-in-one productivity toolbox: clipboard, text, developer, QA and web utilities in one side panel.',
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  action: {
    default_title: 'Open Browser Toolbox',
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
      description: 'Open the toolbox command palette',
    },
  },
})
