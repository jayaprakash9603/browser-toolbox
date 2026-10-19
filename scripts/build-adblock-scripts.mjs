import { build } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const adblockEntries = {
  cosmetic: 'src/chrome/content/adblock/cosmetic.ts',
  'notifications-main': 'src/chrome/content/adblock/notifications-main.ts',
  'popups-main': 'src/chrome/content/adblock/popups-main.ts',
  'youtube-main': 'src/chrome/content/adblock/youtube/main.ts',
  'youtube-isolated': 'src/chrome/content/adblock/youtube/isolated.ts',
}

const protectionEntries = {
  heuristics: 'src/chrome/content/protection/heuristics.ts',
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
for (const [name, entry] of Object.entries(protectionEntries)) {
  await buildEntry(name, entry, 'public/protection/scripts')
}
