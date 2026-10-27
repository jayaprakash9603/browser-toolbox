import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = resolve(root, 'node_modules/@wppconnect/wa-js')
const outDir = resolve(root, 'public/sites/vendor')

mkdirSync(outDir, { recursive: true })
copyFileSync(resolve(pkg, 'dist/wppconnect-wa.js'), resolve(outDir, 'wppconnect-wa.js'))
copyFileSync(resolve(pkg, 'dist/wppconnect-wa.js.LICENSE.txt'), resolve(outDir, 'wppconnect-wa.js.LICENSE.txt'))
copyFileSync(resolve(pkg, 'LICENSE'), resolve(outDir, 'wppconnect-LICENSE.txt'))
console.log('[wa-vendor] copied wppconnect-wa.js and licenses')
