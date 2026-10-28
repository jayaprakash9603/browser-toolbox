import { build } from 'vite'
import { rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adblockEntries = {
  cosmetic: 'src/chrome/content/adblock/cosmetic.ts',
  'cookies-reject': 'src/chrome/content/adblock/cookies-reject.ts',
  'notifications-main': 'src/chrome/content/adblock/notifications-main.ts',
  'popups-main': 'src/chrome/content/adblock/popups-main.ts',
  'scriptlets-isolated': 'src/chrome/content/adblock/scriptlets/isolated.ts',
  'scriptlets-main': 'src/chrome/content/adblock/scriptlets/main.ts',
  'youtube-isolated': 'src/chrome/content/adblock/youtube/isolated.ts',
}

const protectionEntries = {
  heuristics: 'src/chrome/content/protection/heuristics.ts',
  'guard-scam': 'src/chrome/content/protection/guard-scam.ts',
  'guard-clipboard': 'src/chrome/content/protection/guard-clipboard.ts',
  'guard-notify': 'src/chrome/content/protection/guard-notify.ts',
}

const sitesEntries = {
  'yt-isolated': 'src/chrome/content/sites/youtube/isolated.ts',
  'yt-main': 'src/chrome/content/sites/youtube/main.ts',
  'wa-isolated': 'src/chrome/content/sites/whatsapp/isolated.ts',
  'wa-main': 'src/chrome/content/sites/whatsapp/main.ts',
  'ig-isolated': 'src/chrome/content/sites/instagram/isolated.ts',
  'ig-main': 'src/chrome/content/sites/instagram/main.ts',
  'pip-auto': 'src/chrome/content/pip/auto.ts',
}

const interceptorEntries = {
  isolated: 'src/chrome/content/interceptor/isolated.ts',
  main: 'src/chrome/content/interceptor/main.ts',
}

async function buildEntry(name, entry, outDir, format = 'iife') {
  await build({
    configFile: resolve(root, 'vite.adblock.config.ts'),
    mode: name,
    logLevel: 'warn',
    build: {
      outDir: resolve(root, outDir),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(root, entry),
        preserveEntrySignatures: format === 'es' ? 'exports-only' : false,
        output: {
          format,
          entryFileNames: `${name}.js`,
          inlineDynamicImports: true,
        },
      },
    },
  })
  console.log(`[page-scripts] built ${outDir}/${name}.js`)
}

const formMemoryEntries = {
  page: 'src/chrome/content/formMemory/page.ts',
}

const groups = [
  [adblockEntries, 'public/adblock/scripts'],
  [protectionEntries, 'public/protection/scripts'],
  [sitesEntries, 'public/sites/scripts'],
  [interceptorEntries, 'public/interceptor/scripts'],
  [formMemoryEntries, 'public/form-memory/scripts'],
]

// Every build writes into a shared folder, so stale adblock scripts are cleared once up front instead.
rmSync(resolve(root, 'public/adblock/scripts'), { recursive: true, force: true })

await Promise.all([
  ...groups.flatMap(([entries, outDir]) =>
    Object.entries(entries).map(([name, entry]) => buildEntry(name, entry, outDir)),
  ),
  // Imported on demand by cosmetic.js, so it is an ES module rather than a content script.
  buildEntry('procedural', 'src/chrome/content/adblock/procedural.ts', 'public/adblock/scripts', 'es'),
])
