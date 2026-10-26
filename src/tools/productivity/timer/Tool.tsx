import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import {
  COUNTDOWN_PRESETS,
  addLap,
  applyCountdownPreset,
  configuredDurationMs,
  countdownProgress,
  countdownRemaining,
  formatClock,
  isCountdownDue,
  isPomodoroDue,
  normalizeTimerSnapshot,
  phaseDurationMs,
  pauseCountdown,
  pausePomodoro,
  pauseStopwatch,
  pomodoroRemaining,
  resetCountdown,
  resetPomodoro,
  resetStopwatch,
  selectPomodoroPhase,
  startCountdown,
  startPomodoro,
  startStopwatch,
  stopwatchElapsed,
  type CountdownState,
  type PomoPhase,
  type PomodoroState,
  type TimerSnapshot,
} from '@/core/timer/model'
import { loadTimer, updateTimer } from '@/core/timer/storage'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useProductivityTool } from '../_shared'

export default function TimerTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.timer')
  const [tab, setTab] = useDeepLinkTab('tab', ['countdown', 'stopwatch', 'pomodoro'] as const, 'countdown')
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const asked = useRef(false)

  useEffect(() => {
    let live = true
    void loadTimer().then((value) => {
      if (live) setSnapshot(value)
    })
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.timer?.newValue) {
        setSnapshot(normalizeTimerSnapshot(changes.timer.newValue))
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      live = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!snapshot) return
    const due = isCountdownDue(snapshot.countdown, now) || isPomodoroDue(snapshot.pomodoro, now)
    if (!due) {
      asked.current = false
      return
    }
    if (asked.current) return
    asked.current = true
    void sendMessage({ type: 'TIMER_RECONCILE' })
  }, [snapshot, now])

  const commit = (mutate: (current: TimerSnapshot) => TimerSnapshot) => {
    void updateTimer(mutate).then(setSnapshot)
  }

  if (!snapshot) {
    return (
      <ToolPage tool={tool}>
        <p className="text-sm text-muted-foreground">{t('nav.loading')}</p>
      </ToolPage>
    )
  }

  return (
    <ToolPage tool={tool}>
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="mx-auto flex w-full max-w-md flex-col gap-4">
        <TabsList variant="pill" fullWidth className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="countdown" className="h-11 w-full">{t('timer.countdown')}</TabsTrigger>
          <TabsTrigger value="stopwatch" className="h-11 w-full">{t('timer.stopwatch')}</TabsTrigger>
          <TabsTrigger value="pomodoro" className="h-11 w-full">{t('timer.pomodoro')}</TabsTrigger>
        </TabsList>

        <TabsContent value="countdown" className="mt-0">
          <CountdownPane
            state={snapshot.countdown}
            now={now}
            onPreset={(minutes) => commit((current) => ({ ...current, countdown: applyCountdownPreset(current.countdown, minutes) }))}
            onPart={(part, value) =>
              commit((current) => {
                const countdown = resetCountdown({ ...current.countdown, [part]: value })
                return { ...current, countdown }
              })
            }
            onLabel={(label) => commit((current) => ({ ...current, countdown: { ...current.countdown, label } }))}
            onStart={() => commit((current) => ({ ...current, countdown: startCountdown(current.countdown, Date.now()) }))}
            onPause={() => commit((current) => ({ ...current, countdown: pauseCountdown(current.countdown, Date.now()) }))}
            onReset={() => commit((current) => ({ ...current, countdown: resetCountdown(current.countdown) }))}
          />
        </TabsContent>

        <TabsContent value="stopwatch" className="mt-0">
          <StopwatchPane
            state={snapshot.stopwatch}
            now={now}
            onStart={() => commit((current) => ({ ...current, stopwatch: startStopwatch(current.stopwatch, Date.now()) }))}
            onPause={() => commit((current) => ({ ...current, stopwatch: pauseStopwatch(current.stopwatch, Date.now()) }))}
            onLap={() => commit((current) => ({ ...current, stopwatch: addLap(current.stopwatch, Date.now()) }))}
            onReset={() => commit((current) => ({ ...current, stopwatch: resetStopwatch() }))}
          />
        </TabsContent>

        <TabsContent value="pomodoro" className="mt-0">
          <PomodoroPane
            state={snapshot.pomodoro}
            now={now}
            onPhase={(phase) => commit((current) => ({ ...current, pomodoro: selectPomodoroPhase(current.pomodoro, phase) }))}
            onNumber={(key, value) =>
              commit((current) => {
                const pomodoro = selectPomodoroPhase({ ...current.pomodoro, [key]: value }, current.pomodoro.phase)
                return { ...current, pomodoro }
              })
            }
            onAuto={(autoContinue) => commit((current) => ({ ...current, pomodoro: { ...current.pomodoro, autoContinue } }))}
            onStart={() => commit((current) => ({ ...current, pomodoro: startPomodoro(current.pomodoro, Date.now()) }))}
            onPause={() => commit((current) => ({ ...current, pomodoro: pausePomodoro(current.pomodoro, Date.now()) }))}
            onReset={() => commit((current) => ({ ...current, pomodoro: resetPomodoro(current.pomodoro) }))}
          />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}

function CountdownPane({
  state,
  now,
  onPreset,
  onPart,
  onLabel,
  onStart,
  onPause,
  onReset,
}: {
  state: CountdownState
  now: number
  onPreset: (minutes: number) => void
  onPart: (part: 'hours' | 'minutes' | 'seconds', value: number) => void
  onLabel: (label: string) => void
  onStart: () => void
  onPause: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const remaining = countdownRemaining(state, now)
  const done = state.status === 'done' || (state.status === 'running' && remaining === 0)
  const locked = state.status === 'running' || state.status === 'paused'
  const totalMinutes = state.hours * 60 + state.minutes
  const preset = state.seconds === 0 && (COUNTDOWN_PRESETS as readonly number[]).includes(totalMinutes) ? totalMinutes : null
  const canStart = state.status === 'paused' || configuredDurationMs(state) >= 1000

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('timer.presets')}>
        {COUNTDOWN_PRESETS.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            variant={preset === minutes ? 'default' : 'outline'}
            className="min-h-11 whitespace-nowrap px-2"
            aria-pressed={preset === minutes}
            disabled={locked}
            onClick={() => onPreset(minutes)}
          >
            {t('timer.presetMinutes', { count: minutes })}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-2">
        <TimeField label={t('timer.hours')} value={state.hours} max={23} disabled={locked} onChange={(value) => onPart('hours', value)} />
        <Colon />
        <TimeField label={t('timer.minutes')} value={state.minutes} max={59} disabled={locked} onChange={(value) => onPart('minutes', value)} />
        <Colon />
        <TimeField label={t('timer.seconds')} value={state.seconds} max={59} disabled={locked} onChange={(value) => onPart('seconds', value)} />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs leading-4 font-medium text-muted-foreground">{t('timer.label')}</span>
        <Input
          value={state.label}
          maxLength={80}
          disabled={locked}
          placeholder={t('timer.labelPlaceholder')}
          onChange={(event) => onLabel(event.target.value)}
        />
      </label>

      <Clock ms={remaining} progress={state.status === 'idle' ? 0 : 1 - countdownProgress(state, now)} />
      {!done && <StatusLine status={state.status} detail={state.label} />}
      {done ? (
        <DoneCard detail={state.label.trim()} onDismiss={onReset} />
      ) : (
        <ActionRow
          running={state.status === 'running'}
          paused={state.status === 'paused'}
          canStart={canStart}
          onStart={onStart}
          onPause={onPause}
          onReset={onReset}
        />
      )}
      <BackgroundNote />
    </section>
  )
}

function StopwatchPane({
  state,
  now,
  onStart,
  onPause,
  onLap,
  onReset,
}: {
  state: TimerSnapshot['stopwatch']
  now: number
  onStart: () => void
  onPause: () => void
  onLap: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const elapsed = stopwatchElapsed(state, now)
  const running = state.status === 'running'
  return (
    <section className="flex flex-col gap-4">
      <Clock ms={elapsed} />
      <StatusLine status={running ? 'running' : elapsed > 0 ? 'paused' : 'idle'} />
      <div className="grid grid-cols-3 gap-2">
        {running ? (
          <Button type="button" variant="outline" className="min-h-11 w-full min-w-0 px-2" onClick={onPause}>
            <PauseIcon aria-hidden /> {t('timer.pause')}
          </Button>
        ) : (
          <Button type="button" className="min-h-11 w-full min-w-0 px-2" onClick={onStart}>
            <PlayIcon aria-hidden /> {elapsed > 0 ? t('timer.resume') : t('timer.start')}
          </Button>
        )}
        <Button type="button" variant="outline" className="min-h-11 w-full min-w-0 px-2" onClick={onLap} disabled={!running}>
          <TimerIcon aria-hidden /> {t('timer.lap')}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 w-full min-w-0 px-2" onClick={onReset}>
          <RotateCcwIcon aria-hidden /> {t('timer.reset')}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t('timer.laps')}</h3>
        {state.laps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('timer.noLaps')}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-2 text-xs leading-4 font-medium text-muted-foreground">
              <span>{t('timer.lap')}</span>
              <span>{t('timer.split')}</span>
              <span className="text-right">{t('timer.total')}</span>
            </div>
            <ol className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {state.laps.map((lap, index) => {
                const previous = state.laps[index + 1] ?? 0
                const number = state.laps.length - index
                return (
                  <li key={`${lap}-${index}`} className="grid grid-cols-[2rem_1fr_1fr] items-baseline gap-2 rounded-md border px-2 py-1.5 font-mono text-sm tabular-nums">
                    <span className="text-muted-foreground">{number}</span>
                    <span>
                      <span className="sr-only">{t('timer.split')} </span>
                      {formatClock(lap - previous)}
                    </span>
                    <span className="text-right">
                      <span className="sr-only">{t('timer.total')} </span>
                      {formatClock(lap)}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
      <BackgroundNote />
    </section>
  )
}

function PomodoroPane({
  state,
  now,
  onPhase,
  onNumber,
  onAuto,
  onStart,
  onPause,
  onReset,
}: {
  state: PomodoroState
  now: number
  onPhase: (phase: PomoPhase) => void
  onNumber: (key: 'workMin' | 'shortBreakMin' | 'longBreakMin' | 'roundsPerSet', value: number) => void
  onAuto: (value: boolean) => void
  onStart: () => void
  onPause: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const remaining = pomodoroRemaining(state, now)
  const phaseMs = phaseDurationMs(state)
  const done = state.status === 'done' || (state.status === 'running' && remaining === 0 && !state.autoContinue)
  const locked = state.status === 'running' || state.status === 'paused'
  const phases: { id: PomoPhase; label: string }[] = [
    { id: 'work', label: t('timer.pomoWork') },
    { id: 'break', label: t('timer.pomoBreak') },
    { id: 'longBreak', label: t('timer.pomoLong') },
  ]
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('timer.phase')}>
        {phases.map((phase) => (
          <Button
            key={phase.id}
            type="button"
            variant={state.phase === phase.id ? 'default' : 'outline'}
            className="min-h-11 whitespace-nowrap px-2"
            aria-pressed={state.phase === phase.id}
            disabled={locked}
            onClick={() => onPhase(phase.id)}
          >
            {phase.label}
          </Button>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t('timer.roundOf', { current: state.round, total: state.roundsPerSet })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <TimeField label={t('timer.workMin')} value={state.workMin} max={180} disabled={locked} onChange={(value) => onNumber('workMin', Math.max(1, value))} />
        <TimeField label={t('timer.shortMin')} value={state.shortBreakMin} max={60} disabled={locked} onChange={(value) => onNumber('shortBreakMin', Math.max(1, value))} />
        <TimeField label={t('timer.longMin')} value={state.longBreakMin} max={60} disabled={locked} onChange={(value) => onNumber('longBreakMin', Math.max(1, value))} />
        <TimeField label={t('timer.rounds')} value={state.roundsPerSet} max={12} disabled={locked} onChange={(value) => onNumber('roundsPerSet', Math.max(1, value))} />
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3">
        <span className="text-sm">{t('timer.autoContinue')}</span>
        <Switch checked={state.autoContinue} onCheckedChange={onAuto} aria-label={t('timer.autoContinue')} />
      </label>
      <Clock
        ms={remaining}
        progress={state.status === 'idle' ? 0 : 1 - (phaseMs > 0 ? Math.min(1, Math.max(0, remaining / phaseMs)) : 0)}
      />
      {!done && (
        <StatusLine status={state.status} detail={phases.find((phase) => phase.id === state.phase)?.label} />
      )}
      {done ? (
        <DoneCard detail={phases.find((phase) => phase.id === state.phase)?.label ?? ''} onDismiss={onReset} />
      ) : (
        <ActionRow
          running={state.status === 'running'}
          paused={state.status === 'paused'}
          canStart
          onStart={onStart}
          onPause={onPause}
          onReset={onReset}
        />
      )}
      <BackgroundNote />
    </section>
  )
}

function TimeField({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string
  value: number
  max: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="min-h-8 text-center text-xs leading-4 font-medium text-muted-foreground">{label}</span>
      <NumberField
        value={String(value)}
        min={0}
        max={max}
        ariaLabel={label}
        disabled={disabled}
        className="h-11 text-center"
        onChange={(next) => {
          const parsed = parseNumberInRange(next === '' ? '0' : next, 0, max)
          if (parsed != null) onChange(parsed)
        }}
      />
    </label>
  )
}

function Colon() {
  return <span className="pb-2 text-lg font-medium text-muted-foreground" aria-hidden="true">:</span>
}

function Clock({ ms, progress }: { ms: number; progress?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p role="timer" className="max-w-full font-mono text-[clamp(2rem,14vw,3rem)] leading-none font-semibold tracking-tight tabular-nums">
        {formatClock(ms)}
      </p>
      {progress != null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full origin-left bg-primary" style={{ transform: `scaleX(${progress})` }} />
        </div>
      )}
    </div>
  )
}

function StatusLine({ status, detail }: { status: 'idle' | 'running' | 'paused' | 'done'; detail?: string }) {
  const { t } = useTranslation()
  const label = status === 'running' ? t('timer.running') : status === 'paused' ? t('timer.paused') : status === 'done' ? t('timer.done') : ''
  if (!label && !detail) return null
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground" role="status">
      {status === 'running' && <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />}
      <span>{[label, detail?.trim()].filter(Boolean).join(' · ')}</span>
    </p>
  )
}

function DoneCard({ detail, onDismiss }: { detail: string; onDismiss: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-3 py-3 text-center" role="status">
      <p className="text-base font-semibold">{t('timer.done')}</p>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      <Button type="button" className="min-h-11" onClick={onDismiss}>
        {t('timer.dismiss')}
      </Button>
    </div>
  )
}

function ActionRow({
  running,
  paused,
  canStart,
  onStart,
  onPause,
  onReset,
}: {
  running: boolean
  paused: boolean
  canStart: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-2">
      {running ? (
        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onPause}>
          <PauseIcon aria-hidden /> {t('timer.pause')}
        </Button>
      ) : (
        <Button type="button" className="min-h-11 w-full" disabled={!canStart} onClick={onStart}>
          <PlayIcon aria-hidden /> {paused ? t('timer.resume') : t('timer.start')}
        </Button>
      )}
      <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={onReset}>
        <RotateCcwIcon aria-hidden /> {t('timer.reset')}
      </Button>
    </div>
  )
}

function BackgroundNote() {
  const { t } = useTranslation()
  return <p className="text-center text-sm leading-5 text-muted-foreground">{t('timer.background')}</p>
}
