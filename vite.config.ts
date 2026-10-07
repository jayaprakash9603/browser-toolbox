import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import manifest from './manifest.config.ts'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function copyPostmanSandboxPlugin(): Plugin {
  return {
    name: 'copy-postman-sandbox',
    writeBundle() {
      const candidates = [
        resolve(rootDir, 'node_modules/postman-lite/dist/script-sandbox.html'),
        resolve(rootDir, '../postman-lite/dist/script-sandbox.html'),
      ]
      const source = candidates.find((path) => existsSync(path))
      if (!source) {
        console.warn(
          'postman-lite dist/script-sandbox.html not found; pre-request scripts may fail. Build postman-lite first.',
        )
        return
      }
      const dest = resolve(rootDir, 'dist/script-sandbox.html')
      copyFileSync(source, dest)
    },
  }
}

export default defineVitestConfig({
  plugins: [react(), tailwindcss(), crx({ manifest }), copyPostmanSandboxPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    pool: 'threads',
  },
})
