import { ArrowRightIcon, FlameIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { getHomePopularTools, tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

const COMPACT_LIMIT = 8

export function PopularTools({ delay = 0.24 }: { delay?: number }) {
  const { t } = useTranslation()
  const [featured, ...rest] = getHomePopularTools()
  if (!featured) return null

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.popularTools')} icon={FlameIcon} />
      <div className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4">
        <FeaturedTile tool={featured} />
        {rest.slice(0, COMPACT_LIMIT).map((tool, index) => (
          <CompactTile key={tool.id} tool={tool} color={tileColor(index + 1)} />
        ))}
      </div>
    </SlideUp>
  )
}

function preloadHandler(tool: ToolDefinition) {
  return () => {
    void tool.loader()
  }
}

function FeaturedTile({ tool }: { tool: ToolDefinition }) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  const preload = preloadHandler(tool)
  return (
    <Link
      to={tool.route}
      onPointerEnter={preload}
      onFocus={preload}
      className="group relative col-span-2 flex items-center gap-3 overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)] outline-none transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background:
          'linear-gradient(120deg, color-mix(in srgb, var(--tile-1) 14%, var(--card)), var(--card) 70%)',
      }}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ background: 'linear-gradient(145deg, var(--tile-1), var(--tile-3))' }}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
          {t('home.topPick')}
        </span>
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{description}</span>
      </span>
      <ArrowRightIcon
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  )
}

function CompactTile({ tool, color }: { tool: ToolDefinition; color: string }) {
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  const preload = preloadHandler(tool)
  return (
    <Link
      to={tool.route}
      title={description}
      onPointerEnter={preload}
      onFocus={preload}
      className="group flex min-h-12 min-w-0 items-center gap-2 rounded-xl border bg-card p-2 shadow-xs outline-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/35 hover:bg-accent/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="line-clamp-2 min-w-0 text-xs leading-tight font-medium">{name}</span>
    </Link>
  )
}
