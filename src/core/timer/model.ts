export const TIMER_STORAGE_KEY = 'timer'
export const TIMER_ROUTE = '/tools/productivity/timer'
export const PENDING_ROUTE_KEY = 'toolbox.pendingRoute'
export const COUNTDOWN_ALARM = 'toolbox-timer-countdown'
export const POMODORO_ALARM = 'toolbox-timer-pomodoro'
export const TIMER_NOTIFICATION_ID = 'toolbox-timer-complete'

export const COUNTDOWN_PRESETS = [1, 5, 10, 15, 25, 30, 45, 60] as const

export type ClockStatus = 'idle' | 'running' | 'paused' | 'done'
export type PomoPhase = 'work' | 'break' | 'longBreak'

export type CountdownState = {
  hours: number
  minutes: number
  seconds: number
  label: string
  status: ClockStatus
  endAt: number | null
  remainingMs: number
  durationMs: number
}

export type StopwatchState = {
  status: 'idle' | 'running'
  baseMs: number
  startedAt: number | null
  laps: number[]
}

export type PomodoroState = {
  workMin: number
  shortBreakMin: number
  longBreakMin: number
  roundsPerSet: number
  round: number
  phase: PomoPhase
  autoContinue: boolean
  status: ClockStatus
  endAt: number | null
  remainingMs: number
}

export type TimerSnapshot = {
  countdown: CountdownState
  stopwatch: StopwatchState
  pomodoro: PomodoroState
}

export type TimerNotice = { title: string; message: string }

const MIN_RUN_MS = 1000

export function defaultTimerSnapshot(): TimerSnapshot {
  return {
    countdown: {
      hours: 0,
      minutes: 5,
      seconds: 0,
      label: '',
      status: 'idle',
      endAt: null,
      remainingMs: 5 * 60_000,
      durationMs: 5 * 60_000,
    },
    stopwatch: { status: 'idle', baseMs: 0, startedAt: null, laps: [] },
    pomodoro: {
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      roundsPerSet: 4,
      round: 1,
      phase: 'work',
      autoContinue: true,
      status: 'idle',
      endAt: null,
      remainingMs: 25 * 60_000,
    },
  }
}

export function configuredDurationMs(state: Pick<CountdownState, 'hours' | 'minutes' | 'seconds'>): number {
  const hours = clampInt(state.hours, 0, 23)
  const minutes = clampInt(state.minutes, 0, 59)
  const seconds = clampInt(state.seconds, 0, 59)
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

export function phaseDurationMs(state: Pick<PomodoroState, 'phase' | 'workMin' | 'shortBreakMin' | 'longBreakMin'>): number {
  const minutes =
    state.phase === 'work'
      ? clampInt(state.workMin, 1, 180)
      : state.phase === 'break'
        ? clampInt(state.shortBreakMin, 1, 60)
        : clampInt(state.longBreakMin, 1, 60)
  return minutes * 60_000
}

export function countdownRemaining(state: CountdownState, now: number): number {
  if (state.status === 'running' && state.endAt != null) return Math.max(0, state.endAt - now)
  if (state.status === 'paused') return Math.max(0, state.remainingMs)
  if (state.status === 'done') return 0
  return configuredDurationMs(state)
}

export function countdownProgress(state: CountdownState, now: number): number {
  const total = state.durationMs > 0 ? state.durationMs : configuredDurationMs(state)
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, countdownRemaining(state, now) / total))
}

export function stopwatchElapsed(state: StopwatchState, now: number): number {
  if (state.status === 'running' && state.startedAt != null) return state.baseMs + Math.max(0, now - state.startedAt)
  return Math.max(0, state.baseMs)
}

export function pomodoroRemaining(state: PomodoroState, now: number): number {
  if (state.status === 'running' && state.endAt != null) return Math.max(0, state.endAt - now)
  if (state.status === 'paused') return Math.max(0, state.remainingMs)
  if (state.status === 'done') return 0
  return phaseDurationMs(state)
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function startCountdown(state: CountdownState, now: number): CountdownState {
  const ms = state.status === 'paused' ? state.remainingMs : configuredDurationMs(state)
  const duration = Math.max(MIN_RUN_MS, ms)
  return {
    ...state,
    status: 'running',
    durationMs: state.status === 'paused' ? state.durationMs || duration : duration,
    remainingMs: duration,
    endAt: now + duration,
  }
}

export function pauseCountdown(state: CountdownState, now: number): CountdownState {
  if (state.status !== 'running' || state.endAt == null) return state
  return { ...state, status: 'paused', remainingMs: Math.max(0, state.endAt - now), endAt: null }
}

export function resetCountdown(state: CountdownState): CountdownState {
  const duration = configuredDurationMs(state)
  return { ...state, status: 'idle', endAt: null, remainingMs: duration, durationMs: duration }
}

export function applyCountdownPreset(state: CountdownState, minutes: number): CountdownState {
  if (state.status === 'running') return state
  const total = clampInt(minutes, 1, 23 * 60)
  const next = {
    ...state,
    hours: Math.floor(total / 60),
    minutes: total % 60,
    seconds: 0,
    status: 'idle' as const,
    endAt: null,
  }
  const duration = configuredDurationMs(next)
  return { ...next, remainingMs: duration, durationMs: duration }
}

export function startStopwatch(state: StopwatchState, now: number): StopwatchState {
  if (state.status === 'running') return state
  return { ...state, status: 'running', startedAt: now }
}

export function pauseStopwatch(state: StopwatchState, now: number): StopwatchState {
  if (state.status !== 'running') return state
  return { ...state, status: 'idle', baseMs: stopwatchElapsed(state, now), startedAt: null }
}

export function resetStopwatch(): StopwatchState {
  return { status: 'idle', baseMs: 0, startedAt: null, laps: [] }
}

export function addLap(state: StopwatchState, now: number): StopwatchState {
  if (state.status !== 'running') return state
  return { ...state, laps: [stopwatchElapsed(state, now), ...state.laps].slice(0, 20) }
}

export function selectPomodoroPhase(state: PomodoroState, phase: PomoPhase): PomodoroState {
  if (state.status === 'running') return state
  const next = { ...state, phase, status: 'idle' as const, endAt: null }
  return { ...next, remainingMs: phaseDurationMs(next) }
}

export function startPomodoro(state: PomodoroState, now: number): PomodoroState {
  const next = state.status === 'done' ? shiftPhase(state) : state
  const ms = state.status === 'paused' ? state.remainingMs : phaseDurationMs(next)
  const duration = Math.max(MIN_RUN_MS, ms)
  return { ...next, status: 'running', remainingMs: duration, endAt: now + duration }
}

export function pausePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endAt == null) return state
  return { ...state, status: 'paused', remainingMs: Math.max(0, state.endAt - now), endAt: null }
}

export function resetPomodoro(state: PomodoroState): PomodoroState {
  const next = { ...state, phase: 'work' as const, round: 1, status: 'idle' as const, endAt: null }
  return { ...next, remainingMs: phaseDurationMs(next) }
}

export function finishPomodoro(state: PomodoroState, now: number): { state: PomodoroState; notice: TimerNotice } {
  const finished = state.phase
  if (!state.autoContinue) {
    return {
      state: { ...state, status: 'done', endAt: null, remainingMs: 0 },
      notice: {
        title: `${phaseName(finished)} finished`,
        message: 'The timer is waiting for you.',
      },
    }
  }
  const next = shiftPhase(state)
  const duration = phaseDurationMs(next)
  const running = { ...next, status: 'running' as const, remainingMs: duration, endAt: now + duration }
  const started =
    running.phase === 'work'
      ? `Focus round ${running.round}`
      : running.phase === 'break'
        ? 'Short break'
        : 'Long break'
  return {
    state: running,
    notice: {
      title: `${phaseName(finished)} finished`,
      message: `${started} started (${Math.round(duration / 60_000)} min).`,
    },
  }
}

export function countdownNotice(label: string): TimerNotice {
  const name = label.trim()
  return {
    title: "Time's up",
    message: name ? `${name} finished.` : 'Your countdown finished.',
  }
}

export function isCountdownDue(state: CountdownState, now: number): boolean {
  return state.status === 'running' && state.endAt != null && state.endAt <= now
}

export function isPomodoroDue(state: PomodoroState, now: number): boolean {
  return state.status === 'running' && state.endAt != null && state.endAt <= now
}

export function normalizeTimerSnapshot(raw: unknown): TimerSnapshot {
  const base = defaultTimerSnapshot()
  if (!raw || typeof raw !== 'object') return base
  const value = raw as Partial<TimerSnapshot>
  return {
    countdown: { ...base.countdown, ...cleanCountdown(value.countdown) },
    stopwatch: { ...base.stopwatch, ...cleanStopwatch(value.stopwatch) },
    pomodoro: { ...base.pomodoro, ...cleanPomodoro(value.pomodoro) },
  }
}

function shiftPhase(state: PomodoroState): PomodoroState {
  if (state.phase === 'work') {
    return { ...state, phase: state.round >= state.roundsPerSet ? 'longBreak' : 'break' }
  }
  if (state.phase === 'break') {
    return { ...state, phase: 'work', round: state.round + 1 }
  }
  return { ...state, phase: 'work', round: 1 }
}

function phaseName(phase: PomoPhase): string {
  if (phase === 'work') return 'Focus'
  if (phase === 'break') return 'Short break'
  return 'Long break'
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function cleanCountdown(value: Partial<CountdownState> | undefined): Partial<CountdownState> {
  if (!value) return {}
  return {
    hours: clampInt(Number(value.hours ?? 0), 0, 23),
    minutes: clampInt(Number(value.minutes ?? 0), 0, 59),
    seconds: clampInt(Number(value.seconds ?? 0), 0, 59),
    label: typeof value.label === 'string' ? value.label.slice(0, 80) : '',
    status: isStatus(value.status) ? value.status : 'idle',
    endAt: typeof value.endAt === 'number' ? value.endAt : null,
    remainingMs: Math.max(0, Number(value.remainingMs) || 0),
    durationMs: Math.max(0, Number(value.durationMs) || 0),
  }
}

function cleanStopwatch(value: Partial<StopwatchState> | undefined): Partial<StopwatchState> {
  if (!value) return {}
  const laps = Array.isArray(value.laps) ? value.laps.filter((lap) => typeof lap === 'number').slice(0, 20) : []
  return {
    status: value.status === 'running' ? 'running' : 'idle',
    baseMs: Math.max(0, Number(value.baseMs) || 0),
    startedAt: typeof value.startedAt === 'number' ? value.startedAt : null,
    laps,
  }
}

function cleanPomodoro(value: Partial<PomodoroState> | undefined): Partial<PomodoroState> {
  if (!value) return {}
  const phase: PomoPhase = value.phase === 'break' || value.phase === 'longBreak' ? value.phase : 'work'
  return {
    workMin: clampInt(Number(value.workMin ?? 25), 1, 180),
    shortBreakMin: clampInt(Number(value.shortBreakMin ?? 5), 1, 60),
    longBreakMin: clampInt(Number(value.longBreakMin ?? 15), 1, 60),
    roundsPerSet: clampInt(Number(value.roundsPerSet ?? 4), 1, 12),
    round: clampInt(Number(value.round ?? 1), 1, 99),
    phase,
    autoContinue: value.autoContinue !== false,
    status: isStatus(value.status) ? value.status : 'idle',
    endAt: typeof value.endAt === 'number' ? value.endAt : null,
    remainingMs: Math.max(0, Number(value.remainingMs) || 0),
  }
}

function isStatus(value: unknown): value is ClockStatus {
  return value === 'idle' || value === 'running' || value === 'paused' || value === 'done'
}
