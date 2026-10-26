import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDownIcon, DownloadIcon, MousePointerClickIcon, ShieldCheckIcon } from 'lucide-react'

import { FORMAT_LABELS, type SaveImageAsState } from '@/core/imageConvert'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { EASE_OUT } from './formatMeta'
import { MenuPreview } from './MenuPreview'

interface StatusBarProps {
  state: SaveImageAsState
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnable: () => void
}

export function StatusBar({ state, open, onOpenChange, onEnable }: StatusBarProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const detailsId = useId()
  const quick = state.quickFormat && state.formats.includes(state.quickFormat) ? state.quickFormat : null
  const chip = [
    t('sia.hero.formats', { count: state.formats.length }),
    t('sia.hero.quality', { value: Math.round(state.quality * 100) }),
    state.quickFormat ? FORMAT_LABELS[state.quickFormat] : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="shrink-0">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center gap-1 p-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={open ? t('sia.bar.collapse') : t('sia.bar.expand')}
            title={open ? t('sia.bar.collapse') : t('sia.bar.expand')}
            onClick={() => onOpenChange(!open)}
            className="group flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            >
              <DownloadIcon className="size-3.5" />
              <span
                className={cn(
                  'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card',
                  state.enabled ? 'bg-emerald-500' : 'bg-amber-500',
                )}
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-5">
              {t(state.enabled ? 'sia.bar.active' : 'sia.bar.paused')}
            </span>
            <AnimatePresence initial={false}>
              {!open && (
                <motion.span
                  key="chip"
                  initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="hidden max-w-[55%] shrink-0 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground @[320px]:inline-block"
                  title={chip}
                >
                  {chip}
                </motion.span>
              )}
            </AnimatePresence>
            <ChevronDownIcon
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none',
                open && 'rotate-180',
              )}
            />
          </button>
          {!state.enabled && (
            <Button type="button" size="sm" className="h-8 shrink-0 px-2.5 text-xs" onClick={onEnable}>
              {t('sia.hero.enable')}
            </Button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={detailsId}
              key="details"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0, transition: { duration: reduceMotion ? 0 : 0.16, ease: 'easeIn' } }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 border-t px-2.5 pt-2.5 pb-3">
                <p className="text-xs leading-5 text-muted-foreground">{t('sia.hero.body')}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClickIcon className="size-3" aria-hidden />
                    {t('sia.hero.how')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    {t('sia.hero.local')}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5" aria-label={t('sia.hero.summary')}>
                  {[
                    t('sia.hero.formats', { count: state.formats.length }),
                    t('sia.hero.quality', { value: Math.round(state.quality * 100) }),
                    state.maxSize ? t('sia.hero.maxSize', { value: state.maxSize }) : t('sia.size.original'),
                    state.folder ? `Downloads/${state.folder}` : 'Downloads',
                    quick ? `${t('sia.formats.oneClick')}: ${FORMAT_LABELS[quick]}` : null,
                  ]
                    .filter(Boolean)
                    .map((label) => (
                      <li
                        key={label}
                        className="max-w-full truncate rounded-md border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
                      >
                        {label}
                      </li>
                    ))}
                </ul>
                <MenuPreview state={state} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
