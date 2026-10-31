import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MotionConfig, motion } from 'motion/react'
import { GalleryHorizontalEndIcon, SearchXIcon } from 'lucide-react'

import { useRememberedState, useScrollMemory } from '@/app/navigationMemory'
import { CategoryViewer } from '@/app/pages/all-tools/CategoryViewer'
import { ToolRow, type Row } from '@/app/pages/all-tools/ToolRow'
import { ALL_CATALOG as ALL, useToolCatalog } from '@/app/pages/all-tools/useToolCatalog'
import { getUserCategoryIdForTool } from '@/core/registry/userCategories'
import { BackButton } from '@/shared/components/BackButton'
import { ChipRail } from '@/shared/components/ChipRail'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { cn } from '@/shared/utils/cn'

const EASE = [0.22, 1, 0.36, 1] as const

export default function AllToolsPage() {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useRememberedState('allTools.query', '')
  const [filter, setFilter] = useRememberedState<string>('allTools.filter', ALL)
  const [viewerOpen, setViewerOpen] = useState(false)
  const scrollRef = useScrollMemory<HTMLDivElement>()
  const { categories, rows, sections } = useToolCatalog()

  const search = query.trim().toLowerCase()
  const visible = rows.filter(
    (row) =>
      (filter === ALL || getUserCategoryIdForTool(row.tool) === filter) &&
      (!search || row.haystack.includes(search)),
  )
  const groups = groupByLetter(visible, i18n.language)

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={scrollRef}
        className="scrollbar-styled @container h-full overflow-x-clip overflow-y-auto px-[var(--density-page-pad)] pt-2 pb-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="sticky top-0 z-10 -mx-[var(--density-page-pad)] border-b bg-background px-[var(--density-page-pad)] pt-1 pb-2 backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <BackButton to="/" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-[15px] font-semibold tracking-tight">{t('allTools.title')}</h1>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums">
                      {rows.length}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {t('allTools.heroBody', { categories: categories.length })}
                  </p>
                </div>
              </div>
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('allTools.search')}
                ariaLabel={t('allTools.search')}
                shortcut="/"
              />
              <div className="flex items-center gap-1.5">
                <ChipRail role="group" label={t('allTools.filter')} edgeFade={false} className="min-w-0 flex-1">
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
                        <Icon className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">{name}</span>
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
                  className="group flex size-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground outline-none transition-[color,border-color,background-color] duration-200 hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:active:scale-100"
                >
                  <GalleryHorizontalEndIcon
                    className="size-3.5 transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none"
                    aria-hidden
                  />
                </button>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground tabular-nums" aria-live="polite">
                {t('allTools.results', { count: visible.length })}
              </p>
            </div>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={t('allTools.noMatches', { query: query.trim() })}
              description={t('allTools.noMatchesHint')}
            />
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              {groups.map(({ letter, items, offset }) => (
                <section key={letter} aria-labelledby={`all-tools-${letter}`}>
                  <h2 id={`all-tools-${letter}`} className="-mx-1 mb-1.5 flex items-center gap-2 px-1 pt-0.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background">
                      {letter}
                    </span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{items.length}</span>
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
        'flex h-8 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
      )}
    >
      {children}
      <span
        className={cn(
          'shrink-0 text-[10px] tabular-nums',
          active ? 'text-background/70' : 'text-muted-foreground/70',
        )}
      >
        {count}
      </span>
    </button>
  )
}
