/**
 * Pure helpers for release versioning: commit classification, semantic version bumps
 * within Chrome's version rules, and changelog rendering. No file or git access here.
 */

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<subject>.+)$/i
const BREAKING_NOTE = /^BREAKING[ -]CHANGE:/m
const CHROME_PART = /^(0|[1-9]\d{0,4})$/
const CHROME_PART_MAX = 65535

export const BUMPS = ['major', 'minor', 'patch']

/**
 * @typedef {{ hash: string, subject: string, body?: string }} RawCommit
 * @typedef {{ hash: string, type: string, scope: string | null, subject: string, breaking: boolean }} Commit
 */

/** @param {RawCommit} raw @returns {Commit} */
export function parseCommit({ hash, subject, body = '' }) {
  const match = CONVENTIONAL.exec(subject.trim())
  const groups = match?.groups
  return {
    hash,
    type: groups ? groups.type.toLowerCase() : 'other',
    scope: groups?.scope?.trim() || null,
    subject: (groups ? groups.subject : subject).trim(),
    breaking: Boolean(groups?.bang) || BREAKING_NOTE.test(body),
  }
}

/** Earlier release commits never count as changes of their own. */
export function isReleaseCommit(commit) {
  return commit.type === 'chore' && commit.scope === 'release'
}

/** @param {Commit[]} commits @returns {'major' | 'minor' | 'patch' | null} */
export function releaseType(commits) {
  const relevant = commits.filter((commit) => !isReleaseCommit(commit))
  if (!relevant.length) return null
  if (relevant.some((commit) => commit.breaking)) return 'major'
  if (relevant.some((commit) => commit.type === 'feat')) return 'minor'
  return 'patch'
}

/** Chrome accepts one to four dot-separated integers from 0 to 65535 without leading zeros. */
export function isChromeVersion(version) {
  if (typeof version !== 'string') return false
  const parts = version.split('.')
  return parts.length >= 1 && parts.length <= 4 && parts.every((part) => CHROME_PART.test(part) && Number(part) <= CHROME_PART_MAX)
}

/** @returns {number[]} always four parts */
export function parseVersion(version) {
  if (!isChromeVersion(version)) throw new Error(`"${version}" is not a valid Chrome extension version (1-4 numbers from 0 to 65535, e.g. 1.4.2).`)
  const parts = version.split('.').map(Number)
  while (parts.length < 4) parts.push(0)
  return parts
}

export function compareVersions(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  for (let i = 0; i < 4; i += 1) if (left[i] !== right[i]) return left[i] - right[i]
  return 0
}

/** @param {string} current @param {'major' | 'minor' | 'patch'} type */
export function bumpVersion(current, type) {
  const [major, minor, patch] = parseVersion(current)
  const next = type === 'major' ? [major + 1, 0, 0] : type === 'minor' ? [major, minor + 1, 0] : [major, minor, patch + 1]
  const version = next.join('.')
  if (!isChromeVersion(version)) throw new Error(`Bumping ${current} (${type}) gives ${version}, which is past Chrome's 65535 limit.`)
  return version
}

/**
 * Decides the next version.
 * @param {{ current: string, request: string, commits: Commit[], firstRelease: boolean }} input
 *   `request` is `auto`, a bump name, or an exact version.
 * @returns {{ version: string, type: string, reason: string }}
 */
export function resolveNextVersion({ current, request, commits, firstRelease }) {
  parseVersion(current)
  if (isChromeVersion(request)) {
    if (!firstRelease && compareVersions(request, current) <= 0) {
      throw new Error(`Version ${request} must be higher than the last release ${current}; the Chrome Web Store rejects equal or lower versions.`)
    }
    return { version: request, type: 'manual', reason: `version ${request} was given explicitly` }
  }
  if (BUMPS.includes(request)) {
    return { version: bumpVersion(current, request), type: request, reason: `${request} bump was requested` }
  }
  if (request !== 'auto') throw new Error(`Unknown release type "${request}". Use major, minor, patch, auto or an exact version like 1.2.0.`)
  if (firstRelease) return { version: current, type: 'initial', reason: 'first release: publishing the current version as-is' }
  const type = releaseType(commits)
  if (!type) throw new Error(`No changes since ${current}. Commit something first, or pass a release type to force a release.`)
  const counts = summarize(commits)
  const reason =
    type === 'major'
      ? `${counts.breaking} breaking change${counts.breaking === 1 ? '' : 's'}`
      : type === 'minor'
        ? `${counts.feat} new feature${counts.feat === 1 ? '' : 's'}`
        : `${counts.total} fix${counts.total === 1 ? '' : 'es'} or maintenance change${counts.total === 1 ? '' : 's'}, no new features`
  return { version: bumpVersion(current, type), type, reason }
}

export function summarize(commits) {
  const relevant = commits.filter((commit) => !isReleaseCommit(commit))
  return {
    total: relevant.length,
    breaking: relevant.filter((commit) => commit.breaking).length,
    feat: relevant.filter((commit) => commit.type === 'feat').length,
    fix: relevant.filter((commit) => commit.type === 'fix').length,
  }
}

const SECTIONS = [
  ['breaking', 'Breaking changes'],
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['other', 'Other changes'],
]

function sectionOf(commit) {
  if (commit.breaking) return 'breaking'
  return ['feat', 'fix', 'perf'].includes(commit.type) ? commit.type : 'other'
}

function sentence(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Markdown section for CHANGELOG.md. The initial release lists only features: fixes to
 * never-published work mean nothing to users.
 */
export function renderChangelog(version, date, commits, { initial = false } = {}) {
  const lines = [`## ${version} (${date})`, '']
  const relevant = commits.filter((commit) => !isReleaseCommit(commit))
  if (initial) lines.push('First public release.', '')
  else if (!relevant.length) lines.push('- Maintenance release.', '')
  for (const [id, title] of SECTIONS) {
    if (initial && id !== 'feat') continue
    const items = relevant.filter((commit) => (initial ? commit.type === 'feat' : sectionOf(commit) === id))
    if (!items.length) continue
    lines.push(`### ${title}`, '')
    for (const commit of items) lines.push(`- ${commit.scope ? `**${commit.scope}:** ` : ''}${sentence(commit.subject)} (${commit.hash.slice(0, 7)})`)
    lines.push('')
  }
  return lines.join('\n')
}

/** Inserts a release section above the previous ones, creating the file header when needed. */
export function prependChangelog(existing, section) {
  const header = '# Changelog\n\nEvery published version of One Panel, newest first. Generated by `release.bat`.\n\n'
  if (!existing?.trim()) return `${header}${section}`
  const index = existing.indexOf('\n## ')
  if (index === -1) return `${existing.trimEnd()}\n\n${section}`
  return `${existing.slice(0, index + 1)}${section}\n${existing.slice(index + 1)}`
}

/** Short plain-text summary for the store listing's release notes. */
export function renderStoreNotes(version, commits, limit = 12) {
  const relevant = commits.filter((commit) => !isReleaseCommit(commit))
  const picked = [...relevant.filter((c) => c.breaking || c.type === 'feat'), ...relevant.filter((c) => !c.breaking && c.type === 'fix')]
  const lines = [`One Panel ${version}`, '']
  for (const commit of picked.slice(0, limit)) lines.push(`• ${sentence(commit.subject)}`)
  if (picked.length > limit) lines.push(`• …and ${picked.length - limit} more improvements`)
  if (!picked.length) lines.push('• Stability and performance improvements')
  return `${lines.join('\n')}\n`
}

/** `One Panel` -> `one-panel` for file names. */
export function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
