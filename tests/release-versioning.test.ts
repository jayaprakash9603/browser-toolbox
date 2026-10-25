import { describe, expect, it } from 'vitest'

import {
  bumpVersion,
  compareVersions,
  isChromeVersion,
  parseCommit,
  prependChangelog,
  releaseType,
  renderChangelog,
  renderStoreNotes,
  resolveNextVersion,
  slug,
  // @ts-expect-error build-time release modules are plain ESM
} from '../scripts/release/versioning.mjs'

const commit = (subject: string, body = '', hash = 'abcdef1234567') => parseCommit({ hash, subject, body })

describe('release versioning', () => {
  it('parses conventional commit subjects', () => {
    expect(commit('feat(pdf-toolkit): add compress tab')).toMatchObject({ type: 'feat', scope: 'pdf-toolkit', subject: 'add compress tab', breaking: false })
    expect(commit('fix!: drop legacy storage keys')).toMatchObject({ type: 'fix', scope: null, breaking: true })
    expect(commit('refactor: move engines', 'BREAKING CHANGE: storage format changed')).toMatchObject({ breaking: true })
    expect(commit('Stop YouTube ad blocking from stalling')).toMatchObject({ type: 'other', subject: 'Stop YouTube ad blocking from stalling' })
  })

  it('picks the bump from the most significant change', () => {
    expect(releaseType([commit('fix: a'), commit('chore: b')])).toBe('patch')
    expect(releaseType([commit('fix: a'), commit('feat: b')])).toBe('minor')
    expect(releaseType([commit('feat: a'), commit('perf!: b')])).toBe('major')
    expect(releaseType([commit('Plain message')])).toBe('patch')
    expect(releaseType([commit('chore(release): v1.2.0')])).toBeNull()
    expect(releaseType([])).toBeNull()
  })

  it('bumps semantic versions', () => {
    expect(bumpVersion('1.4.2', 'major')).toBe('2.0.0')
    expect(bumpVersion('1.4.2', 'minor')).toBe('1.5.0')
    expect(bumpVersion('1.4.2', 'patch')).toBe('1.4.3')
    expect(bumpVersion('0.1', 'patch')).toBe('0.1.1')
    expect(() => bumpVersion('1.65535.0', 'minor')).toThrow(/65535/)
  })

  it('validates and compares Chrome versions', () => {
    expect(isChromeVersion('1.2.3.4')).toBe(true)
    expect(isChromeVersion('1')).toBe(true)
    expect(isChromeVersion('1.2.3.4.5')).toBe(false)
    expect(isChromeVersion('1.02.3')).toBe(false)
    expect(isChromeVersion('1.2.3-beta')).toBe(false)
    expect(isChromeVersion('70000.0.0')).toBe(false)
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareVersions('1.2', '1.2.0.0')).toBe(0)
  })

  it('resolves the next version from the request and commits', () => {
    const feats = [commit('feat: one'), commit('feat: two'), commit('fix: three')]
    expect(resolveNextVersion({ current: '0.1.0', request: 'auto', commits: feats, firstRelease: false })).toEqual({
      version: '0.2.0',
      type: 'minor',
      reason: '2 new features',
    })
    expect(resolveNextVersion({ current: '0.1.0', request: 'auto', commits: [commit('fix: a')], firstRelease: false }).version).toBe('0.1.1')
    expect(resolveNextVersion({ current: '0.1.0', request: 'major', commits: [], firstRelease: false }).version).toBe('1.0.0')
    expect(resolveNextVersion({ current: '0.1.0', request: '1.0.0', commits: [], firstRelease: false }).version).toBe('1.0.0')
    expect(resolveNextVersion({ current: '0.1.0', request: 'auto', commits: feats, firstRelease: true })).toMatchObject({ version: '0.1.0', type: 'initial' })
    expect(() => resolveNextVersion({ current: '0.1.0', request: '0.1.0', commits: [], firstRelease: false })).toThrow(/higher/)
    expect(() => resolveNextVersion({ current: '0.1.0', request: 'auto', commits: [], firstRelease: false })).toThrow(/No changes/)
    expect(() => resolveNextVersion({ current: '0.1.0', request: 'huge', commits: [], firstRelease: false })).toThrow(/Unknown release type/)
  })

  it('renders a grouped changelog and store notes', () => {
    const commits = [
      commit('feat(pdf): add merge', '', '1111111aaaa'),
      commit('fix: crash on empty tab', '', '2222222bbbb'),
      commit('feat!: new storage', '', '3333333cccc'),
      commit('chore: bump deps', '', '4444444dddd'),
      commit('chore(release): v0.1.0', '', '5555555eeee'),
    ]
    expect(renderChangelog('0.2.0', '2026-10-25', commits)).toBe(
      [
        '## 0.2.0 (2026-10-25)',
        '',
        '### Breaking changes',
        '',
        '- New storage (3333333)',
        '',
        '### Features',
        '',
        '- **pdf:** Add merge (1111111)',
        '',
        '### Fixes',
        '',
        '- Crash on empty tab (2222222)',
        '',
        '### Other changes',
        '',
        '- Bump deps (4444444)',
        '',
      ].join('\n'),
    )
    expect(renderStoreNotes('0.2.0', commits)).toBe('One Panel 0.2.0\n\n• Add merge\n• New storage\n• Crash on empty tab\n')
  })

  it('lists only features for the first release', () => {
    const commits = [commit('feat: one', '', '1111111aaaa'), commit('fix: two', '', '2222222bbbb')]
    expect(renderChangelog('0.1.0', '2026-10-25', commits, { initial: true })).toBe(
      '## 0.1.0 (2026-10-25)\n\nFirst public release.\n\n### Features\n\n- One (1111111)\n',
    )
  })

  it('prepends new sections above older releases', () => {
    const first = prependChangelog('', '## 0.1.0 (2026-10-01)\n\n- Initial\n')
    expect(first.startsWith('# Changelog\n')).toBe(true)
    const second = prependChangelog(first, '## 0.2.0 (2026-10-25)\n\n- Next\n')
    expect(second.indexOf('## 0.2.0')).toBeLessThan(second.indexOf('## 0.1.0'))
    expect(second.match(/# Changelog/g)).toHaveLength(1)
  })

  it('makes file-name slugs', () => {
    expect(slug('One Panel')).toBe('one-panel')
    expect(slug('  Browser — Toolbox! ')).toBe('browser-toolbox')
  })
})
