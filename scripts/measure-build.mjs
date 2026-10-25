import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

import {
  closureFromEntries,
  entryScriptFromHtml,
  readChunkImports,
  serviceWorkerClosure,
  sidePanelHomeBootClosure,
  totalBytes,
} from './build-chunk-graph.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const assets = join(dist, 'assets')

function walkFiles(dir, pred) {
  /** @type {{ path: string, size: number }[]} */
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkFiles(full, pred))
    else if (!pred || pred(full)) out.push({ path: full, size: statSync(full).size })
  }
  return out
}

function zipEstimate(files) {
  let raw = 0
  let deflated = 0
  for (const { size, path } of files) {
    raw += size
    const buf = readFileSync(path)
    deflated += deflateSync(buf).length
  }
  return { raw, deflated, files: files.length, headers: files.length * 130 }
}

function topDir(relPath) {
  return relPath.split(/[/\\]/)[0]
}

const allFiles = walkFiles(dist, (p) => !p.includes(`${dist}_metadata`))
const byTop = new Map()
for (const f of allFiles) {
  const rel = f.path.slice(dist.length + 1)
  const top = topDir(rel)
  byTop.set(top, (byTop.get(top) ?? 0) + f.size)
}

const jsFiles = allFiles.filter((f) => /\.(m?js)$/i.test(f.path))
const cssFiles = allFiles.filter((f) => f.path.endsWith('.css'))

let homeBoot = null
let swClosure = null
try {
  homeBoot = sidePanelHomeBootClosure(assets)
  swClosure = serviceWorkerClosure(assets)
} catch (e) {
  console.warn('[measure-build] chunk graph:', e.message)
}

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8')
const entry = entryScriptFromHtml(indexHtml)
let syncEntryBytes = 0
if (entry) {
  const c = closureFromEntries([entry], assets)
  syncEntryBytes = totalBytes(c)
}

const globals = cssFiles.find((f) => /globals-/.test(f.path))

console.log('=== One Panel build metrics ===')
console.log(`dist (excl. paths containing _metadata): ${allFiles.length} files, ${allFiles.reduce((s, f) => s + f.size, 0)} bytes`)
console.log('By top-level dir:')
;[...byTop.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([k, v]) => console.log(`  ${k}: ${v} bytes`))

const zip = zipEstimate(allFiles.map((f) => ({ path: f.path, size: f.size })))
console.log(`Zip estimate (deflate per file): ${zip.deflated + zip.headers} bytes (~${((zip.deflated + zip.headers) / 1024 / 1024).toFixed(2)} MB)`)

console.log(`JS total: ${jsFiles.reduce((s, f) => s + f.size, 0)} bytes (${jsFiles.length} files)`)
console.log(`CSS total: ${cssFiles.reduce((s, f) => s + f.size, 0)} bytes`)
if (globals) console.log(`globals.css: ${globals.size} bytes`)

if (entry) console.log(`Side panel sync entry closure: ${syncEntryBytes} bytes`)
if (homeBoot) console.log(`Side panel home boot JS: ${homeBoot.size} files, ${totalBytes(homeBoot)} bytes`)
if (swClosure) console.log(`Service worker static closure: ${swClosure.size} files, ${totalBytes(swClosure)} bytes`)
