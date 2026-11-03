import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, relative } from 'node:path'

import { zipSync } from 'fflate'

const STORE_LIMIT_BYTES = 2 * 1024 ** 3
const STORED_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|wasm|zip|gz|br|mp3|mp4|webm)$/i

function listFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listFiles(full))
    else files.push(full)
  }
  return files
}

function normalizeManifestPath(path) {
  return path.replace(/^[/\\]+/, '').split('\\').join('/')
}

function pathExists(root, path) {
  return existsSync(join(root, normalizeManifestPath(path)))
}

function referencedFiles(manifest) {
  const files = new Set()
  for (const path of Object.values(manifest.icons ?? {})) {
    if (typeof path === 'string') files.add(path)
  }
  for (const path of [
    manifest.action?.default_popup,
    manifest.side_panel?.default_path,
    manifest.sidebar_action?.default_panel,
    manifest.devtools_page,
  ]) {
    if (typeof path === 'string') files.add(path)
  }
  const background = manifest.background
  if (background?.service_worker) files.add(background.service_worker)
  for (const path of background?.scripts ?? []) files.add(path)
  for (const contentScript of manifest.content_scripts ?? []) {
    for (const path of contentScript.js ?? []) files.add(path)
    for (const path of contentScript.css ?? []) files.add(path)
  }
  return files
}

export function readManifest(sourceDir) {
  const manifestPath = join(sourceDir, 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} is missing`)
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

export function validateTargetBuild({ sourceDir, target, version }) {
  const manifest = readManifest(sourceDir)
  const problems = []

  if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3')
  if (manifest.version !== version) {
    problems.push(`manifest version is ${manifest.version}, expected ${version}`)
  }
  if (target === 'chromium') {
    if (!manifest.background?.service_worker) problems.push('Chromium build needs background.service_worker')
    if (manifest.sidebar_action) problems.push('Chromium build must not include sidebar_action')
  }
  if (target === 'firefox') {
    if (!manifest.background?.scripts?.length) problems.push('Firefox build needs background.scripts')
    if (manifest.background?.service_worker) problems.push('Firefox build must not include service_worker')
    if (!manifest.sidebar_action?.default_panel) problems.push('Firefox build needs sidebar_action.default_panel')
    if (!manifest.browser_specific_settings?.gecko?.id) {
      problems.push('Firefox build needs browser_specific_settings.gecko.id')
    }
  }

  for (const path of referencedFiles(manifest)) {
    if (!pathExists(sourceDir, path)) problems.push(`manifest reference is missing: ${path}`)
  }

  const entryFiles = [
    manifest.background?.service_worker,
    ...(manifest.background?.scripts ?? []),
    manifest.side_panel?.default_path,
    manifest.sidebar_action?.default_panel,
    manifest.devtools_page,
  ].filter(Boolean)
  const devMarkers = /localhost:\d+|@vite\/client|CRXJS DEV MODE/
  for (const path of entryFiles) {
    const full = join(sourceDir, normalizeManifestPath(path))
    if (devMarkers.test(readFileSync(full, 'utf8'))) {
      problems.push(`${path} points at a development server`)
    }
  }

  if (problems.length) {
    throw new Error(`The ${target} build is not ready to package:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`)
  }
  return manifest
}

export function buildZip(sourceDir, zipPath) {
  const files = {}
  let count = 0
  let raw = 0
  for (const full of listFiles(sourceDir)) {
    const path = relative(sourceDir, full).split('\\').join('/')
    if (path.split('/').some((part) => part.startsWith('.')) || /\.map$/.test(path)) continue
    if (/(^|\/)Thumbs\.db$/i.test(path) || path === '_metadata' || path.startsWith('_metadata/')) continue
    const data = readFileSync(full)
    files[path] = [new Uint8Array(data), { level: STORED_EXTENSIONS.test(path) ? 0 : 9 }]
    count += 1
    raw += data.length
  }
  const zipped = zipSync(files)
  if (zipped.length > STORE_LIMIT_BYTES) {
    throw new Error(`The package is larger than the 2 GB Chrome Web Store limit: ${zipPath}`)
  }
  mkdirSync(join(zipPath, '..'), { recursive: true })
  writeFileSync(zipPath, zipped)
  return {
    count,
    raw,
    size: zipped.length,
    sha256: createHash('sha256').update(zipped).digest('hex'),
  }
}

export function packageTarget({ sourceDir, releaseDir, target, browsers, slug, version }) {
  const manifest = validateTargetBuild({ sourceDir, target, version })
  const [primaryBrowser, ...aliases] = browsers
  const primaryPath = join(releaseDir, `${slug}-v${version}-${primaryBrowser}.zip`)
  const zip = buildZip(sourceDir, primaryPath)
  const artifacts = [primaryPath]
  for (const browser of aliases) {
    const aliasPath = join(releaseDir, `${slug}-v${version}-${browser}.zip`)
    copyFileSync(primaryPath, aliasPath)
    artifacts.push(aliasPath)
  }
  return { artifacts, manifest, zip }
}

export function writeChecksums(paths, outputPath) {
  const lines = paths.map((path) => {
    const hash = createHash('sha256').update(readFileSync(path)).digest('hex')
    return `${hash}  ${basename(path)}`
  })
  writeFileSync(outputPath, `${lines.join('\n')}\n`)
}

