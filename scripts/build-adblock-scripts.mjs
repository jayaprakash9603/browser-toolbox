import { build } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entries = {
  cosmetic: 'src/chrome/content/adblock/cosmetic.ts',
  'notifications-main': 'src/chrome/content/adblock/notifications-main.ts',
  'youtube-main': 'src/chrome/content/adblock/youtube/main.ts',
  'youtube-isolated': 'src/chrome/content/adblock/youtube/isolated.ts',
}

for (const [name, entry] of Object.entries(entries)) {
  await build({
    configFile: resolve(root, 'vite.adblock.config.ts'),
    mode: name,
    build: {
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
  console.log(`[adblock] built ${name}.js`)
}
