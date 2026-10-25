#!/usr/bin/env node
/**
 * Vendors React DevTools from facebook/react into public/react-devtools/.
 * Usage: node scripts/react-devtools/vendor.mjs [--download] [--skip-fetch]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { delimiter } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PINNED_SHA = '1d34f91dfde6bba84d08b683aaba164c7194dacb'
const REACT_REMOTE = 'https://github.com/facebook/react.git'
const cacheDir = join(root, 'scripts', 'react-devtools', '.cache', 'react')
const overlayDir = join(root, 'vendor', 'react-devtools', 'overlay')
const outDir = join(root, 'public', 'react-devtools')
const buildOut = join(outDir, 'build')

const args = new Set(process.argv.slice(2))
const useDownload = args.has('--download')
const skipFetch = args.has('--skip-fetch')
const skipInstall = args.has('--skip-install')
const webpackOnly = args.has('--webpack-only')

function run(cmd, cwd, env = {}, { yarnInstall = false } = {}) {
  console.log(`[react-devtools:vendor] ${cmd}`)
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH'
  const bins = [join(cwd, 'node_modules', '.bin'), join(cacheDir, 'node_modules', '.bin')].filter(
    (p) => existsSync(p),
  )
  const pathPrefix = bins.length ? `${bins.join(delimiter)}${delimiter}` : ''
  // Yarn skips devDependencies when NODE_ENV=production (common in extension CI).
  const mergedEnv = { ...process.env, ...env }
  if (yarnInstall && mergedEnv.NODE_ENV === 'production') {
    mergedEnv.NODE_ENV = 'development'
  }
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: {
      ...mergedEnv,
      [pathKey]: `${pathPrefix}${process.env[pathKey] ?? ''}`,
    },
    shell: process.platform === 'win32',
  })
}

function copyOverlayIntoClone() {
  const extOverlay = join(overlayDir, 'packages', 'react-devtools-extensions')
  const targetExt = join(cacheDir, 'packages', 'react-devtools-extensions')
  if (!existsSync(extOverlay)) {
    throw new Error(`Missing overlay at ${extOverlay}`)
  }
  cpSync(join(extOverlay, 'webpack.browser-toolbox.config.js'), join(targetExt, 'webpack.browser-toolbox.config.js'))
  cpSync(join(extOverlay, 'src', 'browserToolbox'), join(targetExt, 'src', 'browserToolbox'), {
    recursive: true,
  })
}

function ensureReactClone() {
  if (skipFetch && existsSync(join(cacheDir, 'packages', 'react-devtools-extensions'))) {
    console.log('[react-devtools:vendor] using cached clone (--skip-fetch)')
    copyOverlayIntoClone()
    return
  }
  mkdirSync(dirname(cacheDir), { recursive: true })
  if (existsSync(cacheDir)) {
    try {
      rmSync(cacheDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })
    } catch (error) {
      console.error(
        '[react-devtools:vendor] could not remove cache (close other yarn/node using it). Try --skip-fetch.',
      )
      throw error
    }
  }
  mkdirSync(cacheDir, { recursive: true })
  run('git init', cacheDir)
  run(`git fetch --depth 1 ${REACT_REMOTE} ${PINNED_SHA}`, cacheDir)
  run('git checkout FETCH_HEAD', cacheDir)
  copyOverlayIntoClone()
}

function installDeps() {
  run(
    'npx yarn@1.22.22 install --frozen-lockfile --network-timeout 600000 --ignore-scripts --check-files',
    cacheDir,
    {},
    { yarnInstall: true },
  )
  verifyMonorepoTooling()
}

function verifyMonorepoTooling() {
  const required = ['tmp', 'fs-extra', 'chalk']
  for (const name of required) {
    const pkgDir = join(cacheDir, 'node_modules', name)
    if (!existsSync(join(pkgDir, 'package.json'))) {
      throw new Error(
        `Missing ${name} in React monorepo node_modules. ` +
          'Run vendor without --skip-install, and avoid NODE_ENV=production during install.',
      )
    }
  }
}

function buildExperimentalReact() {
  const experimentalDir = join(cacheDir, 'build', 'oss-experimental')
  if (existsSync(join(experimentalDir, 'react'))) {
    console.log('[react-devtools:vendor] experimental React build already present')
    return
  }
  if (useDownload) {
    const releaseDir = join(cacheDir, 'scripts', 'release')
    run('npx yarn@1.22.22 install --ignore-scripts', releaseDir, {}, { yarnInstall: true })
    run(`node scripts/release/download-experimental-build.js --commit=${PINNED_SHA}`, cacheDir)
  } else {
    const pkgs =
      'react/index,react/jsx,react/compiler-runtime,react-dom/index,react-dom/client,react-dom/unstable_testing,react-dom/test-utils,react-is,react-debug-tools,scheduler,react-test-renderer,react-refresh,react-art'
    run(
      `npx yarn@1.22.22 build ${pkgs} --type=NODE --release-channel=experimental`,
      cacheDir,
    )
  }
}

function resolveWebpackBin(extDir) {
  const candidates = [
    join(cacheDir, 'node_modules', 'webpack', 'bin', 'webpack.js'),
    join(extDir, 'node_modules', 'webpack', 'bin', 'webpack.js'),
  ]
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error('webpack not found; run vendor without --skip-install first')
  return found
}

function ensureWebpackPluginDeps() {
  const terser = join(cacheDir, 'node_modules', 'terser-webpack-plugin', 'package.json')
  if (!existsSync(terser)) {
    console.log('[react-devtools:vendor] installing terser-webpack-plugin (required by upstream webpack.config)')
    run('npx yarn@1.22.22 add -D -W terser-webpack-plugin@5.3.14', cacheDir, {}, { yarnInstall: true })
  }
}

function webpackBuild() {
  ensureWebpackPluginDeps()
  const extDir = join(cacheDir, 'packages', 'react-devtools-extensions')
  const webpackBin = resolveWebpackBin(extDir)
  run(`node "${webpackBin}" --config webpack.browser-toolbox.config.js`, extDir, {
    NODE_ENV: 'production',
    IS_CHROME: 'true',
  })
}

function readDevToolsVersion(extDir) {
  try {
    const manifest = JSON.parse(readFileSync(join(extDir, 'chrome', 'manifest.json'), 'utf8'))
    return manifest.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

function publishArtifacts() {
  const extDir = join(cacheDir, 'packages', 'react-devtools-extensions')
  const built = join(extDir, 'build')
  if (!existsSync(built)) {
    throw new Error(`Webpack output missing at ${built}`)
  }
  mkdirSync(outDir, { recursive: true })
  rmSync(buildOut, { recursive: true, force: true })
  mkdirSync(buildOut, { recursive: true })
  for (const name of readdirSync(built)) {
    if (!name.endsWith('.js')) continue
    cpSync(join(built, name), join(buildOut, name))
  }
  const licenseSrc = join(cacheDir, 'LICENSE')
  if (existsSync(licenseSrc)) {
    cpSync(licenseSrc, join(outDir, 'LICENSE'))
  }
  const artifacts = readdirSync(buildOut).filter((f) => f.endsWith('.js'))
  writeFileSync(
    join(outDir, 'REVISION.json'),
    `${JSON.stringify(
      {
        sha: PINNED_SHA,
        devtoolsVersion: readDevToolsVersion(extDir),
        builtAt: new Date().toISOString(),
        artifacts,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`[react-devtools:vendor] published ${artifacts.length} files to public/react-devtools/build`)
}

function main() {
  if (webpackOnly) {
    copyOverlayIntoClone()
  } else {
    ensureReactClone()
    if (!skipInstall) installDeps()
    buildExperimentalReact()
  }
  webpackBuild()
  publishArtifacts()
}

main()
