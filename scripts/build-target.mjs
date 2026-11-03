#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requested = process.argv[2] ?? 'chromium'
const targets = requested === 'all' ? ['chromium', 'firefox'] : [requested]

if (targets.some((target) => !['chromium', 'firefox'].includes(target))) {
  console.error('Usage: node scripts/build-target.mjs <chromium|firefox|all>')
  process.exit(1)
}

for (const target of targets) {
  const env = {
    ...process.env,
    BUILD_TARGET: target,
    BUILD_OUTPUT_DIR: resolve(root, 'dist', target),
  }
  const result =
    process.platform === 'win32'
      ? spawnSync('npm run build', { cwd: root, env, stdio: 'inherit', shell: true })
      : spawnSync('npm', ['run', 'build'], { cwd: root, env, stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

