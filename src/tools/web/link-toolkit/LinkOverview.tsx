import type { ComponentType, ReactNode } from 'react'
import {
  ActivityIcon,
  AlertOctagonIcon,
  CheckCircle2Icon,
  CopyIcon,
  EyeOffIcon,
  FileDownIcon,
  HashIcon,
  LockOpenIcon,
  ShieldOffIcon,
  SquareArrowOutUpRightIcon,
  TypeIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  LINK_FLAGS,
  LINK_TYPE_FILTERS,
  type LinkFlag,
  type LinkTypeFilter,
  type PageLinksSnapshot,
} from '@/core/engines/links/pageLinks'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { SiteAvatar } from './LinkVisuals'
import type { CheckProgress } from './useLinkChecks'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

const TYPE_COLOR: Record<Exclude<LinkTypeFilter, 'all'>, string> = {
  internal: 'bg-primary',
  external: 'bg-violet-500',
  anchor: 'bg-amber-500',
  contact: 'bg-emerald-500',
  other: 'bg-slate-400',
}

const FLAG_META: Record<LinkFlag, { icon: IconType; tone: 'danger' | 'warning' | 'neutral' }> = {
  broken: { icon: AlertOctagonIcon, tone: 'danger' },
  duplicates: { icon: CopyIcon, tone: 'neutral' },
  noText: { icon: TypeIcon, tone: 'warning' },
  brokenAnchor: { icon: HashIcon, tone: 'warning' },
  insecure: { icon: LockOpenIcon, tone: 'warning' },
  hidden: { icon: EyeOffIcon, tone: 'neutral' },
  nofollow: { icon: ShieldOffIcon, tone: 'neutral' },
  newTab: { icon: SquareArrowOutUpRightIcon, tone: 'neutral' },
  download: { icon: FileDownIcon, tone: 'neutral' },
}

export interface CheckSummary {
  ok: number
  broken: number
}

interface LinkOverviewProps {
  snapshot: PageLinksSnapshot
  stats: { unique: number; externalSites: number }
  typeCounts: Record<LinkTypeFilter, number>
  type: LinkTypeFilter
  onTypeChange: (type: LinkTypeFilter) => void
  flagCounts: Record<LinkFlag, number>
  flags: ReadonlySet<LinkFlag>
  onToggleFlag: (flag: LinkFlag) => void
  progress: CheckProgress | null
  summary: CheckSummary | null
  onCheck: () => void
  onCancelCheck: () => void
}

export function LinkOverview({
  snapshot,
  stats,
  typeCounts,
  type,
  onTypeChange,
  flagCounts,
  flags,
  onToggleFlag,
  progress,
  summary,
  onCheck,
  onCancelCheck,
}: LinkOverviewProps) {
  const { t } = useTranslation()
  const total = typeCounts.all
  const segments = LINK_TYPE_FILTERS.filter((item): item is Exclude<LinkTypeFilter, 'all'> => item !== 'all' && typeCounts[item] > 0)
  const chips = LINK_TYPE_FILTERS.filter((item) => item === 'all' || item === type || typeCounts[item] > 0)
  const visibleFlags = LINK_FLAGS.filter((flag) => flagCounts[flag] > 0 || flags.has(flag))
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <section className="space-y-3 rounded-xl border bg-card p-3 shadow-xs" aria-label={t('web.links.overview')}>
      <div className="flex items-center gap-2.5">
        <SiteAvatar host={snapshot.host} kind="internal" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-5 font-semibold">{snapshot.title || snapshot.host || snapshot.url}</p>
          <p className="truncate text-[11px] text-muted-foreground">{snapshot.host || snapshot.url}</p>
        </div>
        {!progress && (
          <Button size="xs" variant={summary ? 'outline' : 'default'} onClick={onCheck} disabled={total === 0}>
            <ActivityIcon />
            {summary ? t('web.links.recheck') : t('web.links.check')}
          </Button>
        )}
      </div>

      {progress && (
        <div className="space-y-1.5 rounded-lg bg-muted/50 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium tabular-nums" aria-live="polite">
              {t('web.links.checking', { done: progress.done, total: progress.total })}
            </span>
            <Button size="xs" variant="ghost" className="h-6 px-2" onClick={onCancelCheck}>
              <XIcon />
              {t('web.links.cancel')}
            </Button>
          </div>
          <div
            role="progressbar"
            aria-label={t('web.links.checkProgress')}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {summary && !progress && (
        <button
          type="button"
          onClick={() => summary.broken > 0 && onToggleFlag('broken')}
          disabled={summary.broken === 0}
          aria-pressed={summary.broken > 0 ? flags.has('broken') : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring',
            summary.broken > 0
              ? 'cursor-pointer bg-destructive/10 text-destructive hover:bg-destructive/15'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          )}
        >
          {summary.broken > 0 ? <AlertOctagonIcon className="size-4 shrink-0" aria-hidden /> : <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 font-medium">
            {summary.broken > 0
              ? t('web.links.checkSummary', { ok: summary.ok, broken: summary.broken })
              : t('web.links.allWorking', { count: summary.ok })}
          </span>
          {summary.broken > 0 && (
            <span className="shrink-0 text-[11px] underline-offset-2 hover:underline">
              {flags.has('broken') ? t('web.links.showAll') : t('web.links.showBroken')}
            </span>
          )}
        </button>
      )}

      <dl className="grid grid-cols-3 divide-x rounded-lg bg-muted/40 py-2 text-center">
        <Stat label={t('web.links.statTotal')} value={total} />
        <Stat label={t('web.links.statUnique')} value={stats.unique} />
        <Stat label={t('web.links.statSites')} value={stats.externalSites} />
      </dl>

      {total > 0 && (
        <div className="space-y-2">
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {segments.map((segment) => (
              <span
                key={segment}
                className={cn(
                  'h-full min-w-1 transition-opacity duration-200 first:rounded-l-full last:rounded-r-full motion-reduce:transition-none',
                  TYPE_COLOR[segment],
                  type !== 'all' && type !== segment && 'opacity-25',
                )}
                style={{ flexGrow: typeCounts[segment] }}
              />
            ))}
          </div>
          <div role="group" aria-label={t('web.links.typesLabel')} className="flex flex-wrap gap-1.5">
            {chips.map((item) => (
              <Chip key={item} pressed={type === item} onClick={() => onTypeChange(item)}>
                {item !== 'all' && <span className={cn('size-2 shrink-0 rounded-full', TYPE_COLOR[item])} aria-hidden />}
                {t(`web.links.type.${item}`)}
                <Count>{typeCounts[item]}</Count>
              </Chip>
            ))}
          </div>
        </div>
      )}

      {visibleFlags.length > 0 && (
        <div className="space-y-1.5 border-t pt-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">{t('web.links.quickFilters')}</p>
          <div role="group" aria-label={t('web.links.quickFilters')} className="flex flex-wrap gap-1.5">
            {visibleFlags.map((flag) => {
              const { icon: Icon, tone } = FLAG_META[flag]
              return (
                <Chip key={flag} pressed={flags.has(flag)} tone={tone} onClick={() => onToggleFlag(flag)}>
                  <Icon className="size-3 shrink-0" aria-hidden />
                  {t(`web.links.flag.${flag}`)}
                  <Count>{flagCounts[flag]}</Count>
                </Chip>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse px-1">
      <dt className="truncate text-[10px] text-muted-foreground">{label}</dt>
      <dd className="text-base leading-6 font-semibold tabular-nums">{value.toLocaleString()}</dd>
    </div>
  )
}

function Count({ children }: { children: number }) {
  return <span className="tabular-nums opacity-70">{children.toLocaleString()}</span>
}

function Chip({
  pressed,
  tone = 'neutral',
  onClick,
  children,
}: {
  pressed: boolean
  tone?: 'danger' | 'warning' | 'neutral'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
        !pressed && 'border-border bg-background text-foreground/80 hover:bg-accent hover:text-foreground',
        !pressed && tone === 'warning' && 'text-amber-700 dark:text-amber-400',
        !pressed && tone === 'danger' && 'text-destructive',
        pressed && tone === 'neutral' && 'border-primary/50 bg-primary/10 text-primary',
        pressed && tone === 'warning' && 'border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-300',
        pressed && tone === 'danger' && 'border-destructive/60 bg-destructive/12 text-destructive',
      )}
    >
      {children}
    </button>
  )
}
