import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const candidates = [
  resolve(root, 'node_modules/postman-lite/dist/script-sandbox.html'),
  resolve(root, '../postman-lite/dist/script-sandbox.html'),
]
const source = candidates.find((path) => existsSync(path))
const dest = resolve(root, 'public/script-sandbox.html')

if (!source) {
  console.warn(
    'postman-lite script-sandbox.html not found; run npm run build in postman-lite first.',
  )
  process.exit(0)
}

copyFileSync(source, dest)
