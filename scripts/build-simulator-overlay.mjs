import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entry = resolve(root, 'src/chrome/background/responsiveViewer/overlayMount.ts')
const outfile = resolve(root, 'public/inject/simulator-overlay.js')

await build({
  configFile: false,
  root,
  build: {
    emptyOutDir: false,
    outDir: resolve(root, 'public/inject'),
    lib: {
      entry,
      formats: ['iife'],
      name: '__TBX_SIM_MOUNT_BUNDLE',
      fileName: () => 'simulator-overlay.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        footer:
          'globalThis.__TBX_MOUNT_SIMULATOR__ = globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;',
      },
    },
    write: true,
    copyPublicDir: false,
    minify: true,
    reportCompressedSize: false,
  },
  resolve: {
    alias: [{ find: '@', replacement: resolve(root, 'src') }],
  },
  logLevel: 'warn',
})

console.log(`[simulator] wrote ${outfile}`)
