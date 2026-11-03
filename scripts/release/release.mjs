#!/usr/bin/env node
/**
 * Builds a cross-browser release: picks the next version from the commits since the last
 * `vX.Y.Z` tag, writes it to package.json, builds Chromium and Firefox targets, packages the
 * browser artifacts and records the release in CHANGELOG.md with a commit and tag, then pushes
 * both to origin by default.
 *
 *   node scripts/release/release.mjs [auto|major|minor|patch|X.Y.Z] [options]
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

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
import { packageTarget, writeChecksums } from './package.mjs'
import { RELEASE_TARGETS } from './targets.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'releases')
const VERSION_FILES = ['package.json', 'package-lock.json']
const CHANGELOG = 'CHANGELOG.md'

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
  --push         push the release commit and tag to origin (default)
  --no-push      keep the release commit and tag local
  --no-commit    build and zip, but leave versioning changes uncommitted and untagged
  --allow-dirty  release even with uncommitted changes to tracked files
  --help         show this help
`

function parseArgs(argv) {
  const options = { request: 'auto', dryRun: false, yes: false, test: false, push: null, commit: true, allowDirty: false, help: false }
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--yes' || arg === '-y') options.yes = true
    else if (arg === '--test') options.test = true
    else if (arg === '--push') options.push = true
    else if (arg === '--no-push') options.push = false
    else if (arg === '--no-commit') options.commit = false
    else if (arg === '--allow-dirty') options.allowDirty = true
    else if (arg === '--help' || arg === '-h' || arg === '/?') options.help = true
    else if (arg === 'auto' || BUMPS.includes(arg) || isChromeVersion(arg.replace(/^v/, ''))) options.request = arg.replace(/^v/, '')
    else throw new ReleaseError(`Unknown argument "${arg}". Run release.bat --help for usage.`)
  }
  if (options.push === null) options.push = options.commit
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

function run(command, args, extraEnv = {}) {
  console.log(dim(`  $ ${[command, ...args].join(' ')}`))
  const env = { ...process.env, ...extraEnv }
  // npm is a .cmd shim on Windows, so it needs a shell; args here are fixed script names.
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args].join(' '), { cwd: ROOT, stdio: 'inherit', shell: true, env })
      : spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', env })
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
    info(`Would build ${RELEASE_TARGETS.map((target) => target.id).join(' and ')}`)
    info(`Would write releases/v${plan.version}/${slug(name)}-v${plan.version}-<browser>.zip`)
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

    step('Building browser targets')
    const releaseDir = join(OUT, `v${version}`)
    mkdirSync(releaseDir, { recursive: true })
    const artifacts = []
    for (const target of RELEASE_TARGETS) {
      const outputDir = join(ROOT, target.outputDir)
      run('npm', ['run', 'build'], {
        BUILD_TARGET: target.id,
        BUILD_OUTPUT_DIR: outputDir,
      })
      step(`Verifying and packaging ${target.id}`)
      const packaged = packageTarget({
        sourceDir: outputDir,
        releaseDir,
        target: target.id,
        browsers: target.browsers,
        slug: slug(name),
        version,
      })
      artifacts.push(...packaged.artifacts)
      info(
        `${target.id}: ${packaged.zip.count} files, ${mb(packaged.zip.raw)} → ` +
          `${bold(mb(packaged.zip.size))} (${target.browsers.join(', ')})`,
      )
      info(dim(`sha256 ${packaged.zip.sha256}`))
    }
    const base = `${slug(name)}-v${version}`
    const notesPath = join(releaseDir, `${base}-notes.txt`)
    const checksumsPath = join(releaseDir, 'SHA256SUMS.txt')
    writeFileSync(notesPath, renderStoreNotes(version, commits))
    writeChecksums(artifacts, checksumsPath)
    info(`Checksums: ${relative(ROOT, checksumsPath)}`)

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
    info(`Artifacts: ${relative(ROOT, releaseDir)}`)
    info(`Notes:     ${relative(ROOT, notesPath)}`)
    info(dim('Upload the Chromium ZIP to Chrome, Edge, Opera, and Brave; upload the Firefox ZIP to AMO.'))
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
