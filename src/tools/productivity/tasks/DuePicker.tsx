import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArmchairIcon,
  BanIcon,
  BellIcon,
  CalendarArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  RepeatIcon,
  SparklesIcon,
  SunIcon,
  SunriseIcon,
  XIcon,
} from 'lucide-react'

import {
  REMINDER_OFFSETS,
  TASK_RECURRENCES,
  addDays,
  addMonths,
  dayKey,
  startOfDay,
  withTime,
  type ReminderOffset,
  type TaskRecurrence,
} from '@/core/tasks/model'
import { parseDueText } from '@/core/tasks/parse'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { cn } from '@/shared/utils/cn'

import {
  formatDue,
  formatTime,
  formatWeekday,
  localeWeekStart,
  monthGrid,
  quickDueDay,
  weekdayHeaders,
  type QuickDue,
} from './logic'
import { reminderLabel, useDayWords } from './labels'

export interface DueValue {
  due: number | null
  allDay: boolean
  recurrence: TaskRecurrence
  reminder: ReminderOffset | null
}

interface DuePickerProps {
  value: DueValue
  now: number
  load: Map<string, number>
  onChange: (value: DueValue) => void
  /** Called with the final value; it may be newer than the `value` prop the parent last rendered. */
  onDone: (value: DueValue) => void
}

const QUICK: Array<{ id: QuickDue; icon: typeof SunIcon; tone: string }> = [
  { id: 'today', icon: SunIcon, tone: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'tomorrow', icon: SunriseIcon, tone: 'text-amber-600 dark:text-amber-400' },
  { id: 'weekend', icon: ArmchairIcon, tone: 'text-sky-600 dark:text-sky-400' },
  { id: 'nextWeek', icon: CalendarArrowUpIcon, tone: 'text-violet-600 dark:text-violet-400' },
]

const TIME_PRESETS: Array<[number, number]> = [
  [9, 0],
  [12, 0],
  [15, 0],
  [18, 0],
  [21, 0],
]

const WEEK_START = localeWeekStart()

function monthStart(ms: number): number {
  const date = new Date(ms)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

function timeInputValue(ms: number): string {
  const date = new Date(ms)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function DuePicker({ value, now, load, onChange, onDone }: DuePickerProps) {
  const { t } = useTranslation()
  const words = useDayWords()
  const [typed, setTyped] = useState('')
  const [month, setMonth] = useState(() => monthStart(value.due ?? now))
  const [direction, setDirection] = useState(0)
  const [showTime, setShowTime] = useState(!value.allDay && value.due != null)

  const today = startOfDay(now)
  const preview = typed.trim() ? parseDueText(typed, now) : null
  const selectedDay = value.due != null ? startOfDay(value.due) : null

  const pickDay = (day: number): DueValue => {
    const time = value.due != null && !value.allDay ? new Date(value.due) : null
    const due = time ? withTime(day, time.getHours(), time.getMinutes()) : day
    const next = { ...value, due, allDay: time == null }
    onChange(next)
    return next
  }

  const pickTime = (hours: number, minutes: number) => {
    const base = value.due != null ? startOfDay(value.due) : today
    let due = withTime(base, hours, minutes)
    if (value.due == null && due <= now) due = addDays(due, 1)
    onChange({ ...value, due, allDay: false, reminder: value.reminder ?? 0 })
    setShowTime(true)
  }

  const clearTime = () => {
    if (value.due == null) return
    onChange({ ...value, due: startOfDay(value.due), allDay: true })
    setShowTime(false)
  }

  const shiftMonth = (step: number) => {
    setDirection(step)
    setMonth((current) => addMonths(current, step))
  }

  const applyTyped = () => {
    if (!preview) return
    const next: DueValue = {
      ...value,
      due: preview.due,
      allDay: preview.allDay,
      recurrence: preview.recurrence ?? value.recurrence,
      reminder: preview.allDay ? value.reminder : (value.reminder ?? 0),
    }
    onChange(next)
    setTyped('')
    onDone(next)
  }

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const step = steps[event.key]
    const target = event.target as HTMLElement
    const current = Number(target.dataset.day)
    if (!step || !current) return
    event.preventDefault()
    const next = event.currentTarget.querySelector<HTMLButtonElement>(`[data-day="${addDays(current, step)}"]`)
    next?.focus()
  }

  const cells = monthGrid(month, WEEK_START)
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <SparklesIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-primary/70"
          aria-hidden
        />
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              applyTyped()
            }
          }}
          placeholder={t('tasks.due.typePlaceholder')}
          aria-label={t('tasks.due.typeLabel')}
          className="h-8 pl-8 text-xs"
        />
      </div>
      <AnimatePresence initial={false}>
        {typed.trim() && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            role="status"
            className={cn('-mt-1 px-1 text-[11px]', preview ? 'text-primary' : 'text-muted-foreground')}
          >
            {preview
              ? t('tasks.due.preview', { when: formatDue(preview.due, preview.allDay, now, words) })
              : t('tasks.due.noMatch')}
          </motion.p>
        )}
      </AnimatePresence>

      <ul className="-mx-1 flex flex-col">
        {QUICK.map(({ id, icon: Icon, tone }) => {
          const day = quickDueDay(id, now)
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onDone(pickDay(day))}
                className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-xs transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <Icon className={cn('size-4', tone)} aria-hidden />
                <span className="flex-1 font-medium">{t(`tasks.quick.${id}`)}</span>
                <span className="text-[11px] text-muted-foreground">{formatWeekday(day)}</span>
              </button>
            </li>
          )
        })}
        {value.due != null && (
          <li>
            <button
              type="button"
              onClick={() => {
                const next: DueValue = { ...value, due: null, allDay: true, recurrence: 'none' }
                onChange(next)
                onDone(next)
              }}
              className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-xs transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <BanIcon className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 font-medium">{t('tasks.quick.none')}</span>
            </button>
          </li>
        )}
      </ul>

      <div className="rounded-lg border bg-muted/30 p-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="pl-1 text-xs font-semibold" aria-live="polite">
            {monthLabel}
          </span>
          <div className="flex items-center">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => shiftMonth(-1)}
              disabled={month <= monthStart(now)}
              aria-label={t('tasks.due.prevMonth')}
              title={t('tasks.due.prevMonth')}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => shiftMonth(1)}
              aria-label={t('tasks.due.nextMonth')}
              title={t('tasks.due.nextMonth')}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground" aria-hidden>
          {weekdayHeaders(WEEK_START).map((label, i) => (
            <span key={i} className="py-0.5">
              {label}
            </span>
          ))}
        </div>
        <div className="relative overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={month}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              role="group"
              aria-label={monthLabel}
              onKeyDown={onGridKey}
              className="grid grid-cols-7 gap-y-0.5"
            >
              {cells.map((day, index) => {
                if (day == null) return <span key={`blank-${index}`} aria-hidden />
                const past = day < today
                const selected = day === selectedDay
                const isToday = day === today
                const count = load.get(dayKey(day)) ?? 0
                return (
                  <button
                    key={day}
                    type="button"
                    data-day={day}
                    disabled={past}
                    tabIndex={selected || (selectedDay == null && isToday) ? 0 : -1}
                    aria-pressed={selected}
                    aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day)}
                    onClick={() => pickDay(day)}
                    className={cn(
                      'relative mx-auto flex size-8 cursor-pointer flex-col items-center justify-center rounded-full text-xs tabular-nums outline-none transition-[background-color,color,transform] duration-150',
                      'focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
                      past && 'cursor-not-allowed text-muted-foreground/40',
                      !past && !selected && 'hover:bg-accent',
                      isToday && !selected && 'font-semibold text-primary',
                      selected && 'bg-primary font-semibold text-primary-foreground shadow-sm',
                    )}
                  >
                    {new Date(day).getDate()}
                    {count > 0 && !past && (
                      <span className="absolute bottom-1 flex gap-px" aria-hidden>
                        {Array.from({ length: Math.min(3, count) }, (_, i) => (
                          <span
                            key={i}
                            className={cn('size-[3px] rounded-full', selected ? 'bg-primary-foreground/80' : 'bg-primary/60')}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs font-medium">{t('tasks.due.time')}</span>
          {!value.allDay && value.due != null ? (
            <span className="ml-auto flex items-center gap-1">
              <input
                type="time"
                value={timeInputValue(value.due)}
                onChange={(event) => {
                  const [h, m] = event.target.value.split(':').map(Number)
                  if (Number.isFinite(h) && Number.isFinite(m)) pickTime(h, m)
                }}
                aria-label={t('tasks.due.time')}
                className="h-7 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={clearTime}
                aria-label={t('tasks.due.clearTime')}
                title={t('tasks.due.clearTime')}
              >
                <XIcon />
              </Button>
            </span>
          ) : (
            !showTime && (
              <Button size="xs" variant="ghost" className="ml-auto h-6" onClick={() => setShowTime(true)}>
                {t('tasks.due.addTime')}
              </Button>
            )
          )}
        </div>
        <AnimatePresence initial={false}>
          {(showTime || !value.allDay) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex flex-wrap gap-1"
            >
              {TIME_PRESETS.map(([h, m]) => {
                const active =
                  value.due != null && !value.allDay && new Date(value.due).getHours() === h && new Date(value.due).getMinutes() === m
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => pickTime(h, m)}
                    aria-pressed={active}
                    className={cn(
                      'h-6 cursor-pointer rounded-full border px-2 text-[11px] tabular-nums transition-colors',
                      active
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-input hover:border-foreground/25 hover:bg-accent',
                    )}
                  >
                    {formatTime(withTime(today, h, m))}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <RepeatIcon className="size-3" aria-hidden />
            {t('tasks.repeat.label')}
          </span>
          <Select
            value={value.recurrence}
            disabled={value.due == null}
            onValueChange={(recurrence) => onChange({ ...value, recurrence: recurrence as TaskRecurrence })}
          >
            <SelectTrigger size="sm" className="h-7 w-full" aria-label={t('tasks.repeat.label')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_RECURRENCES.map((recurrence) => (
                <SelectItem key={recurrence} value={recurrence}>
                  {t(`tasks.repeat.${recurrence}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <BellIcon className="size-3" aria-hidden />
            {t('tasks.reminder.label')}
          </span>
          <Select
            value={value.reminder == null ? 'none' : String(value.reminder)}
            disabled={value.due == null}
            onValueChange={(next) =>
              onChange({ ...value, reminder: next === 'none' ? null : (Number(next) as ReminderOffset) })
            }
          >
            <SelectTrigger size="sm" className="h-7 w-full" aria-label={t('tasks.reminder.label')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{reminderLabel(t, null, value.allDay)}</SelectItem>
              {REMINDER_OFFSETS.map((offset) => (
                <SelectItem key={offset} value={String(offset)}>
                  {reminderLabel(t, offset, value.allDay)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="flex justify-end">
        <Button size="xs" onClick={() => onDone(value)}>
          {t('tasks.done')}
        </Button>
      </div>
    </div>
  )
}
