import { build } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adblockEntries = {
  cosmetic: 'src/chrome/content/adblock/cosmetic.ts',
  'cookies-reject': 'src/chrome/content/adblock/cookies-reject.ts',
  'notifications-main': 'src/chrome/content/adblock/notifications-main.ts',
  'popups-main': 'src/chrome/content/adblock/popups-main.ts',
  'youtube-main': 'src/chrome/content/adblock/youtube/main.ts',
  'youtube-isolated': 'src/chrome/content/adblock/youtube/isolated.ts',
}

const protectionEntries = {
  heuristics: 'src/chrome/content/protection/heuristics.ts',
  'guard-scam': 'src/chrome/content/protection/guard-scam.ts',
  'guard-clipboard': 'src/chrome/content/protection/guard-clipboard.ts',
  'guard-notify': 'src/chrome/content/protection/guard-notify.ts',
}

async function buildEntry(name, entry, outDir) {
  await build({
    configFile: resolve(root, 'vite.adblock.config.ts'),
    mode: name,
    build: {
      outDir: resolve(root, outDir),
      emptyOutDir: name === 'cosmetic',
      rollupOptions: {
        input: resolve(root, entry),
        output: {
          format: 'iife',
          entryFileNames: `${name}.js`,
          inlineDynamicImports: true,
        },
      },
    },
  })
  console.log(`[page-scripts] built ${outDir}/${name}.js`)
}

for (const [name, entry] of Object.entries(adblockEntries)) {
  await buildEntry(name, entry, 'public/adblock/scripts')
}
const sitesEntries = {
  'yt-isolated': 'src/chrome/content/sites/youtube/isolated.ts',
  'yt-main': 'src/chrome/content/sites/youtube/main.ts',
  'wa-isolated': 'src/chrome/content/sites/whatsapp/isolated.ts',
  'wa-main': 'src/chrome/content/sites/whatsapp/main.ts',
  'pip-auto': 'src/chrome/content/pip/auto.ts',
}

for (const [name, entry] of Object.entries(protectionEntries)) {
  await buildEntry(name, entry, 'public/protection/scripts')
}
for (const [name, entry] of Object.entries(sitesEntries)) {
  await buildEntry(name, entry, 'public/sites/scripts')
}
