/**
 * Fail the build if committed simulator code re-introduces WebMobileFirst fingerprints.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const BANNED = [
  { pattern: /webmobilefirst/i, label: 'webmobilefirst' },
  { pattern: /ckejmhbmlajgoklhgbapkiccekfoccmk/i, label: 'extension id' },
  { pattern: /simulator\/mf/i, label: 'simulator/mf' },
  { pattern: /import-mf-simulator/i, label: 'import-mf-simulator' },
  { pattern: /match-mf-devices/i, label: 'match-mf-devices' },
  { pattern: /MF_SIMULATOR_PUBLIC_DIR/i, label: 'MF_SIMULATOR_PUBLIC_DIR' },
  { pattern: /mf-catalog-mockups/i, label: 'mf-catalog-mockups' },
  { pattern: /mf-device-map/i, label: 'mf-device-map' },
  { pattern: /mf-simulator\.generated/i, label: 'mf-simulator.generated' },
  { pattern: /icomoon\.ttf/i, label: 'icomoon.ttf' },
  { pattern: /tbx-sim-icomoon/i, label: 'tbx-sim-icomoon' },
  { pattern: /\\ue9[0-9a-f]{2}/i, label: 'private-use glyphs' },
  { pattern: /WebMobileFirst/i, label: 'WebMobileFirst' },
]

const SKIP = new Set([
  'docs/simulator/audit-de-mf.md',
  'docs/simulator/acceptance-report.md',
])

function scanFile(relPath, hits) {
  if (SKIP.has(relPath)) return
  const abs = join(root, relPath)
  let text
  try {
    text = readFileSync(abs, 'utf8')
  } catch {
    return
  }
  for (const { pattern, label } of BANNED) {
    if (pattern.test(text)) hits.push({ file: relPath, label })
  }
}

function scanDir(relDir, hits) {
  const abs = join(root, relDir)
  let st
  try {
    st = statSync(abs)
  } catch {
    return
  }
  if (st.isFile()) {
    scanFile(relDir, hits)
    return
  }
  const stack = [abs]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      const full = join(dir, entry.name)
      const rel = full.slice(root.length + 1).replace(/\\/g, '/')
      if (entry.isDirectory()) stack.push(full)
      else if (/\.(ts|tsx|js|mjs|json|py)$/.test(entry.name)) scanFile(rel, hits)
    }
  }
}

const hits = []
scanDir('src', hits)
scanDir('tests', hits)
scanDir('public/inject', hits)
scanFile('manifest.config.ts', hits)
scanFile('package.json', hits)
for (const name of readdirSync(join(root, 'scripts'))) {
  if (name === 'check-simulator-fingerprints.mjs') continue
  if (/\.(mjs|js|py)$/.test(name)) scanFile(`scripts/${name}`, hits)
}

if (hits.length) {
  console.error('[simulator-fingerprints] banned patterns found:')
  for (const h of hits) {
    console.error(`  ${h.file} (${h.label})`)
  }
  process.exit(1)
}

console.log('[simulator-fingerprints] OK')