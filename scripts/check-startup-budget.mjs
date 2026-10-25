import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  serviceWorkerClosure,
  sidePanelHomeBootClosure,
  totalBytes,
} from './build-chunk-graph.mjs'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const assets = join(dist, 'assets')

/** Measured home boot ~986 KB; allow headroom for i18n/catalog growth. */
/** Measured home boot ~1.08 MB after script-studio-core split (was ~986 KB). */
const MAX_HOME_BOOT_JS = 1_100_000
/** After SW leak fix, measured ~423 KB static closure. */
const MAX_SERVICE_WORKER_JS = 480 * 1024

const BANNED_IN_HOME = [/postman-lite/i, /\bcmdk\b/]

const BANNED_SW_CHUNK_PREFIX = [/^Tool-/, /^CodeEditor-/]
const BANNED_SW_CONTENT = [/cm-scroller/, /framer-motion/, /js_beautify/, /postman-lite/i]

let failed = false

function fail(msg) {
  console.error(`[startup-budget] ${msg}`)
  failed = true
}

let homeBoot
try {
  homeBoot = sidePanelHomeBootClosure(assets)
} catch (error) {
  fail(`side panel boot graph: ${error.message}`)
  process.exit(1)
}

const homeBytes = totalBytes(homeBoot)
if (homeBytes > MAX_HOME_BOOT_JS) {
  fail(`home boot JS is ${homeBytes} bytes (max ${MAX_HOME_BOOT_JS})`)
}

const homeViolations = []
for (const file of homeBoot.keys()) {
  const text = readFileSync(join(assets, file), 'utf8')
  for (const pattern of BANNED_IN_HOME) {
    if (pattern.test(text)) homeViolations.push(`${file} matches ${pattern}`)
  }
}
if (homeViolations.length) {
  fail(`banned modules in home boot:\n  ${homeViolations.join('\n  ')}`)
}

let swClosure
try {
  swClosure = serviceWorkerClosure(assets)
} catch (error) {
  fail(`service worker graph: ${error.message}`)
  process.exit(1)
}

const swBytes = totalBytes(swClosure)
if (swBytes > MAX_SERVICE_WORKER_JS) {
  fail(`service worker static JS is ${swBytes} bytes (max ${MAX_SERVICE_WORKER_JS})`)
}

for (const file of swClosure.keys()) {
  for (const pattern of BANNED_SW_CHUNK_PREFIX) {
    if (pattern.test(file)) fail(`service worker must not load UI chunk ${file}`)
  }
  const text = readFileSync(join(assets, file), 'utf8')
  for (const pattern of BANNED_SW_CONTENT) {
    if (pattern.test(text)) fail(`service worker chunk ${file} matches banned UI library ${pattern}`)
  }
}

if (failed) process.exit(1)

console.log(
  `[startup-budget] ok — home boot ${homeBoot.size} chunks / ${homeBytes} bytes; SW ${swClosure.size} chunks / ${swBytes} bytes`,
)
