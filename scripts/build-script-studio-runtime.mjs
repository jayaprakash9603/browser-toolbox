import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'src/chrome/background/script-studio/runtime/gm-runtime.js')
const outDir = resolve(root, 'public/script-studio')
const dest = resolve(outDir, 'gm-runtime.js')

mkdirSync(outDir, { recursive: true })
copyFileSync(src, dest)
console.log('Built', dest)
