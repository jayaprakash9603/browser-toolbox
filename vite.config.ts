import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import manifest from './manifest.config.ts'

const postmanLiteDist = fileURLToPath(new URL('./node_modules/postman-lite/dist', import.meta.url))

// The content script is injected on demand via chrome.scripting, but the CRXJS loader
// dynamically imports its chunks, which Chrome only allows on pages listed in
// web_accessible_resources. CRXJS copies the sentinel content_scripts match there.
function exposeContentScriptChunks(): Plugin {
  return {
    name: 'expose-content-script-chunks',
    apply: 'build',
    enforce: 'post',
    writeBundle(options) {
      const manifestPath = join(options.dir ?? 'dist', 'manifest.json')
      const built = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        web_accessible_resources?: { matches?: string[] }[]
      }
      for (const entry of built.web_accessible_resources ?? []) {
        entry.matches = ['<all_urls>']
      }
      writeFileSync(manifestPath, `${JSON.stringify(built, null, 2)}\n`)
    },
  }
}

export default defineVitestConfig({
  plugins: [react(), tailwindcss(), crx({ manifest }), exposeContentScriptChunks()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'postman-lite/core', replacement: `${postmanLiteDist}/core.js` },
      { find: 'postman-lite/style.css', replacement: `${postmanLiteDist}/style.css` },
      { find: /^postman-lite$/, replacement: `${postmanLiteDist}/index.js` },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  build: {
    rollupOptions: {
      input: { offscreen: 'offscreen.html' },
    },
  },
  optimizeDeps: {
    include: ['postman-lite'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    pool: 'threads',
  },
})
