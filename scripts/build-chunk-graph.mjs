import { readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const IMPORT_STATIC = /(?:from\s*|import\s*)["`]\.\/([^"`]+\.js)["`]/g
const IMPORT_DYNAMIC = /import\(\s*["`]\.\/([^"`]+\.js)["`]\s*\)/g

/** @param {string} assetsDir */
export function readChunkImports(file, assetsDir) {
  const path = join(assetsDir, file)
  const text = readFileSync(path, 'utf8')
  const staticDeps = [...text.matchAll(IMPORT_STATIC)].map((m) => m[1])
  const dynamicDeps = [...text.matchAll(IMPORT_DYNAMIC)].map((m) => m[1])
  return {
    static: [...new Set(staticDeps)],
    dynamic: [...new Set(dynamicDeps)],
  }
}

/**
 * @param {string[]} entryFiles chunk filenames under assets/
 * @param {string} assetsDir
 * @param {{ exclude?: Set<string> }} [opts]
 */
export function closureFromEntries(entryFiles, assetsDir, opts = {}) {
  const exclude = opts.exclude ?? new Set()
  /** @type {Map<string, number>} */
  const seen = new Map()
  /** @type {string[]} */
  const queue = [...entryFiles]
  while (queue.length) {
    const file = queue.shift()
    if (!file || seen.has(file) || exclude.has(file)) continue
    const full = join(assetsDir, file)
    if (!existsSync(full)) continue
    seen.set(file, statSync(full).size)
    const { static: deps } = readChunkImports(file, assetsDir)
    for (const dep of deps) queue.push(dep)
  }
  return seen
}

/** @param {string} html */
export function entryScriptFromHtml(html) {
  const m = html.match(/assets\/(index\.html-[^"]+\.js)/)
  return m?.[1] ?? null
}

/** @param {string} loaderText */
export function serviceWorkerEntryFromLoader(loaderText) {
  const m = loaderText.match(/assets\/([^'"]+\.js)/)
  return m?.[1] ?? null
}

/**
 * Side-panel home boot closure: entry + Boot dynamic targets + HomePage from routePreload.
 * @param {string} assetsDir
 */
export function sidePanelHomeBootClosure(assetsDir) {
  const indexHtml = readFileSync(join(assetsDir, '..', 'index.html'), 'utf8')
  const entry = entryScriptFromHtml(indexHtml)
  if (!entry) throw new Error('index.html entry script not found')

  const { dynamic } = readChunkImports(entry, assetsDir)
  const bootDynamic = dynamic.filter(
    (f) =>
      f.startsWith('modules-') ||
      f.startsWith('routePreload-') ||
      f.startsWith('i18n-') ||
      f.startsWith('App-'),
  )
  /** @type {string[]} */
  const extra = []
  for (const mod of bootDynamic) {
    if (!mod.startsWith('routePreload-')) continue
    const { dynamic: routeDynamic } = readChunkImports(mod, assetsDir)
    const home = routeDynamic.find((f) => f.startsWith('HomePage-'))
    if (home) extra.push(home)
  }

  const allEntries = [entry, ...bootDynamic, ...extra]
  return closureFromEntries(allEntries, assetsDir)
}

/** @param {string} assetsDir */
export function serviceWorkerClosure(assetsDir) {
  const loader = readFileSync(join(assetsDir, '..', 'service-worker-loader.js'), 'utf8')
  const swEntry = serviceWorkerEntryFromLoader(loader)
  if (!swEntry) throw new Error('service worker entry not found')
  return closureFromEntries([swEntry], assetsDir)
}

export function totalBytes(map) {
  let n = 0
  for (const size of map.values()) n += size
  return n
}
