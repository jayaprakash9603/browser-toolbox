import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'node_modules/@wppconnect/wa-js/dist/wppconnect-wa.js')
const outDir = resolve(root, 'public/sites/vendor')
const dest = resolve(outDir, 'wppconnect-wa.js')

mkdirSync(outDir, { recursive: true })
copyFileSync(src, dest)
console.log('[wa-vendor] copied wppconnect-wa.js')
