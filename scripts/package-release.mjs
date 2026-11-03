#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { packageTarget, writeChecksums } from './release/package.mjs'
import { renderStoreNotes, slug } from './release/versioning.mjs'
import { RELEASE_TARGETS } from './release/targets.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const messages = JSON.parse(
  readFileSync(join(root, 'public', '_locales', 'en', 'messages.json'), 'utf8'),
)
const extensionSlug = slug(messages.extName?.message || 'extension')
const releaseDir = join(root, 'releases', `v${pkg.version}`)
mkdirSync(releaseDir, { recursive: true })

const artifacts = []
for (const target of RELEASE_TARGETS) {
  const result = packageTarget({
    sourceDir: join(root, target.outputDir),
    releaseDir,
    target: target.id,
    browsers: target.browsers,
    slug: extensionSlug,
    version: pkg.version,
  })
  artifacts.push(...result.artifacts)
  console.log(`${target.id}: ${result.artifacts.map((path) => path.split('\\').pop()).join(', ')}`)
}

const checksumsPath = join(releaseDir, 'SHA256SUMS.txt')
writeChecksums(artifacts, checksumsPath)
const notesPath = join(releaseDir, `${extensionSlug}-v${pkg.version}-notes.txt`)
writeFileSync(notesPath, renderStoreNotes(pkg.version, []))

console.log(`Artifacts written to ${releaseDir}`)
console.log(`Checksums written to ${checksumsPath}`)

