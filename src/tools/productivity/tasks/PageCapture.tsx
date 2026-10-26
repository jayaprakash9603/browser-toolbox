import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlusIcon, CheckIcon, PencilLineIcon, XIcon } from 'lucide-react'

import type { ActivePage } from '@/core/tasks/activePage'
import { linkHost, type Task } from '@/core/tasks/model'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

import { AnimatedPopoverContent } from './AnimatedPopover'
import { DuePicker, type DueValue } from './DuePicker'
import { useDayWords } from './labels'
import { formatDue, quickDueDay, type QuickDue } from './logic'
import { Favicon } from './TaskMeta'

interface PageCaptureProps {
  page: ActivePage
  existing: Task | null
  now: number
  load: Map<string, number>
  onAdd: (due: DueValue) => void
  onEdit: () => void
  onOpen: (task: Task) => void
  onDismiss: () => void
}

const QUICK: QuickDue[] = ['today', 'tomorrow', 'nextWeek']

export function PageCapture({ page, existing, now, load, onAdd, onEdit, onOpen, onDismiss }: PageCaptureProps) {
  const { t } = useTranslation()
  const words = useDayWords()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerValue, setPickerValue] = useState<DueValue>({ due: null, allDay: true, recurrence: 'none', reminder: null })

  const addOn = (day: number) => onAdd({ due: day, allDay: true, recurrence: 'none', reminder: null })

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      aria-label={t('tasks.page.label')}
      className="relative overflow-hidden rounded-xl border bg-linear-to-br from-primary/8 via-card to-card p-3 shadow-xs"
    >
      <motion.span
        key={page.url}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-primary/10 to-transparent"
        initial={{ x: '-120%' }}
        animate={{ x: '360%' }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
      />
      <div className="relative flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs">
          <Favicon src={page.favIconUrl} className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold tracking-wide text-primary uppercase">{t('tasks.page.label')}</p>
          <p className="line-clamp-2 text-[13px] leading-[1.35] font-medium break-words" title={page.title}>
            {page.title || linkHost(page.url)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground" title={page.url}>
            {linkHost(page.url)}
          </p>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          className="-mt-1 -mr-1 size-6 shrink-0 text-muted-foreground"
          onClick={onDismiss}
          aria-label={t('tasks.page.dismiss')}
          title={t('tasks.page.dismiss')}
        >
          <XIcon />
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {existing ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="relative mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2 py-1.5"
            role="status"
          >
            <motion.span
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
                <motion.path
                  d="M6 12.5l4 4L18 8.5"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                />
              </svg>
            </motion.span>
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
              {existing.due != null
                ? t('tasks.page.savedFor', { when: formatDue(existing.due, existing.allDay, now, words) })
                : t('tasks.page.saved')}
            </p>
            <Button size="xs" variant="ghost" className="h-6 px-2" onClick={() => onOpen(existing)}>
              {t('tasks.page.view')}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="relative mt-2.5 flex flex-wrap items-center gap-1.5"
          >
            {QUICK.map((choice, index) => (
              <motion.button
                key={choice}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04, type: 'spring', stiffness: 500, damping: 30 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => addOn(quickDueDay(choice, now))}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border bg-background px-2.5 text-[12px] font-medium shadow-xs transition-colors',
                  'hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                )}
              >
                {index === 0 && <CheckIcon className="size-3.5" aria-hidden />}
                {t(`tasks.quick.${choice}`)}
              </motion.button>
            ))}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="outline"
                  className="size-7 rounded-full"
                  aria-label={t('tasks.page.pickDate')}
                  title={t('tasks.page.pickDate')}
                >
                  <CalendarPlusIcon />
                </Button>
              </PopoverTrigger>
              <AnimatedPopoverContent align="start" className="w-72 p-2.5">
                <DuePicker
                  value={pickerValue}
                  now={now}
                  load={load}
                  onChange={setPickerValue}
                  onDone={(value) => {
                    setPickerOpen(false)
                    onAdd(value)
                  }}
                />
              </AnimatedPopoverContent>
            </Popover>
            <Button
              size="icon-xs"
              variant="ghost"
              className="ml-auto size-7 rounded-full text-muted-foreground"
              onClick={onEdit}
              aria-label={t('tasks.page.edit')}
              title={t('tasks.page.edit')}
            >
              <PencilLineIcon />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
