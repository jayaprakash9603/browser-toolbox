import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon, HistoryIcon, LayoutGridIcon, SearchXIcon } from 'lucide-react'

import { ChipRail } from '@/shared/components/ChipRail'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { CATEGORY_META } from './toolMeta'
import { CatalogSearch, ToolIcon } from './ToolBar'
import { CATEGORIES, TOOLS, type Category, type ToolId, type ToolInfo } from './toolList'
import { useToolSearch } from './useToolSearch'

const SUGGESTIONS: ToolId[] = ['merge', 'compress', 'sign', 'pdf-to-word', 'jpg-to-pdf', 'split']

function ToolCard({ tool, index, onOpen }: { tool: ToolInfo; index: number; onOpen: (id: ToolId) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const name = t(`pdf.tools.${tool.id}.name`)
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: reduce ? 0 : Math.min(index, 12) * 0.025, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button
        type="button"
        onClick={() => onOpen(tool.id)}
        aria-label={t('pdf.ui.open', { tool: name })}
        className="group relative flex h-full w-full cursor-pointer items-start gap-2.5 rounded-xl border bg-card p-2.5 text-left shadow-xs outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
      >
        <ToolIcon id={tool.id} className="size-9 transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-4">
          <span className="text-[13px] leading-tight font-semibold">{name}</span>
          <span className="line-clamp-1 text-xs text-muted-foreground @[400px]:line-clamp-2">{t(`pdf.tools.${tool.id}.desc`)}</span>
        </span>
        <ArrowUpRightIcon
          className="absolute top-3 right-3 size-3.5 text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      </button>
    </motion.li>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  const { icon: Icon, tone } = CATEGORY_META[category]
  return (
    <span className={cn('flex size-5 items-center justify-center rounded-md', tone)} aria-hidden>
      <Icon className="size-3" />
    </span>
  )
}

const GRID = 'grid grid-cols-1 gap-2 @[400px]:grid-cols-2 @[760px]:grid-cols-3 @[1080px]:grid-cols-4'

/** Every tool, searchable and grouped by category. */
export function Catalog({ recent, onOpen }: { recent: ToolId[]; onOpen: (id: ToolId) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const search = useRef<HTMLInputElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const scrollArea = useRef<HTMLElement | null>(null)
  const matches = useToolSearch(query)
  const visible = category === 'all' ? matches : matches.filter((tool) => tool.category === category)
  const groups = query.trim()
    ? [{ category: null, tools: visible }]
    : CATEGORIES.filter((id) => category === 'all' || id === category).map((id) => ({ category: id, tools: visible.filter((tool) => tool.category === id) }))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== '/' || event.metaKey || event.ctrlKey || target?.closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      search.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let scroller = bar.current?.parentElement ?? null
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (!scroller) return
    const area = scroller
    scrollArea.current = area
    const onScroll = () => {
      const pinned = !!bar.current && area.scrollTop > 0 && bar.current.getBoundingClientRect().top - area.getBoundingClientRect().top <= 1
      setStuck((current) => (current === pinned ? current : pinned))
    }
    area.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      area.removeEventListener('scroll', onScroll)
      scrollArea.current = null
    }
  }, [])

  /** After a filter change, brings the first matching tools back up under the pinned bar. */
  const revealList = () => {
    const area = scrollArea.current
    const start = root.current
    if (!area || !start) return
    const offset = start.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop
    if (area.scrollTop > offset) area.scrollTo({ top: offset, behavior: reduce ? 'auto' : 'smooth' })
  }

  const pickCategory = (value: Category | 'all') => {
    setCategory(value)
    revealList()
  }

  const changeQuery = (value: string) => {
    setQuery(value)
    revealList()
  }

  const chips: { value: Category | 'all'; count: number }[] = [
    { value: 'all', count: matches.length },
    ...CATEGORIES.map((id) => ({ value: id, count: matches.filter((tool) => tool.category === id).length })),
  ]

  return (
    <div ref={root} className="flex flex-col gap-3">
      {/* Search and categories stay pinned while the tools scroll beneath them. */}
      <div
        ref={bar}
        data-stuck={stuck || undefined}
        className="sticky top-[calc(var(--density-page-pad)*-1)] z-10 -mx-[var(--density-page-pad)] -mt-2 flex flex-col gap-2 border-b border-transparent bg-background/90 px-[var(--density-page-pad)] pt-2 pb-2 backdrop-blur-md transition-[border-color,box-shadow] duration-200 data-[stuck]:border-border data-[stuck]:shadow-[0_6px_12px_-10px_rgb(0_0_0/0.25)]"
      >
        <CatalogSearch value={query} onChange={changeQuery} inputRef={search} />
        <ChipRail role="tablist" label={t('pdf.ui.categoriesLabel')}>
          {chips.map(({ value, count }) => {
            const active = value === category
            const Icon = value === 'all' ? LayoutGridIcon : CATEGORY_META[value].icon
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                title={value === 'all' ? undefined : t(`pdf.cat.${value}`)}
                onClick={() => pickCategory(value)}
                disabled={!count && !active}
                className={cn(
                  'relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-200 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40',
                  active ? 'border-transparent text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="pdf-catalog-chip"
                    className="absolute inset-0 rounded-full bg-primary shadow-sm"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
                    aria-hidden
                  />
                )}
                <Icon className="relative size-3.5" aria-hidden />
                <span className="relative">{value === 'all' ? t('pdf.ui.all') : t(`pdf.catShort.${value}`)}</span>
                <span
                  className={cn(
                    'relative min-w-4 rounded-full px-1 text-center text-[10px] leading-4 tabular-nums',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </ChipRail>
      </div>

      {recent.length > 0 && !query.trim() && category === 'all' && (
        <div className="flex items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground" title={t('pdf.ui.recent')}>
            <HistoryIcon className="size-3.5" aria-hidden />
            <span className="hidden @[420px]:inline">{t('pdf.ui.recent')}</span>
          </span>
          <ChipRail className="flex-1" role="group" label={t('pdf.ui.recent')}>
            {recent.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpen(id)}
                className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border bg-card pr-2.5 pl-1 text-[11px] font-medium whitespace-nowrap outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ToolIcon id={id} className="size-5 rounded-full" />
                {t(`pdf.tools.${id}.name`)}
              </button>
            ))}
          </ChipRail>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-4 py-10 text-center" role="status">
          <SearchXIcon className="size-7 text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{t('pdf.ui.noResults', { query })}</p>
            <p className="text-xs text-muted-foreground">{t('pdf.ui.noResultsHint')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpen(id)}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border bg-card pr-2.5 pl-1 text-[11px] font-medium outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ToolIcon id={id} className="size-5 rounded-full" />
                {t(`pdf.tools.${id}.name`)}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setQuery('')
              setCategory('all')
            }}
          >
            {t('pdf.ui.clearSearch')}
          </Button>
        </div>
      ) : (
        groups.map(({ category: id, tools }) =>
          tools.length ? (
            <section key={id ?? 'results'} className="flex flex-col gap-2" aria-labelledby={id ? `pdf-cat-${id}` : undefined}>
              {id && (
                <h3 id={`pdf-cat-${id}`} className="flex items-center gap-2 px-0.5 text-xs font-semibold text-muted-foreground">
                  <CategoryBadge category={id} />
                  <span className="text-foreground">{t(`pdf.cat.${id}`)}</span>
                  <span className="tabular-nums">{tools.length}</span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </h3>
              )}
              <ul className={GRID}>
                {tools.map((tool, index) => (
                  <ToolCard key={tool.id} tool={tool} index={index} onOpen={onOpen} />
                ))}
              </ul>
            </section>
          ) : null,
        )
      )}
      <p className="text-center text-[11px] text-muted-foreground">{t('pdf.ui.footer', { count: TOOLS.length })}</p>
    </div>
  )
}
