import { useId, type ReactElement } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ChevronDownIcon,
  CornerDownRightIcon,
  CrosshairIcon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  RepeatIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { reasonPhrase } from '@/core/engines/linkChecker/report'
import {
  displayHref,
  formatChainText,
  hopClass,
  type HopClass,
  type RedirectEntry,
  type RedirectFlag,
  type RedirectKind,
} from '@/core/engines/redirects/chain'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

import { formatDuration } from '../link-checker/meta'
import { RT_CARD } from './layout'

const KIND_TONE: Record<RedirectKind, string> = {
  direct: 'border-border/70',
  permanent: 'border-sky-500/35',
  temporary: 'border-amber-500/40',
  mixed: 'border-violet-500/35',
  loop: 'border-fuchsia-500/40',
  error: 'border-red-500/35',
}

const KIND_SOFT: Record<RedirectKind, string> = {
  direct: 'bg-muted text-muted-foreground',
  permanent: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  temporary: 'bg-amber-500/14 text-amber-700 dark:text-amber-400',
  mixed: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
  loop: 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-400',
  error: 'bg-red-500/12 text-red-700 dark:text-red-400',
}

const HOP_TONE: Record<HopClass, string> = {
  permanent: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  temporary: 'bg-amber-500/14 text-amber-700 dark:text-amber-400',
  final: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  error: 'bg-red-500/12 text-red-700 dark:text-red-400',
}

function IconAction({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function StatusCode({ status }: { status: number | null | undefined }) {
  const tone = HOP_TONE[hopClass(status)]
  const label = status == null ? '—' : `${status}${reasonPhrase(status) ? ` ${reasonPhrase(status)}` : ''}`
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums', tone)}>
      {label}
    </span>
  )
}

function UrlLine({ href }: { href: string }) {
  const { host, path } = displayHref(href)
  return (
    <span className="block min-w-0 truncate font-mono text-[11px] leading-4" title={href}>
      <span className="text-muted-foreground/70">{host}</span>
      <span className="text-muted-foreground">{path}</span>
    </span>
  )
}

interface ChainCardProps {
  entry: RedirectEntry
  expanded: boolean
  featured?: boolean
  index: number
  onToggle: (url: string) => void
  onLocate?: (index: number, href: string) => void
  onRetrace?: (url: string) => void
}

export function ChainCard({ entry, expanded, featured, index, onToggle, onLocate, onRetrace }: ChainCardProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const detailsId = useId()
  const { target, phase, trace } = entry
  const locate = target.occurrences.find((item) => item.visible) ?? target.occurrences[0]
  const kind = trace?.kind ?? 'direct'
  const hopCount = Math.max(0, (trace?.hops.length ?? 1) - 1)
  const original = displayHref(target.url)
  const final = trace ? displayHref(trace.finalUrl) : original
  const sameUrl = !trace || trace.finalUrl === target.url

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: reduce ? 0 : Math.min(index, 12) * 0.02, ease: 'easeOut' }}
      className={cn(RT_CARD, KIND_TONE[kind], featured && 'border-primary/35 shadow-sm')}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums',
            KIND_SOFT[kind],
          )}
          aria-hidden
        >
          {phase === 'checking' ? (
            <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
          ) : trace?.loop ? (
            <RepeatIcon className="size-4" />
          ) : (
            <CornerDownRightIcon className="size-4" />
          )}
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggle(target.url)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] leading-5 font-medium">
              {featured && target.source === 'page' ? t('redirectTracer.pageCard') : target.text || original.host}
            </span>
            <span className={cn('inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold', KIND_SOFT[kind])}>
              {t(`redirectTracer.kind.${kind}`)}
            </span>
            <ChevronDownIcon
              className={cn(
                'ml-auto size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 motion-reduce:transition-none',
                expanded && 'rotate-180',
              )}
              aria-hidden
            />
          </span>
          <UrlLine href={target.url} />
          {trace && !sameUrl && (
            <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <CornerDownRightIcon className="size-3 shrink-0" aria-hidden />
              <span className="min-w-0 truncate font-mono" title={trace.finalUrl}>
                {final.host}
                {final.path}
              </span>
            </span>
          )}
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            {trace?.hops.slice(0, 4).map((hop, hopIndex) => (
              <StatusCode key={`${hop.url}-${hopIndex}`} status={hop.status} />
            ))}
            {(trace?.hops.length ?? 0) > 4 && (
              <span className="text-[10px] text-muted-foreground">+{trace!.hops.length - 4}</span>
            )}
            {phase === 'checking' && (
              <span className="text-[10px] text-muted-foreground">{t('redirectTracer.checking')}</span>
            )}
            {trace && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {t('redirectTracer.hops', { count: hopCount })}
                {trace.durationMs > 0 ? ` · ${formatDuration(trace.durationMs)}` : ''}
              </span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {locate && onLocate && (
            <IconAction label={t('redirectTracer.locate')}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('redirectTracer.locate')}
                onClick={() => onLocate(locate.index, locate.href)}
              >
                <CrosshairIcon />
              </Button>
            </IconAction>
          )}
          <IconAction label={t('redirectTracer.openOriginal')}>
            <Button variant="ghost" size="icon-xs" asChild>
              <a href={target.url} target="_blank" rel="noopener noreferrer" aria-label={t('redirectTracer.openOriginal')}>
                <ExternalLinkIcon />
              </a>
            </Button>
          </IconAction>
          <CopyButton text={formatChainText(entry)} label={t('redirectTracer.copyChain')} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && trace && (
          <motion.div
            id={detailsId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
            className="mt-3 border-t border-border/60 pt-3"
          >
            <ol className="space-y-0">
              {trace.hops.map((hop, hopIndex) => {
                const last = hopIndex === trace.hops.length - 1
                return (
                  <li key={`${hop.url}-${hopIndex}`} className="flex gap-2.5">
                    <span className="relative flex w-4 shrink-0 justify-center">
                      <span
                        className={cn(
                          'relative z-10 mt-1.5 size-2.5 rounded-full',
                          last && !trace.loop
                            ? 'bg-emerald-500'
                            : hopClass(hop.status) === 'error'
                              ? 'bg-red-500'
                              : 'bg-primary/70',
                        )}
                        aria-hidden
                      />
                      {!last && <span className="absolute top-4 bottom-[-4px] w-px bg-border" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1 pb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">#{hopIndex + 1}</span>
                        <StatusCode status={hop.status} />
                        {last && (
                          <span className="rounded-full bg-emerald-500/12 px-1.5 py-px text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {trace.loop ? t('redirectTracer.loop') : t('redirectTracer.final')}
                          </span>
                        )}
                        {hop.durationMs != null && hop.durationMs > 0 && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(hop.durationMs)}</span>
                        )}
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] leading-4 text-foreground/90">{hop.url}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
            {trace.flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {trace.flags.map((flag: RedirectFlag) => (
                  <span
                    key={flag}
                    className="inline-flex h-5 items-center rounded-full border border-border/70 bg-background px-2 text-[10px] font-medium text-muted-foreground"
                  >
                    {t(`redirectTracer.flag.${flag}`)}
                  </span>
                ))}
              </div>
            )}
            {trace.error && <p className="mt-2 text-[11px] text-red-700 dark:text-red-400">{trace.error}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-1">
              {onRetrace && (
                <Button size="xs" variant="outline" onClick={() => onRetrace(target.url)}>
                  <RefreshCwIcon />
                  {t('redirectTracer.retrace')}
                </Button>
              )}
              {trace.finalUrl !== target.url && (
                <Button size="xs" variant="ghost" asChild>
                  <a href={trace.finalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon />
                    {t('redirectTracer.openFinal')}
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
