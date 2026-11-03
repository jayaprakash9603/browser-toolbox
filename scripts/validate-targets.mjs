#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateTargetBuild } from './release/package.mjs'
import { RELEASE_TARGETS } from './release/targets.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

for (const target of RELEASE_TARGETS) {
  const sourceDir = join(root, target.outputDir)
  const manifest = validateTargetBuild({ sourceDir, target: target.id, version })
  console.log(
    `${target.id}: manifest v${manifest.version}, MV${manifest.manifest_version}, ` +
      `${(manifest.permissions ?? []).length} permissions`,
  )
}

