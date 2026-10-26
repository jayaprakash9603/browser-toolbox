import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDownIcon, GlobeIcon, RotateCwIcon, UserRoundIcon } from 'lucide-react'
import {
  AutofillRoot,
  ProfileSelector,
  useAutofillState,
  useStoreSnapshot,
  type AutofillTheme,
} from '@universal-form-autofill/sdk/react'
import type { AutofillController } from '@universal-form-autofill/sdk'

import { cn } from '@/shared/utils/cn'

import { ModeMenu } from './ModeMenu'
import { isAutofillMode } from './modes'

type Status = 'idle' | 'connecting' | 'ready' | 'error' | 'destroyed'

const DOT: Record<Status, string> = {
  idle: 'bg-muted-foreground',
  connecting: 'bg-sky-500 motion-safe:animate-pulse',
  ready: 'bg-emerald-500',
  error: 'bg-destructive',
  destroyed: 'bg-muted-foreground',
}

const BADGE: Record<Status, string> = {
  idle: 'bg-muted text-muted-foreground',
  connecting: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'bg-destructive/10 text-destructive',
  destroyed: 'bg-muted text-muted-foreground',
}

interface ConnectionBarProps {
  controller: AutofillController | null
  theme: AutofillTheme
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The page and profile strip above the autofill fields. Collapsed it is a single slim row (status
 * icon, page, profile) so the field list gets the space; expanded it shows the full details.
 */
export function ConnectionBar({ controller, theme, open, onOpenChange }: ConnectionBarProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const detailsId = useId()
  const state = useAutofillState(controller)
  const snapshot = useStoreSnapshot(controller?.store)
  const status = state.status as Status
  const rawMode = snapshot.settings?.mode
  const mode = isAutofillMode(rawMode) ? rawMode : 'suggest'
  const page = state.page
  const busy = !controller || status === 'connecting' || state.scanning
  const title = page ? page.title || page.hostname : t(`autofill.status.${status}`)
  const profileName = snapshot.activeProfile?.name ?? t('autofill.bar.noProfile')
  const statusLabel = t(`autofill.status.${status}`)
  const detail = page
    ? `${page.hostname} · ${t('autofill.bar.detail', { count: page.frameCount, name: page.adapterName })}`
    : t('autofill.bar.noPage')

  return (
    <section className="shrink-0 px-3 pt-2 pb-1.5">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center gap-1 p-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={open ? t('autofill.bar.collapse') : t('autofill.bar.expand')}
            title={open ? t('autofill.bar.collapse') : t('autofill.bar.expand')}
            onClick={() => onOpenChange(!open)}
            className="group flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            >
              <GlobeIcon className="size-3.5" />
              <span
                className={cn('absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card', DOT[status])}
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] leading-5 font-semibold" title={page?.url}>
              {title}
            </span>
            <AnimatePresence initial={false}>
              {!open && (
                <motion.span
                  key="chip"
                  initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="hidden max-w-[40%] shrink-0 items-center gap-1 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] leading-4 font-medium text-muted-foreground @[300px]:inline-flex"
                >
                  <UserRoundIcon className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{profileName}</span>
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
          <ModeMenu controller={controller} mode={mode} />
          <button
            type="button"
            onClick={() => void controller?.connect()}
            disabled={busy}
            aria-label={t('autofill.bar.refresh')}
            title={t('autofill.bar.refresh')}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60"
          >
            <RotateCwIcon className={cn('size-4', busy && 'motion-safe:animate-spin')} aria-hidden />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={detailsId}
              key="details"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0, transition: { duration: reduceMotion ? 0 : 0.16, ease: 'easeIn' } }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 border-t px-2.5 pt-2 pb-2.5">
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  {page && (
                    <span
                      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium', BADGE[status])}
                    >
                      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[status])} />
                      {statusLabel}
                    </span>
                  )}
                  <span className="min-w-0 truncate">{detail}</span>
                </div>
                <AutofillRoot theme={theme}>
                  <ProfileSelector store={controller?.store ?? null} />
                </AutofillRoot>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
