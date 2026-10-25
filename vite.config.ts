import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { searchForWorkspaceRoot, type Plugin } from 'vite'
import { configDefaults, defineConfig as defineVitestConfig } from 'vitest/config'
import manifest from './manifest.config.ts'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const postmanLiteDist = fileURLToPath(new URL('./node_modules/postman-lite/dist', import.meta.url))

const protectionThreatsGenerated = (
  JSON.parse(readFileSync(join(rootDir, 'public/protection/threats.json'), 'utf8')) as { generated: string }
).generated

/** jsPDF optional deps are unused in this extension (no .html() / SVG pipeline). */
const jspdfOptionalStub = fileURLToPath(new URL('./src/shims/jspdf-optional-stub.ts', import.meta.url))

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
  define: {
    __PROTECTION_THREATS_GENERATED__: JSON.stringify(protectionThreatsGenerated),
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'postman-lite/core', replacement: `${postmanLiteDist}/core.js` },
      { find: /^postman-lite\/style\.css(\?.*)?$/, replacement: `${postmanLiteDist}/style.css$1` },
      { find: /^postman-lite$/, replacement: `${postmanLiteDist}/index.js` },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^html2canvas$/, replacement: jspdfOptionalStub },
      { find: /^dompurify$/, replacement: jspdfOptionalStub },
      { find: /^canvg$/, replacement: jspdfOptionalStub },
    ],
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      input: {
        offscreen: 'offscreen.html',
        blocked: 'blocked.html',
        recorder: 'recorder.html',
        recording: 'recording.html',
        'react-devtools-panel': 'react-devtools-panel.html',
      },
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/')
          if (norm.includes('/src/core/script-studio/')) return 'script-studio-core'
        },
      },
    },
  },
  server: {
    fs: {
      // postman-lite may be linked from outside the workspace, and Vite refuses `?inline`
      // reads of files outside the allow list.
      allow: [searchForWorkspaceRoot(process.cwd()), realpathSync(postmanLiteDist)],
    },
  },
  optimizeDeps: {
    include: ['postman-lite'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      ...configDefaults.exclude,
      'universal-form-autofill/**',
      'website/**',
      'scripts/react-devtools/**',
    ],
    css: false,
    pool: 'threads',
  },
})
