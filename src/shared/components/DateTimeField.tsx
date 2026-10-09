import { useMemo, useState } from 'react'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function parseDateTimeValue(value: string): Date | null {
  if (!value) return null
  const [datePart, timePart = '00:00'] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTimeValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function displayLabel(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildMonth(view: Date): Array<Date | null> {
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const start = first.getDay()
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: Array<Date | null> = Array.from({ length: start }, () => null)
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(view.getFullYear(), view.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface DateTimeFieldProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  className?: string
}

export function DateTimeField({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Pick date and time',
  className,
}: DateTimeFieldProps) {
  const selected = parseDateTimeValue(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => selected ?? new Date())
  const cells = useMemo(() => buildMonth(view), [view])
  const hour = selected?.getHours() ?? 0
  const minute = selected?.getMinutes() ?? 0

  const commit = (next: Date) => onChange(formatDateTimeValue(next))

  const pickDay = (day: Date) => {
    const next = new Date(day)
    next.setHours(hour, minute, 0, 0)
    commit(next)
    setView(next)
  }

  const setTime = (nextHour: number, nextMinute: number) => {
    const base = selected ?? new Date(view.getFullYear(), view.getMonth(), view.getDate())
    const next = new Date(base)
    next.setHours(nextHour, nextMinute, 0, 0)
    commit(next)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setView(selected ?? new Date())
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            'h-9 w-full justify-start px-3 text-left font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon />
          <span className="truncate">{selected ? displayLabel(selected) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-2rem))]">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Previous month"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="text-sm font-medium">{monthLabel(view)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Next month"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            const active =
              day &&
              selected &&
              day.getFullYear() === selected.getFullYear() &&
              day.getMonth() === selected.getMonth() &&
              day.getDate() === selected.getDate()
            return day ? (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => pickDay(day)}
                className={cn(
                  'h-8 rounded-md text-sm hover:bg-accent',
                  active && 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {day.getDate()}
              </button>
            ) : (
              <span key={`empty-${index}`} />
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-muted-foreground">
            Hour
            <select
              aria-label="Hour"
              value={hour}
              onChange={(event) => setTime(Number(event.target.value), minute)}
              className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              {Array.from({ length: 24 }, (_, index) => (
                <option key={index} value={index}>
                  {pad(index)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-muted-foreground">
            Minute
            <select
              aria-label="Minute"
              value={minute}
              onChange={(event) => setTime(hour, Number(event.target.value))}
              className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              {Array.from({ length: 60 }, (_, index) => (
                <option key={index} value={index}>
                  {pad(index)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex justify-between">
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange('')}>
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              const now = new Date()
              commit(now)
              setView(now)
            }}
          >
            Now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
