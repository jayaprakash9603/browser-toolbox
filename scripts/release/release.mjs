#!/usr/bin/env node
/**
 * Builds a Chrome Web Store release: picks the next version from the commits since the last
 * `vX.Y.Z` tag, writes it to package.json, runs the production build, verifies dist/, zips it
 * and records the release in CHANGELOG.md with a commit and tag.
 *
 *   node scripts/release/release.mjs [auto|major|minor|patch|X.Y.Z] [options]
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

import { zipSync } from 'fflate'

import {
  BUMPS,
  isChromeVersion,
  parseCommit,
  prependChangelog,
  renderChangelog,
  renderStoreNotes,
  resolveNextVersion,
  slug,
  summarize,
} from './versioning.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'releases')
const VERSION_FILES = ['package.json', 'package-lock.json']
const CHANGELOG = 'CHANGELOG.md'
const STORE_LIMIT_BYTES = 2 * 1024 ** 3
const STORED_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|wasm|zip|gz|br|mp3|mp4|webm)$/i

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
const bold = color('1')
const dim = color('2')
const green = color('32')
const yellow = color('33')
const red = color('31')
const cyan = color('36')

const step = (text) => console.log(`\n${cyan('›')} ${bold(text)}`)
const info = (text) => console.log(`  ${text}`)
const warn = (text) => console.log(`  ${yellow('!')} ${text}`)

class ReleaseError extends Error {}

const HELP = `
${bold('One Panel release')}

  release.bat                 work out the version from your commits and release
  release.bat minor           force a bump: major | minor | patch
  release.bat 1.0.0           release an exact version
  release.bat --dry-run       show what would happen without changing anything

${bold('Version rules')} (commits since the last vX.Y.Z tag)
  feat!: ... or "BREAKING CHANGE:" in the body   major  1.4.2 -> 2.0.0
  feat: ...                                     minor  1.4.2 -> 1.5.0
  fix:, perf:, chore:, anything else            patch  1.4.2 -> 1.4.3
  No tag yet: the first release ships the version already in package.json.

${bold('Options')}
  --dry-run      plan only: no files, build, commit or tag
  --yes, -y      don't ask for confirmation
  --test         run lint and the test suite before building
  --push         push the release commit and tag to origin
  --no-commit    build and zip, but leave versioning changes uncommitted and untagged
  --allow-dirty  release even with uncommitted changes to tracked files
  --help         show this help
`

function parseArgs(argv) {
  const options = { request: 'auto', dryRun: false, yes: false, test: false, push: false, commit: true, allowDirty: false, help: false }
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--yes' || arg === '-y') options.yes = true
    else if (arg === '--test') options.test = true
    else if (arg === '--push') options.push = true
    else if (arg === '--no-commit') options.commit = false
    else if (arg === '--allow-dirty') options.allowDirty = true
    else if (arg === '--help' || arg === '-h' || arg === '/?') options.help = true
    else if (arg === 'auto' || BUMPS.includes(arg) || isChromeVersion(arg.replace(/^v/, ''))) options.request = arg.replace(/^v/, '')
    else throw new ReleaseError(`Unknown argument "${arg}". Run release.bat --help for usage.`)
  }
  if (options.push && !options.commit) throw new ReleaseError('--push needs the release commit; drop --no-commit.')
  return options
}

function git(args, { allowFail = false, raw = false } = {}) {
  try {
    const output = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return raw ? output : output.trim()
  } catch (error) {
    if (allowFail) return null
    throw new ReleaseError(`git ${args.join(' ')} failed:\n${error.stderr || error.message}`)
  }
}

function run(command, args) {
  console.log(dim(`  $ ${[command, ...args].join(' ')}`))
  // npm is a .cmd shim on Windows, so it needs a shell; args here are fixed script names.
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args].join(' '), { cwd: ROOT, stdio: 'inherit', shell: true })
      : spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) throw new ReleaseError(`${command} ${args.join(' ')} failed (exit code ${result.status ?? result.signal}).`)
}

/** Tracked files with changes, and untracked files, from `git status`. */
function workingTree() {
  const tracked = new Set()
  const untracked = []
  for (const line of (git(['status', '--porcelain', '--untracked-files=all'], { raw: true }) ?? '').split('\n')) {
    if (!line.trim()) continue
    const path = line.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')
    if (line.startsWith('??')) untracked.push(path)
    else tracked.add(path)
  }
  return { tracked, untracked }
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
}

function extensionName() {
  try {
    const messages = JSON.parse(readFileSync(join(ROOT, 'public', '_locales', 'en', 'messages.json'), 'utf8'))
    return messages.extName?.message || 'extension'
  } catch {
    return 'extension'
  }
}

function lastReleaseTag() {
  const tag = git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'], { allowFail: true })
  return tag && isChromeVersion(tag.slice(1)) ? tag : null
}

function commitsSince(tag) {
  const range = tag ? [`${tag}..HEAD`] : ['HEAD']
  const log = git(['log', ...range, '--no-merges', '--format=%H%x1f%s%x1f%b%x1e']) ?? ''
  return log
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body] = entry.split('\x1f')
      return parseCommit({ hash, subject, body })
    })
}

function writeVersion(version) {
  const pkgPath = join(ROOT, 'package.json')
  const pkgText = readFileSync(pkgPath, 'utf8')
  const updated = pkgText.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`)
  if (updated === pkgText && !pkgText.includes(`"version": "${version}"`)) throw new ReleaseError('Could not find "version" in package.json.')
  writeFileSync(pkgPath, updated)

  const lockPath = join(ROOT, 'package-lock.json')
  if (existsSync(lockPath)) {
    const lockText = readFileSync(lockPath, 'utf8')
    const lockUpdated = lockText
      .replace(/^(\{\s*"name"\s*:\s*"[^"]*",\s*"version"\s*:\s*")[^"]*"/, `$1${version}"`)
      .replace(/("packages"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"[^"]*",\s*"version"\s*:\s*")[^"]*"/, `$1${version}"`)
    const lock = JSON.parse(lockUpdated)
    if (lock.version !== version || (lock.packages?.[''] && lock.packages[''].version !== version)) {
      throw new ReleaseError('Could not update the version in package-lock.json; run "npm install" to refresh it and try again.')
    }
    writeFileSync(lockPath, lockUpdated)
  }
}

function snapshotFiles(paths) {
  return new Map(paths.filter((path) => existsSync(join(ROOT, path))).map((path) => [path, readFileSync(join(ROOT, path))]))
}

function restoreFiles(snapshot) {
  for (const [path, content] of snapshot) writeFileSync(join(ROOT, path), content)
}

function listFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }
  return out
}

function verifyDist(version) {
  const manifestPath = join(DIST, 'manifest.json')
  if (!existsSync(manifestPath)) throw new ReleaseError('dist/manifest.json is missing; the build did not produce an extension.')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const problems = []
  if (manifest.version !== version) problems.push(`manifest version is ${manifest.version}, expected ${version}`)
  if (manifest.manifest_version !== 3) problems.push('manifest_version is not 3')

  const worker = manifest.background?.service_worker
  const devMarkers = /localhost:\d+|@vite\/client|CRXJS DEV MODE/
  for (const file of [worker, manifest.side_panel?.default_path, manifest.devtools_page].filter(Boolean)) {
    const full = join(DIST, file)
    if (!existsSync(full)) problems.push(`${file} is listed in the manifest but missing from dist`)
    else if (devMarkers.test(readFileSync(full, 'utf8'))) problems.push(`${file} points at the Vite dev server; stop "npm run dev" and rebuild`)
  }
  for (const icon of Object.values(manifest.icons ?? {})) {
    if (!existsSync(join(DIST, icon))) problems.push(`icon ${icon} is missing`)
  }
  for (const name of readdirSync(DIST)) {
    if (name.startsWith('_') && name !== '_locales') problems.push(`"${name}" starts with "_", which Chrome reserves`)
  }
  if (problems.length) throw new ReleaseError(`The build is not ready to upload:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  return manifest
}

function buildZip(zipPath) {
  const files = {}
  let count = 0
  let raw = 0
  for (const full of listFiles(DIST)) {
    const path = relative(DIST, full).split('\\').join('/')
    if (path.split('/').some((part) => part.startsWith('.')) || /\.map$/.test(path) || /(^|\/)Thumbs\.db$/i.test(path)) continue
    const data = readFileSync(full)
    files[path] = [new Uint8Array(data), { level: STORED_EXTENSIONS.test(path) ? 0 : 9 }]
    count += 1
    raw += data.length
  }
  const zipped = zipSync(files)
  if (zipped.length > STORE_LIMIT_BYTES) throw new ReleaseError('The zip is larger than the 2 GB Chrome Web Store limit.')
  writeFileSync(zipPath, zipped)
  return { count, raw, size: zipped.length, sha256: createHash('sha256').update(zipped).digest('hex') }
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(HELP)
    return
  }

  step('Checking the repository')
  if (!git(['rev-parse', '--is-inside-work-tree'], { allowFail: true })) throw new ReleaseError('This folder is not a git repository.')
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  info(`Branch ${bold(branch)} at ${git(['rev-parse', '--short', 'HEAD'])}`)
  const before = workingTree()
  if (before.tracked.size) {
    const list = [...before.tracked].map((path) => `    ${path}`).join('\n')
    if (!options.allowDirty && !options.dryRun) {
      throw new ReleaseError(`Commit or stash these changes first so the release matches a commit:\n${list}\n  (or pass --allow-dirty to release anyway)`)
    }
    warn(`Uncommitted changes will be built into the zip but left out of the release commit:\n${list}`)
  }
  const untrackedSource = before.untracked.filter((path) => /^(src|public|scripts)\//.test(path))
  if (untrackedSource.length) warn(`Untracked files that may end up in the build:\n${untrackedSource.map((p) => `    ${p}`).join('\n')}`)

  step('Working out the version')
  const pkg = readJson('package.json')
  const tag = lastReleaseTag()
  const current = tag ? tag.slice(1) : pkg.version
  if (tag && pkg.version !== current) warn(`package.json says ${pkg.version} but the last tag is ${tag}; continuing from ${current}.`)
  const commits = commitsSince(tag)
  const counts = summarize(commits)
  info(tag ? `Last release ${bold(tag)}, ${counts.total} commit${counts.total === 1 ? '' : 's'} since` : `No release tag yet; ${counts.total} commits in history`)
  info(dim(`${counts.breaking} breaking · ${counts.feat} features · ${counts.fix} fixes · ${counts.total - counts.feat - counts.fix} other`))

  let plan = resolveNextVersion({ current, request: options.request, commits, firstRelease: !tag })
  info(`${bold(current)} → ${green(bold(plan.version))}  ${dim(`(${plan.reason})`)}`)

  if (git(['tag', '--list', `v${plan.version}`])) throw new ReleaseError(`Tag v${plan.version} already exists. Pass a higher version or bump type.`)

  const name = extensionName()
  const today = new Date().toISOString().slice(0, 10)

  if (options.dryRun) {
    step('Dry run: changelog preview')
    console.log(dim(renderChangelog(plan.version, today, commits, { initial: !tag }).replace(/^/gm, '  ')))
    info(`Would write releases/${slug(name)}-v${plan.version}.zip`)
    return
  }

  if (!options.yes && process.stdin.isTTY) {
    const answer = (await confirm(`\n  Release ${bold(`v${plan.version}`)}? [Y]es, [n]o, or type major/minor/patch/X.Y.Z: `)).toLowerCase()
    if (answer === 'n' || answer === 'no') throw new ReleaseError('Cancelled.')
    if (answer && answer !== 'y' && answer !== 'yes') {
      plan = resolveNextVersion({ current, request: answer.replace(/^v/, ''), commits, firstRelease: !tag })
      if (git(['tag', '--list', `v${plan.version}`])) throw new ReleaseError(`Tag v${plan.version} already exists.`)
      info(`Releasing ${green(bold(plan.version))} instead`)
    }
  }
  const version = plan.version

  const snapshot = snapshotFiles([...VERSION_FILES, CHANGELOG])
  let committed = false
  try {
    step(`Setting version ${version}`)
    writeVersion(version)
    info('Updated package.json and package-lock.json')

    if (options.test) {
      step('Lint and tests')
      run('npm', ['run', 'lint'])
      run('npm', ['test'])
    }

    step('Building')
    run('npm', ['run', 'build'])

    step('Verifying dist/')
    const manifest = verifyDist(version)
    info(`manifest.json v${manifest.version}, ${(manifest.permissions ?? []).length} permissions, MV${manifest.manifest_version}`)

    step('Packaging')
    mkdirSync(OUT, { recursive: true })
    const base = `${slug(name)}-v${version}`
    const zipPath = join(OUT, `${base}.zip`)
    const zip = buildZip(zipPath)
    info(`${zip.count} files, ${mb(zip.raw)} → ${bold(mb(zip.size))}`)
    info(dim(`sha256 ${zip.sha256}`))
    writeFileSync(join(OUT, `${base}-notes.txt`), renderStoreNotes(version, commits))

    step('Changelog')
    const changelogPath = join(ROOT, CHANGELOG)
    const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : ''
    writeFileSync(changelogPath, prependChangelog(existing, renderChangelog(version, today, commits, { initial: !tag })))
    info(`Added ${version} to ${CHANGELOG}`)

    if (options.commit) {
      step('Commit and tag')
      const after = workingTree()
      const changedByBuild = [...after.tracked].filter((path) => !before.tracked.has(path) && !VERSION_FILES.includes(path))
      const toStage = [...VERSION_FILES, CHANGELOG, ...changedByBuild].filter((path) => existsSync(join(ROOT, path)))
      git(['add', '--', ...toStage])
      if (changedByBuild.length) info(`Including files the build regenerated: ${changedByBuild.join(', ')}`)
      git(['commit', '-m', `chore(release): v${version}`, '--', ...toStage])
      committed = true
      git(['tag', '-a', `v${version}`, '-m', `${name} v${version}`])
      info(`Committed ${bold(`chore(release): v${version}`)} and tagged ${bold(`v${version}`)}`)
      if (options.push) {
        step('Pushing')
        run('git', ['push', 'origin', 'HEAD'])
        run('git', ['push', 'origin', `v${version}`])
      }
    }

    console.log(`\n${green('✔')} ${bold(`${name} v${version} is ready to upload`)}`)
    info(`Zip:   ${relative(ROOT, zipPath)}`)
    info(`Notes: ${relative(ROOT, join(OUT, `${base}-notes.txt`))}`)
    info(dim('Upload it at https://chrome.google.com/webstore/devconsole → your item → Package → Upload new package.'))
    if (options.commit && !options.push) info(dim(`Push when ready: git push origin HEAD v${version}`))
  } catch (error) {
    if (!committed) {
      restoreFiles(snapshot)
      if (!snapshot.has(CHANGELOG)) rmSync(join(ROOT, CHANGELOG), { force: true })
      warn('Version files were restored; nothing was committed or tagged.')
    }
    throw error
  }
}

main().catch((error) => {
  console.error(`\n${red('✖')} ${error instanceof ReleaseError ? error.message : error.stack || error}`)
  process.exit(1)
})
