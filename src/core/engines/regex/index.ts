export const REGEX_MAX_INPUT = 500_000
export const REGEX_MAX_MATCHES = 1_000
export const REGEX_TIME_BUDGET_MS = 250

export interface RegexFlags {
  global: boolean
  ignoreCase: boolean
  multiline: boolean
  dotAll: boolean
  unicode: boolean
}

export const DEFAULT_REGEX_FLAGS: RegexFlags = {
  global: true,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: true,
}

export function flagsToString(flags: RegexFlags): string {
  return `${flags.global ? 'g' : ''}${flags.ignoreCase ? 'i' : ''}${flags.multiline ? 'm' : ''}${flags.dotAll ? 's' : ''}${flags.unicode ? 'u' : ''}`
}

export type RegexValidation =
  { ok: true; regex: RegExp; riskWarnings: string[] } | { ok: false; error: string }

export function compileRegex(pattern: string, flags: RegexFlags): RegexValidation {
  if (!pattern) return { ok: false, error: 'Pattern is empty.' }
  let regex: RegExp
  try {
    regex = new RegExp(pattern, flagsToString(flags))
  } catch (cause) {
    return {
      ok: false,
      error:
        cause instanceof Error
          ? cause.message.replace(/^Invalid regular expression:\s*/, '')
          : 'Invalid pattern.',
    }
  }
  return { ok: true, regex, riskWarnings: assessRisk(pattern) }
}

export function assessRisk(pattern: string): string[] {
  const warnings: string[] = []
  if (/\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)\s*[+*{]/.test(pattern)) {
    warnings.push(
      'Nested quantifiers (e.g. (a+)+) can cause catastrophic backtracking on large inputs.',
    )
  }
  if (
    /\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)\s*[+*]/.test(pattern) &&
    /(\w|\.\*)\|(\w|\.\*)/.test(pattern)
  ) {
    warnings.push('Alternation with overlapping branches under a quantifier may be slow.')
  }
  if (pattern.length > 200) warnings.push('Very long pattern — matching may be slow.')
  return warnings
}

export interface RegexMatchInfo {
  match: string
  index: number
  groups: (string | undefined)[]
  namedGroups: Record<string, string | undefined>
}

export type RegexMatchResult =
  | {
      ok: true
      matches: RegexMatchInfo[]
      totalCount: number
      truncated: boolean
      durationMs: number
      riskWarnings: string[]
    }
  | { ok: false; error: string }

export function testRegex(pattern: string, input: string, flags: RegexFlags): RegexMatchResult {
  if (input.length > REGEX_MAX_INPUT) {
    return {
      ok: false,
      error: `Input is too large (limit ${REGEX_MAX_INPUT.toLocaleString()} characters).`,
    }
  }
  const compiled = compileRegex(pattern, flags)
  if (!compiled.ok) return compiled
  const { regex, riskWarnings } = compiled

  const matches: RegexMatchInfo[] = []
  const started = Date.now()
  let totalCount = 0
  let truncated = false

  const effectiveRegex = regex.global
    ? new RegExp(regex.source, regex.flags)
    : new RegExp(regex.source, `${regex.flags}g`)
  let match: RegExpExecArray | null
  while ((match = effectiveRegex.exec(input)) !== null) {
    totalCount += 1
    if (matches.length < REGEX_MAX_MATCHES) {
      matches.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1),
        namedGroups: match.groups ? { ...match.groups } : {},
      })
    } else {
      truncated = true
    }
    if (match[0] === '') effectiveRegex.lastIndex += 1
    if (Date.now() - started > REGEX_TIME_BUDGET_MS) {
      return {
        ok: false,
        error: `Matching took longer than ${REGEX_TIME_BUDGET_MS}ms — the pattern may be too expensive for this input.`,
      }
    }
  }
  return {
    ok: true,
    matches,
    totalCount,
    truncated,
    durationMs: Date.now() - started,
    riskWarnings,
  }
}

export type RegexReplaceResult =
  { ok: true; output: string; count: number } | { ok: false; error: string }

export function replaceWithRegex(
  pattern: string,
  replacement: string,
  input: string,
  flags: RegexFlags,
): RegexReplaceResult {
  if (input.length > REGEX_MAX_INPUT) {
    return {
      ok: false,
      error: `Input is too large (limit ${REGEX_MAX_INPUT.toLocaleString()} characters).`,
    }
  }
  const compiled = compileRegex(pattern, { ...flags, global: true })
  if (!compiled.ok) return compiled
  let count = 0
  const output = input.replace(compiled.regex, (...args) => {
    count += 1
    return replacement.replace(/\$(\d)/g, (_, group: string) => String(args[Number(group)] ?? ''))
  })
  return { ok: true, output, count }
}

export interface CommonPattern {
  id: string
  label: string
  pattern: string
  flags: Partial<RegexFlags>
  description: string
  example: string
}

export const COMMON_PATTERNS: CommonPattern[] = [
  {
    id: 'email',
    label: 'Email',
    pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.]+',
    flags: {},
    description: 'Common email shape (not RFC-complete).',
    example: 'ada@example.com',
  },
  {
    id: 'url',
    label: 'URL',
    pattern: 'https?://[\\w.-]+(?:\\.[\\w.-]+)+(?:/\\S*)?',
    flags: {},
    description: 'HTTP/HTTPS URLs.',
    example: 'https://example.com/page',
  },
  {
    id: 'ipv4',
    label: 'IPv4 address',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: {},
    description: 'Dotted IPv4 (no range validation).',
    example: '192.168.0.1',
  },
  {
    id: 'iso-date',
    label: 'ISO date',
    pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b',
    flags: {},
    description: 'YYYY-MM-DD dates.',
    example: '2026-10-07',
  },
  {
    id: 'time-24h',
    label: 'Time (24h)',
    pattern: '\\b(?:[01]?\\d|2[0-3]):[0-5]\\d\\b',
    flags: {},
    description: 'HH:MM 24-hour times.',
    example: '09:41',
  },
  {
    id: 'uuid',
    label: 'UUID',
    pattern: '\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b',
    flags: { ignoreCase: true },
    description: 'Canonical UUID strings.',
    example: '3f6b2a70-1234-4cde-9ab0-1234567890ab',
  },
  {
    id: 'hex-color',
    label: 'Hex color',
    pattern: '#(?:[\\da-f]{3}|[\\da-f]{6})\\b',
    flags: { ignoreCase: true },
    description: '#RGB or #RRGGBB colors.',
    example: '#3b82f6',
  },
  {
    id: 'semver',
    label: 'Semantic version',
    pattern: '\\b\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?\\b',
    flags: {},
    description: 'semver like 1.4.2 or 2.0.0-rc.1.',
    example: '1.4.2',
  },
  {
    id: 'slug',
    label: 'Slug',
    pattern: '\\b[a-z0-9]+(?:-[a-z0-9]+)*\\b',
    flags: {},
    description: 'lowercase-hyphenated slugs.',
    example: 'my-blog-post',
  },
  {
    id: 'phone-intl',
    label: 'Phone (intl)',
    pattern: '\\+?\\d[\\d\\s().-]{7,}\\d',
    flags: {},
    description: 'Loose international phone numbers.',
    example: '+1 (555) 123-4567',
  },
]
