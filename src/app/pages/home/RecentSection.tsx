import { ChevronRightIcon, ClockIcon, HistoryIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { toolRegistry, type ToolDefinition } from '@/core/registry'
import { formatRelativeTime } from '@/app/pages/home/formatRelativeTime'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { useRecentTools } from '@/shared/hooks/useRecentTools'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

interface RecentSectionProps {
  delay?: number
  limit?: number
  showViewAll?: boolean
}

export function RecentSection({ delay = 0.12, limit = 4, showViewAll = true }: RecentSectionProps) {
  const { t } = useTranslation()
  const { recent } = useRecentTools()

  const entries = useMemo(
    () =>
      recent.slice(0, limit).flatMap((entry) => {
        const tool = toolRegistry.get(entry.toolId)
        return tool ? [{ tool, openedAt: entry.openedAt }] : []
      }),
    [recent, limit],
  )

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader
        title={t('home.recentlyUsed')}
        icon={ClockIcon}
        action={showViewAll && recent.length > 0 ? { to: '/recent', label: t('home.viewAll') } : undefined}
        count={recent.length}
      />
      {entries.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-3 py-3">
          <HistoryIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-tool-name">{t('home.noRecent')}</p>
            <p className="text-tool-desc">{t('home.noRecentHint')}</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          {entries.map(({ tool, openedAt }) => (
            <li key={tool.id}>
              <RecentRow tool={tool} openedAt={openedAt} />
            </li>
          ))}
        </ul>
      )}
    </SlideUp>
  )
}

function RecentRow({ tool, openedAt }: { tool: ToolDefinition; openedAt: number }) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const { name } = useToolLabels(tool)
  const category = t(`categories.${tool.category}.name`, { defaultValue: tool.category })
  const preload = () => {
    void tool.loader()
  }
  return (
    <Link
      to={tool.route}
      onPointerEnter={preload}
      onFocus={preload}
      className="group flex min-h-11 items-center gap-2.5 px-2.5 py-2 outline-none transition-colors duration-150 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-tight font-medium">{name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{category}</span>
      </span>
      <time
        dateTime={new Date(openedAt).toISOString()}
        className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
      >
        {formatRelativeTime(openedAt)}
      </time>
      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  )
}
