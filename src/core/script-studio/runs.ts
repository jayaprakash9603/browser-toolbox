export type ScriptRunStatus = 'ok' | 'error'

export type ScriptRun = {
  scriptId: string
  status: ScriptRunStatus
  error?: string
  /** Epoch ms of the most recent run in this tab. */
  lastRunAt: number
  firstRunAt: number
  durationMs: number
  /** Total executions since the tab last navigated (top frame plus subframes). */
  runs: number
  frameRuns: number
  url: string
  /** Latest outcome the script described itself, e.g. "Copied 1,240 words". */
  note?: string
  noteAt?: number
}

export type TabScriptRuns = Record<string, ScriptRun>

export type ScriptRunReport = {
  status?: unknown
  error?: unknown
  durationMs?: unknown
  url?: unknown
  top?: unknown
  /** `'note'` reports update the outcome text without counting as another run. */
  kind?: unknown
  note?: unknown
}

const MAX_NOTE = 300

export const SCRIPT_RUNS_PREFIX = 'ssRuns:'

export function scriptRunsKey(tabId: number): string {
  return `${SCRIPT_RUNS_PREFIX}${tabId}`
}

export function mergeScriptRun(
  prev: ScriptRun | undefined,
  scriptId: string,
  report: ScriptRunReport,
  now = Date.now(),
): ScriptRun {
  const isTop = report.top !== false
  if (report.kind === 'note') {
    const base: ScriptRun = prev ?? {
      scriptId,
      status: 'ok',
      lastRunAt: now,
      firstRunAt: now,
      durationMs: 0,
      runs: 0,
      frameRuns: 0,
      url: typeof report.url === 'string' ? report.url.slice(0, 2000) : '',
    }
    const note = typeof report.note === 'string' ? report.note.trim().slice(0, MAX_NOTE) : ''
    return note && isTop ? { ...base, note, noteAt: now } : base
  }

  const status: ScriptRunStatus = report.status === 'error' ? 'error' : 'ok'
  const error = typeof report.error === 'string' && report.error ? report.error : undefined
  const durationMs =
    typeof report.durationMs === 'number' && Number.isFinite(report.durationMs)
      ? Math.max(0, Math.round(report.durationMs))
      : 0
  const url = typeof report.url === 'string' ? report.url.slice(0, 2000) : (prev?.url ?? '')

  return {
    scriptId,
    // A failure in any frame stays visible until the tab navigates, so it isn't masked by a later success.
    status: prev?.status === 'error' ? 'error' : status,
    error: error ?? prev?.error,
    lastRunAt: now,
    firstRunAt: prev?.firstRunAt ?? now,
    durationMs: isTop || !prev ? durationMs : prev.durationMs,
    runs: (prev?.runs ?? 0) + 1,
    frameRuns: (prev?.frameRuns ?? 0) + (isTop ? 0 : 1),
    url: isTop || !prev ? url : prev.url,
    note: prev?.note,
    noteAt: prev?.noteAt,
  }
}

export async function getTabScriptRuns(tabId: number): Promise<TabScriptRuns> {
  if (!chrome.storage?.session) return {}
  const key = scriptRunsKey(tabId)
  const raw = (await chrome.storage.session.get(key))[key]
  return raw && typeof raw === 'object' ? (raw as TabScriptRuns) : {}
}
