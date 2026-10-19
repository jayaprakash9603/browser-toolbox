import { readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const indexPath = join(dist, 'index.html')
const MAX_STARTUP_JS_BYTES = 450 * 1024
const BANNED = [/postman-lite/i, /\bcmdk\b/]

const html = readFileSync(indexPath, 'utf8')
const assets = [
  ...html.matchAll(/(?:src|href)="(\/?assets\/[^"]+\.js)"/g),
].map((match) => match[1].replace(/^\//, ''))

const unique = [...new Set(assets)]
let totalJs = 0
const violations = []

for (const rel of unique) {
  const path = join(dist, rel)
  const text = readFileSync(path, 'utf8')
  totalJs += statSync(path).size
  for (const pattern of BANNED) {
    if (pattern.test(text)) violations.push(`${rel} matches ${pattern}`)
  }
}

if (totalJs > MAX_STARTUP_JS_BYTES) {
  console.error(
    `[startup-budget] JS preloaded by index.html is ${totalJs} bytes (max ${MAX_STARTUP_JS_BYTES})`,
  )
  process.exit(1)
}

if (violations.length) {
  console.error('[startup-budget] banned modules in startup chunks:\n', violations.join('\n'))
  process.exit(1)
}

console.log(`[startup-budget] ok — ${unique.length} chunks, ${totalJs} bytes`)
