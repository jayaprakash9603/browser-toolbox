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
      {/* The top pick fills a 2×2 block from 560px, so eight tiles complete 4 columns in three rows and 6 columns in two. */}
      <div className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4 @[960px]:grid-cols-6">
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
      className="group relative col-span-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)] outline-none transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-ring @[560px]:row-span-2 @[560px]:grid-rows-[auto_1fr_auto] @[560px]:gap-x-2.5 @[560px]:p-3.5"
      style={{
        background:
          'linear-gradient(120deg, color-mix(in srgb, var(--tile-1) 14%, var(--card)), var(--card) 70%)',
      }}
    >
      <Icon
        aria-hidden
        className="pointer-events-none absolute -end-5 -bottom-7 hidden size-28 -rotate-12 text-[var(--tile-1)] opacity-[0.08] transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none @[560px]:block"
      />
      <span
        className="col-start-1 row-span-3 row-start-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm @[560px]:row-span-1 @[560px]:size-9"
        style={{ background: 'linear-gradient(145deg, var(--tile-1), var(--tile-3))' }}
      >
        <Icon className="size-5 @[560px]:size-4" aria-hidden />
      </span>
      <span className="col-start-2 row-start-1 mb-0.5 inline-flex items-center self-end justify-self-start rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tracking-wide text-primary uppercase @[560px]:mb-0 @[560px]:self-center">
        {t('home.topPick')}
      </span>
      <span className="relative col-start-2 row-start-2 truncate text-sm font-semibold @[560px]:col-span-3 @[560px]:col-start-1 @[560px]:mt-3 @[560px]:self-end @[560px]:text-[15px]">
        {name}
      </span>
      <span className="relative col-start-2 row-start-3 line-clamp-2 self-start text-xs leading-snug text-muted-foreground @[560px]:col-span-3 @[560px]:col-start-1 @[560px]:mt-0.5">
        {description}
      </span>
      <ArrowRightIcon
        className="col-start-3 row-span-3 row-start-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none @[560px]:row-span-1"
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
      className="group flex min-h-12 min-w-0 items-center gap-2 @[560px]:min-h-14 rounded-xl border bg-card p-2 shadow-xs outline-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/35 hover:bg-accent/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
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
