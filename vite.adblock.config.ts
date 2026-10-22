import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  publicDir: false,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'public/adblock/scripts',
    emptyOutDir: mode === 'cosmetic',
    lib: false,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: `${mode}.js`,
        inlineDynamicImports: true,
      },
    },
    // These run in every matching frame, so smaller bundles mean less parse/compile work per page.
    minify: true,
    sourcemap: false,
  },
}))
