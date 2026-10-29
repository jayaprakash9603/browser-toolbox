import { ArrowRightIcon, FlameIcon } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { getHomePopularTools, tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'

const DISPLAY_LIMIT = 9
const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.85 }

export function PopularTools({ delay = 0.24 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getHomePopularTools().slice(0, DISPLAY_LIMIT)
  const defaultFeaturedId = tools[0]?.id ?? null
  const [featuredId, setFeaturedId] = useState<string | null>(defaultFeaturedId)

  const resetFeatured = useCallback(() => {
    setFeaturedId(defaultFeaturedId)
  }, [defaultFeaturedId])

  if (!tools[0]) return null

  const activeId = featuredId ?? defaultFeaturedId

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.popularTools')} icon={FlameIcon} />
      <PopularToolsGrid
        tools={tools}
        activeId={activeId}
        onHover={setFeaturedId}
        onLeave={resetFeatured}
      />
    </SlideUp>
  )
}

function PopularToolsGrid({
  tools,
  activeId,
  onHover,
  onLeave,
}: {
  tools: ToolDefinition[]
  activeId: string
  onHover: (id: string) => void
  onLeave: () => void
}) {
  const reduce = useReducedMotion()

  return (
    <LayoutGroup id="popular-tools">
      <motion.div
        layout
        className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4 @[960px]:grid-cols-6"
        onPointerLeave={onLeave}
      >
        {tools.map((tool, index) => (
          <PopularToolTile
            key={tool.id}
            tool={tool}
            expanded={tool.id === activeId}
            showTopPick={index === 0 && tool.id === activeId}
            color={tileColor(index)}
            onActivate={() => onHover(tool.id)}
            layoutTransition={reduce ? { duration: 0 } : LAYOUT_SPRING}
          />
        ))}
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
  onActivate,
  layoutTransition,
}: {
  tool: ToolDefinition
  expanded: boolean
  showTopPick: boolean
  color: string
  onActivate: () => void
  layoutTransition: typeof LAYOUT_SPRING | { duration: number }
}) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  const preload = preloadHandler(tool)

  return (
    <motion.div
      layout
      layoutDependency={expanded}
      transition={{ layout: layoutTransition }}
      className={cn(
        'relative min-w-0',
        expanded && 'z-[1] col-span-2 @[560px]:row-span-2',
      )}
      onPointerEnter={onActivate}
    >
      <Link
        to={tool.route}
        title={expanded ? undefined : description}
        onPointerEnter={preload}
        onFocus={() => {
          onActivate()
          preload()
        }}
        className={cn(
          'group relative flex h-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring',
          expanded
            ? 'min-h-[4.5rem] grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] items-center gap-x-3 overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] @[560px]:min-h-0 @[560px]:grid-rows-[auto_1fr_auto] @[560px]:gap-x-2.5 @[560px]:p-3.5'
            : 'flex min-h-12 items-center gap-2 rounded-xl border bg-card p-2 shadow-xs transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/35 hover:bg-accent/40 hover:shadow-sm active:scale-[0.98] @[560px]:min-h-14',
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
              className="pointer-events-none absolute -end-5 -bottom-7 hidden size-28 -rotate-12 opacity-[0.08] transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none @[560px]:block"
              style={{ color }}
            />
            <motion.span
              layout="position"
              className="col-start-1 row-start-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm @[560px]:row-span-1 @[560px]:size-9"
              style={{ background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 55%, black))` }}
            >
              <Icon className="size-5 @[560px]:size-4" aria-hidden />
            </motion.span>
            <AnimatePresence mode="popLayout" initial={false}>
              {showTopPick ? (
                <motion.span
                  key="top-pick"
                  initial={{ opacity: 0, y: -4, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.92 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="col-start-2 row-start-1 mb-0.5 inline-flex items-center self-end justify-self-start rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tracking-wide text-primary uppercase @[560px]:mb-0 @[560px]:self-center"
                >
                  {t('home.topPick')}
                </motion.span>
              ) : (
                <span key="spacer" className="col-start-2 row-start-1 hidden @[560px]:block" />
              )}
            </AnimatePresence>
            <motion.span
              layout="position"
              className="relative col-start-2 row-start-2 truncate text-sm font-semibold @[560px]:col-span-3 @[560px]:col-start-1 @[560px]:mt-3 @[560px]:self-end @[560px]:text-[15px]"
            >
              {name}
            </motion.span>
            <motion.span
              layout="position"
              className="relative col-start-2 row-start-3 line-clamp-2 self-start text-xs leading-snug text-muted-foreground @[560px]:col-span-3 @[560px]:col-start-1 @[560px]:mt-0.5"
            >
              {description}
            </motion.span>
            <ArrowRightIcon
              className="col-start-3 row-start-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none @[560px]:row-span-1"
              aria-hidden
            />
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
