import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CalendarCheck2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ListTodoIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TaskOverviewBarProps {
  openCount: number
  todayCount: number
  overdueCount: number
  completedCount: number
}

export function TaskOverviewBar({
  openCount,
  todayCount,
  overdueCount,
  completedCount,
}: TaskOverviewBarProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const detailsId = useId()
  const chip = t('tasks.overview.chip', { open: openCount, today: todayCount })

  return (
    <section className="shrink-0">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center gap-1 p-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={open ? t('tasks.overview.collapse') : t('tasks.overview.expand')}
            title={open ? t('tasks.overview.collapse') : t('tasks.overview.expand')}
            onClick={() => setOpen((current) => !current)}
            className="group flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            >
              <ListTodoIcon className="size-3.5" />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
              {t('tasks.overview.title')}
            </span>
            <AnimatePresence initial={false}>
              {!open && (
                <motion.span
                  key="chip"
                  initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="hidden max-w-[65%] shrink-0 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground @[320px]:inline-block"
                  title={chip}
                >
                  {chip}
                </motion.span>
              )}
            </AnimatePresence>
            <ChevronDownIcon
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{ transform: open ? 'rotate(180deg)' : undefined }}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={detailsId}
              key="details"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{
                height: 0,
                opacity: 0,
                transition: { duration: reduceMotion ? 0 : 0.16, ease: 'easeIn' },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 border-t px-2.5 pt-2.5 pb-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  {t('tasks.overview.hint')}
                </p>
                <ul className="flex flex-wrap gap-1.5" aria-label={t('tasks.overview.summary')}>
                  <li className="inline-flex max-w-full items-center gap-1 truncate rounded-md border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    <CalendarCheck2Icon
                      className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                    {t('tasks.overview.today', { count: todayCount })}
                  </li>
                  <li className="inline-flex max-w-full items-center gap-1 truncate rounded-md border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    <CalendarClockIcon
                      className="size-3 shrink-0 text-red-600 dark:text-red-400"
                      aria-hidden
                    />
                    {t('tasks.overview.overdue', { count: overdueCount })}
                  </li>
                  <li className="inline-flex max-w-full items-center gap-1 truncate rounded-md border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    <ListTodoIcon className="size-3 shrink-0 text-primary" aria-hidden />
                    {t('tasks.overview.open', { count: openCount })}
                  </li>
                  <li className="inline-flex max-w-full items-center gap-1 truncate rounded-md border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    <CheckCircle2Icon
                      className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                    {t('tasks.overview.completed', { count: completedCount })}
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
