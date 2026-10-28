import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MotionConfig, motion, useAnimate, useReducedMotion } from 'motion/react'
import { BlocksIcon, GalleryHorizontalEndIcon, LayoutGridIcon, SearchXIcon } from 'lucide-react'

import { useRememberedState, useScrollMemory } from '@/app/navigationMemory'
import { CategoryViewer, type ViewerSection } from '@/app/pages/all-tools/CategoryViewer'
import { ToolRow, type Row } from '@/app/pages/all-tools/ToolRow'
import { categoryRegistry, toolRegistry, type ToolDefinition } from '@/core/registry'
import { getToolDescription, getToolName, getToolSearchLabels } from '@/i18n/toolLabels'
import { BackButton } from '@/shared/components/BackButton'
import { ChipRail } from '@/shared/components/ChipRail'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { cn } from '@/shared/utils/cn'

const EASE = [0.22, 1, 0.36, 1] as const
const MARQUEE_PER_ROW = 22
const ALL = 'all'

export default function AllToolsPage() {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useRememberedState('allTools.query', '')
  const [filter, setFilter] = useRememberedState<string>('allTools.filter', ALL)
  const [viewerOpen, setViewerOpen] = useState(false)
  const scrollRef = useScrollMemory<HTMLDivElement>()

  const categories = useMemo(
    () =>
      [...categoryRegistry.getAll()]
        .sort((a, b) => a.order - b.order)
        .map((category) => ({
          category,
          name: t(`categories.${category.id}.name`, { defaultValue: category.name }),
          count: toolRegistry.getByCategory(category.id).length,
        }))
        .filter((entry) => entry.count > 0),
    [t],
  )

  const rows = useMemo<Row[]>(() => {
    const categoryNames = new Map(categories.map((entry) => [entry.category.id, entry.name]))
    return toolRegistry
      .getAll()
      .map((tool) => {
        const name = getToolName(tool, t)
        const description = getToolDescription(tool, t)
        const categoryName = categoryNames.get(tool.category) ?? tool.category
        return {
          tool,
          name,
          description,
          categoryName,
          haystack: [name, description, categoryName, ...getToolSearchLabels(tool), ...tool.keywords]
            .join(' ')
            .toLowerCase(),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language))
  }, [categories, t, i18n.language])

  const sections = useMemo<ViewerSection[]>(
    () => [
      {
        id: ALL,
        name: t('allTools.all'),
        description: t('allTools.viewer.allDescription'),
        icon: LayoutGridIcon,
        rows,
      },
      ...categories.map(({ category, name }) => ({
        id: category.id,
        name,
        description: t(`categories.${category.id}.description`, { defaultValue: category.description }),
        icon: category.icon,
        rows: rows.filter((row) => row.tool.category === category.id),
      })),
    ],
    [categories, rows, t],
  )

  const search = query.trim().toLowerCase()
  const visible = rows.filter(
    (row) => (filter === ALL || row.tool.category === filter) && (!search || row.haystack.includes(search)),
  )
  const groups = groupByLetter(visible, i18n.language)

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={scrollRef}
        className="scrollbar-styled @container h-full overflow-x-clip overflow-y-auto px-[var(--density-page-pad)] pt-3 pb-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="flex items-center gap-2">
            <BackButton to="/" />
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{t('allTools.title')}</h1>
            <span className="rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums">
              {rows.length}
            </span>
          </div>

          <Hero tools={rows.map((row) => row.tool)} categoryCount={categories.length} />

          <div className="flex flex-col gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t('allTools.search')}
              ariaLabel={t('allTools.search')}
              shortcut="/"
            />
            <div className="flex items-center gap-1.5">
              <ChipRail role="group" label={t('allTools.filter')} className="flex-1">
                <FilterChip active={filter === ALL} count={rows.length} onClick={() => setFilter(ALL)}>
                  {t('allTools.all')}
                </FilterChip>
                {categories.map(({ category, name, count }) => {
                  const Icon = category.icon
                  return (
                    <FilterChip
                      key={category.id}
                      active={filter === category.id}
                      count={count}
                      onClick={() => setFilter(filter === category.id ? ALL : category.id)}
                    >
                      <Icon className="size-3" aria-hidden />
                      {name}
                    </FilterChip>
                  )
                })}
              </ChipRail>
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={viewerOpen}
                aria-label={t('allTools.viewer.open')}
                title={t('allTools.viewer.open')}
                className="group flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground outline-none transition-[color,border-color,background-color] duration-200 hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:active:scale-100"
              >
                <GalleryHorizontalEndIcon
                  className="size-3.5 transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none"
                  aria-hidden
                />
              </button>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {t('allTools.results', { count: visible.length })}
          </p>

          {groups.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={t('allTools.noMatches', { query: query.trim() })}
              description={t('allTools.noMatchesHint')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map(({ letter, items, offset }) => (
                <section key={letter} aria-labelledby={`all-tools-${letter}`}>
                  <h2
                    id={`all-tools-${letter}`}
                    className="sticky top-0 z-10 -mx-1 mb-1.5 flex items-center gap-2 bg-background px-1 pt-2 pb-1.5"
                  >
                    <span className="flex size-6 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background">
                      {letter}
                    </span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                      {items.length}
                    </span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-1.5 @[560px]:grid-cols-2">
                    {items.map((row, index) => (
                      <motion.li
                        key={row.tool.id}
                        className="min-w-0"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: EASE, delay: Math.min(offset + index, 18) * 0.02 }}
                      >
                        <ToolRow row={row} showCategory={filter === ALL} />
                      </motion.li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
      <CategoryViewer
        open={viewerOpen}
        sections={sections}
        initialId={filter}
        onClose={(id) => {
          setFilter(id)
          setViewerOpen(false)
        }}
      />
    </MotionConfig>
  )
}

function groupByLetter(rows: readonly Row[], locale: string) {
  const groups: { letter: string; items: Row[]; offset: number }[] = []
  let offset = 0
  for (const row of rows) {
    const first = row.name.charAt(0).toLocaleUpperCase(locale)
    const letter = /\p{L}/u.test(first) ? first : '#'
    const last = groups.at(-1)
    if (last?.letter === letter) last.items.push(row)
    else groups.push({ letter, items: [row], offset })
    offset += 1
  }
  return groups
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
      )}
    >
      {children}
      <span className={cn('text-[10px] tabular-nums', active ? 'text-background/70' : 'text-muted-foreground/70')}>
        {count}
      </span>
    </button>
  )
}

/** Title card over two rows of tool icons drifting in opposite directions. Hover pauses the drift. */
function Hero({ tools, categoryCount }: { tools: readonly ToolDefinition[]; categoryCount: number }) {
  const { t } = useTranslation()
  const [paused, setPaused] = useState(false)
  const top = tools.filter((_, index) => index % 2 === 0).slice(0, MARQUEE_PER_ROW)
  const bottom = tools.filter((_, index) => index % 2 === 1).slice(0, MARQUEE_PER_ROW)

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-3xl border bg-card"
    >
      <div className="px-4 pt-4 @[420px]:px-5 @[420px]:pt-5">
        <span className="mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
          <BlocksIcon className="size-3" aria-hidden />
          {t('allTools.eyebrow')}
        </span>
        <h2 className="text-lg leading-tight font-semibold tracking-tight text-balance @[420px]:text-xl">
          {t('allTools.heroTitle', { count: tools.length })}
        </h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {t('allTools.heroBody', { categories: categoryCount })}
        </p>
      </div>
      <div
        aria-hidden
        className="mt-4 flex flex-col gap-2 pb-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
      >
        <MarqueeRow tools={top} paused={paused} />
        <MarqueeRow tools={bottom} paused={paused} reverse />
      </div>
    </motion.section>
  )
}

function MarqueeRow({
  tools,
  paused,
  reverse = false,
}: {
  tools: readonly ToolDefinition[]
  paused: boolean
  reverse?: boolean
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduceMotion = useReducedMotion()
  const controls = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(() => {
    if (reduceMotion || !scope.current) return
    const animation = animate(
      scope.current,
      { x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] },
      { duration: tools.length * 2.4, ease: 'linear', repeat: Infinity },
    )
    controls.current = animation
    return () => {
      animation.stop()
      controls.current = null
    }
  }, [animate, scope, reduceMotion, reverse, tools.length])

  useEffect(() => {
    if (paused) controls.current?.pause()
    else controls.current?.play()
  }, [paused])

  return (
    <div ref={scope} className="flex w-max gap-2 will-change-transform">
      {[...tools, ...tools].map((tool, index) => {
        const Icon = tool.icon
        return (
          <span
            key={`${tool.id}-${index}`}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-foreground/70 [&_svg]:size-[18px]',
              index % 5 === 2 && 'border-primary/30 bg-primary/10 text-primary',
            )}
          >
            <Icon />
          </span>
        )
      })}
    </div>
  )
}
