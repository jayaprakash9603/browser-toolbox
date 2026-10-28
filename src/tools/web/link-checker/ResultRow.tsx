import { memo, useId, type ReactElement } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  BanIcon,
  ChevronDownIcon,
  CornerDownRightIcon,
  CrosshairIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  RotateCcwIcon,
  TimerIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { reasonPhrase, speedOf, type CheckEntry, type CheckTarget } from '@/core/engines/linkChecker/report'
import type { PageLink } from '@/core/engines/links/pageLinks'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

import { SectionGlyph } from '../link-toolkit/LinkVisuals'
import { displayUrl, formatDuration, HEALTH_META, SPEED_TEXT } from './meta'
import { HealthTile, StatusPill, Tag } from './visuals'

interface ResultRowProps {
  entry: CheckEntry
  problem: boolean
  expanded: boolean
  busy: boolean
  /** Position in the list, for a short entrance stagger. */
  index: number
  onToggle: (url: string) => void
  onLocate: (link: PageLink) => void
  onRecheck: (target: CheckTarget) => void
  onSkipHost: (host: string) => void
}

function IconAction({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export const ResultRow = memo(function ResultRow({
  entry,
  problem,
  expanded,
  busy,
  index,
  onToggle,
  onLocate,
  onRecheck,
  onSkipHost,
}: ResultRowProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const detailsId = useId()
  const { target, state } = entry
  const { host, path } = displayUrl(target.url)
  const result = state.phase === 'done' ? state.result : null
  const speed = result?.status != null ? speedOf(result.durationMs) : null
  const redirect = result?.redirected && result.finalUrl && result.finalUrl !== target.url ? displayUrl(result.finalUrl) : null
  const count = target.occurrences.length
  const locateTarget = target.occurrences.find((link) => link.visible) ?? target.occurrences[0]

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: reduce ? 0 : Math.min(index, 12) * 0.025, ease: 'easeOut' }}
      className={cn(
        'rounded-xl border bg-card transition-[border-color,box-shadow] duration-150 hover:border-primary/30 motion-reduce:transition-none',
        problem && 'border-red-500/30 hover:border-red-500/50',
        expanded && 'shadow-sm',
        expanded && !problem && 'border-primary/30',
      )}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <HealthTile state={state} />
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggle(target.url)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {target.text ? (
              <span className="truncate text-[13px] leading-5 font-medium text-foreground">{target.text}</span>
            ) : (
              <span className="truncate text-[13px] leading-5 text-muted-foreground italic">{t('linkChecker.noText')}</span>
            )}
            {count > 1 && (
              <span
                className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums"
                aria-label={t('linkChecker.timesFound', { count })}
              >
                ×{count}
              </span>
            )}
            <ChevronDownIcon
              className={cn(
                'ml-auto size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 motion-reduce:transition-none',
                expanded && 'rotate-180',
              )}
              aria-hidden
            />
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] leading-4">
            <span className="text-muted-foreground/70">{host}</span>
            <span className="text-muted-foreground">{path}</span>
          </span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
            <StatusPill state={state} />
            {speed && result?.durationMs != null && (
              <Tag className={SPEED_TEXT[speed]} title={t(`linkChecker.speed.${speed}`)}>
                <TimerIcon aria-hidden />
                {formatDuration(result.durationMs)}
              </Tag>
            )}
            {redirect && (
              <Tag tone="info" className="max-w-56" title={t('linkChecker.redirectsTo', { url: result?.finalUrl })}>
                <CornerDownRightIcon aria-hidden />
                <span className="truncate font-mono">
                  {redirect.host}
                  {redirect.path}
                </span>
              </Tag>
            )}
            <Tag>{t(`linkChecker.kind.${target.kind}`)}</Tag>
            {state.phase === 'done' && state.retried && (
              <Tag tone="warning">
                <RotateCcwIcon aria-hidden />
                {t('linkChecker.retried')}
              </Tag>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {locateTarget && (
            <IconAction label={t('linkChecker.locate')}>
              <Button variant="ghost" size="icon-xs" aria-label={t('linkChecker.locate')} onClick={() => onLocate(locateTarget)}>
                <CrosshairIcon />
              </Button>
            </IconAction>
          )}
          <IconAction label={t('linkChecker.open')}>
            <Button variant="ghost" size="icon-xs" asChild>
              <a href={target.url} target="_blank" rel="noopener noreferrer" aria-label={t('linkChecker.open')}>
                <ExternalLinkIcon />
              </a>
            </Button>
          </IconAction>
          <CopyButton text={target.url} label={t('linkChecker.copy')} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={detailsId}
            key="details"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
          >
            <ResultDetails entry={entry} busy={busy} onLocate={onLocate} onRecheck={onRecheck} onSkipHost={onSkipHost} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
})

function ResultDetails({
  entry,
  busy,
  onLocate,
  onRecheck,
  onSkipHost,
}: Pick<ResultRowProps, 'entry' | 'busy' | 'onLocate' | 'onRecheck' | 'onSkipHost'>) {
  const { t } = useTranslation()
  const { target, state } = entry
  const done = state.phase === 'done' ? state : null
  const meta = done ? HEALTH_META[done.health] : null
  const Icon = meta?.icon
  const result = done?.result
  const finalUrl = result?.redirected && result.finalUrl && result.finalUrl !== target.url ? result.finalUrl : null

  return (
    <div className="space-y-3 border-t bg-muted/30 px-3 py-2.5 text-[11px]">
      {done && meta && Icon && (
        <p className={cn('flex items-start gap-1.5 rounded-lg px-2 py-1.5 leading-relaxed', meta.soft, meta.text)}>
          <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">{t(`linkChecker.health.${done.health}`)}.</span> {t(`linkChecker.advice.${done.health}`)}
          </span>
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-muted-foreground">{t('linkChecker.detail.url')}</dt>
        <dd className="font-mono break-all select-text">{target.url}</dd>
        {finalUrl && (
          <>
            <dt className="text-muted-foreground">{t('linkChecker.detail.finalUrl')}</dt>
            <dd className="flex items-start gap-1 font-mono break-all select-text">
              <span className="min-w-0 flex-1">{finalUrl}</span>
              <CopyButton text={finalUrl} label={t('linkChecker.copyFinal')} />
            </dd>
          </>
        )}
        {result && (
          <>
            <dt className="text-muted-foreground">{t('linkChecker.detail.status')}</dt>
            <dd className={cn('font-medium', meta?.text)}>
              {result.status != null ? `${result.status} ${reasonPhrase(result.status)}`.trim() : t(`linkChecker.health.${done!.health}`)}
            </dd>
          </>
        )}
        {result?.durationMs != null && (
          <>
            <dt className="text-muted-foreground">{t('linkChecker.detail.time')}</dt>
            <dd className="tabular-nums">
              {t('linkChecker.detail.timeValue', { ms: result.durationMs.toLocaleString(), method: result.method ?? 'GET' })}
            </dd>
          </>
        )}
        {result?.error && (
          <>
            <dt className="text-muted-foreground">{t('linkChecker.detail.error')}</dt>
            <dd className="break-words text-red-700 dark:text-red-400">{result.error}</dd>
          </>
        )}
      </dl>

      <div>
        <p className="mb-1 font-medium text-muted-foreground">{t('linkChecker.foundIn', { count: target.occurrences.length })}</p>
        <ul className="space-y-0.5">
          {target.occurrences.map((link, index) => (
            <li key={link.index} className="flex items-center gap-2 rounded-md py-0.5 pr-0.5 pl-1.5 hover:bg-background">
              <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
              <SectionGlyph section={link.section} />
              <span className="shrink-0 text-muted-foreground">{t(`web.links.section.${link.section}`)}</span>
              <span className={cn('min-w-0 flex-1 truncate', !link.text && 'text-muted-foreground italic')}>
                {link.text || t('linkChecker.noText')}
              </span>
              {!link.visible && <EyeOffIcon className="size-3 shrink-0 text-muted-foreground" aria-label={t('web.links.flag.hidden')} />}
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6"
                aria-label={t('linkChecker.locateNumber', { number: index + 1 })}
                onClick={() => onLocate(link)}
              >
                <CrosshairIcon />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="xs" variant="outline" className="h-7 bg-background" onClick={() => onRecheck(target)} disabled={busy}>
          <RotateCcwIcon />
          {t('linkChecker.recheck')}
        </Button>
        {target.host && (
          <Button size="xs" variant="ghost" className="h-7" onClick={() => onSkipHost(target.host)}>
            <BanIcon />
            {t('linkChecker.skipSite', { host: target.host })}
          </Button>
        )}
      </div>
    </div>
  )
}
