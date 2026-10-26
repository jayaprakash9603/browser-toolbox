import { useState } from 'react'
import { BellIcon, CalendarIcon, GlobeIcon, RepeatIcon } from 'lucide-react'

import type { ProjectColor, Task } from '@/core/tasks/model'
import { cn } from '@/shared/utils/cn'

import { dueTone, formatDue, formatTime, type DayWords } from './logic'
import { DUE_TONE_STYLES, PROJECT_COLOR_STYLES } from './taskStyles'

export function Favicon({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed || !/^(https?:|data:image\/)/.test(src)) {
    return <GlobeIcon className={cn('size-3.5 shrink-0 text-muted-foreground', className)} aria-hidden />
  }
  return (
    <img
      src={src}
      alt=""
      width={14}
      height={14}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('size-3.5 shrink-0 rounded-[3px] object-contain', className)}
    />
  )
}

interface DueTextProps {
  task: Pick<Task, 'due' | 'allDay' | 'recurrence' | 'reminder'>
  now: number
  words: DayWords
  /** In a section that already names the day, only the time is worth showing. */
  timeOnly?: boolean
  className?: string
}

export function DueText({ task, now, words, timeOnly, className }: DueTextProps) {
  if (task.due == null) return null
  const tone = dueTone(task.due, task.allDay, now)
  const label = timeOnly ? (task.allDay ? '' : formatTime(task.due)) : formatDue(task.due, task.allDay, now, words)
  if (!label && task.recurrence === 'none') return null
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1 whitespace-nowrap', DUE_TONE_STYLES[tone], className)}>
      {!timeOnly && <CalendarIcon className="size-3 shrink-0" aria-hidden />}
      {label && <span className="truncate">{label}</span>}
      {task.recurrence !== 'none' && <RepeatIcon className="size-3 shrink-0" aria-hidden />}
      {task.reminder != null && !task.allDay && <BellIcon className="size-2.5 shrink-0 opacity-70" aria-hidden />}
    </span>
  )
}

export function ProjectDot({ color, className }: { color: ProjectColor | 'inbox'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        color === 'inbox' ? 'bg-primary' : PROJECT_COLOR_STYLES[color].dot,
        className,
      )}
    />
  )
}
