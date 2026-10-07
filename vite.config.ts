import { fileURLToPath, URL } from 'node:url'

import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import manifest from './manifest.config.ts'

const postmanLiteDist = fileURLToPath(new URL('./node_modules/postman-lite/dist', import.meta.url))

export default defineVitestConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'postman-lite/core', replacement: `${postmanLiteDist}/core.js` },
      { find: 'postman-lite/style.css', replacement: `${postmanLiteDist}/style.css` },
      { find: /^postman-lite$/, replacement: `${postmanLiteDist}/index.js` },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
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
