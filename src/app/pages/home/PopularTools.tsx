import { ArrowRightIcon, FlameIcon } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { getHomePopularTools, tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'

const DISPLAY_LIMIT = 9
const LAYOUT_SLOW = { duration: 1.05, ease: [0.22, 1, 0.36, 1] as const }
const CONTENT_SLOW = { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const }

function orderToolsWithFeaturedFirst(tools: ToolDefinition[], activeId: string) {
  const featured = tools.find((tool) => tool.id === activeId)
  if (!featured) return tools
  return [featured, ...tools.filter((tool) => tool.id !== activeId)]
}

export function PopularTools({ delay = 0.24 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getHomePopularTools().slice(0, DISPLAY_LIMIT)
  const topPickId = tools[0]?.id ?? null
  const [featuredId, setFeaturedId] = useState<string | null>(topPickId)

  if (!tools[0] || !topPickId) return null

  const activeId = featuredId ?? topPickId

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.popularTools')} icon={FlameIcon} />
      <PopularToolsGrid
        tools={tools}
        activeId={activeId}
        topPickId={topPickId}
        onSelect={setFeaturedId}
      />
    </SlideUp>
  )
}

function PopularToolsGrid({
  tools,
  activeId,
  topPickId,
  onSelect,
}: {
  tools: ToolDefinition[]
  activeId: string
  topPickId: string
  onSelect: (id: string) => void
}) {
  const reduce = useReducedMotion()
  const layoutTransition = reduce ? { duration: 0 } : LAYOUT_SLOW
  const orderedTools = useMemo(
    () => orderToolsWithFeaturedFirst(tools, activeId),
    [tools, activeId],
  )
  const colorIndexById = useMemo(
    () => new Map(tools.map((tool, index) => [tool.id, index])),
    [tools],
  )

  return (
    <LayoutGroup id="popular-tools">
      <motion.div
        layout
        className="relative isolate grid w-full grid-flow-row-dense grid-cols-2 gap-2 overflow-hidden @[560px]:grid-cols-4 @[560px]:auto-rows-[minmax(3.25rem,auto)] @[960px]:grid-cols-6"
      >
        {orderedTools.map((tool) => {
          const expanded = tool.id === activeId
          const colorIndex = colorIndexById.get(tool.id) ?? 0
          return (
            <PopularToolTile
              key={tool.id}
              tool={tool}
              expanded={expanded}
              showTopPick={expanded && tool.id === topPickId}
              color={tileColor(colorIndex)}
              onSelect={() => onSelect(tool.id)}
              layoutTransition={layoutTransition}
            />
          )
        })}
      </motion.div>
    </LayoutGroup>
  )
}

function preloadHandler(tool: ToolDefinition) {
  return () => {
    void tool.loader()
  }
}

function PopularToolTile({
  tool,
  expanded,
  showTopPick,
  color,
  onSelect,
  layoutTransition,
}: {
  tool: ToolDefinition
  expanded: boolean
  showTopPick: boolean
  color: string
  onSelect: () => void
  layoutTransition: typeof LAYOUT_SLOW | { duration: number }
}) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  const preload = preloadHandler(tool)

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!expanded) {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <motion.div
      layout
      layoutDependency={expanded}
      transition={{ layout: layoutTransition }}
      className={cn(
        'relative min-h-0 min-w-0 max-w-full',
        expanded
          ? 'col-span-2 row-span-1 @[560px]:row-span-2'
          : 'col-span-1 row-span-1',
      )}
    >
      <Link
        to={tool.route}
        title={expanded ? undefined : description}
        aria-expanded={expanded}
        onClick={handleClick}
        onPointerEnter={preload}
        onFocus={preload}
        className={cn(
          'group relative flex h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          expanded
            ? 'box-border grid min-h-[4.75rem] grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] items-center gap-x-2.5 gap-y-0.5 rounded-2xl border p-3 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] @[560px]:h-full @[560px]:min-h-0 @[560px]:p-3.5'
            : 'min-h-12 items-center gap-2 rounded-xl border bg-card p-2 shadow-xs transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/35 hover:bg-accent/40 hover:shadow-sm active:scale-[0.98] @[560px]:min-h-14',
        )}
        style={
          expanded
            ? {
                background: `linear-gradient(120deg, color-mix(in srgb, ${color} 14%, var(--card)), var(--card) 70%)`,
              }
            : undefined
        }
      >
        {expanded ? (
          <>
            <Icon
              aria-hidden
              className="pointer-events-none absolute end-0 bottom-0 hidden size-20 translate-x-1/5 translate-y-1/5 -rotate-12 opacity-[0.08] motion-reduce:transition-none @[560px]:block"
              style={{ color }}
            />
            <span
              className="col-start-1 row-start-1 flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm @[560px]:size-9"
              style={{ background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 55%, black))` }}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              {showTopPick ? (
                <motion.span
                  key="top-pick"
                  initial={{ opacity: 0, y: -4, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.92 }}
                  transition={CONTENT_SLOW}
                  className="col-start-2 row-start-1 inline-flex max-w-full items-center self-center justify-self-start truncate rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tracking-wide text-primary uppercase"
                >
                  {t('home.topPick')}
                </motion.span>
              ) : (
                <span key="spacer" className="col-start-2 row-start-1 hidden min-h-0 @[560px]:block" aria-hidden />
              )}
            </AnimatePresence>
            <ArrowRightIcon
              className="col-start-3 row-start-1 size-4 shrink-0 justify-self-end text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
              aria-hidden
            />
            <span className="relative col-start-1 col-end-4 row-start-2 min-w-0 truncate text-sm font-semibold @[560px]:mt-2 @[560px]:text-[15px]">
              {name}
            </span>
            <span className="relative col-start-1 col-end-4 row-start-3 min-w-0 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {description}
            </span>
          </>
        ) : (
          <>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="line-clamp-2 min-w-0 text-xs leading-tight font-medium">{name}</span>
          </>
        )}
      </Link>
    </motion.div>
  )
}
