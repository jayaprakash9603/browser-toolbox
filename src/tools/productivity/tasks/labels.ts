import { useTranslation } from 'react-i18next'

import { ALL_DAY_REMINDER_HOUR, type ReminderOffset, type TaskRecurrence } from '@/core/tasks/model'

import { formatTime, type DayWords } from './logic'

type Translate = (key: string, options?: Record<string, unknown>) => string

export function useDayWords(): DayWords {
  const { t } = useTranslation()
  return { today: t('tasks.day.today'), tomorrow: t('tasks.day.tomorrow'), yesterday: t('tasks.day.yesterday') }
}

export function reminderLabel(t: Translate, offset: ReminderOffset | null, allDay: boolean): string {
  if (offset == null) return t('tasks.reminder.none')
  if (offset === 0) {
    return allDay
      ? t('tasks.reminder.morning', { time: formatTime(new Date(2000, 0, 1, ALL_DAY_REMINDER_HOUR).getTime()) })
      : t('tasks.reminder.atTime')
  }
  if (offset === 1440) return t('tasks.reminder.dayBefore')
  if (offset === 60) return t('tasks.reminder.hourBefore')
  return t('tasks.reminder.minutesBefore', { count: offset })
}

export function recurrenceLabel(t: Translate, recurrence: TaskRecurrence): string {
  return t(`tasks.repeat.${recurrence}`)
}
