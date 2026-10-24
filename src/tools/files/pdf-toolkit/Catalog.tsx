import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon, HistoryIcon, LayoutGridIcon, SearchXIcon } from 'lucide-react'

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
        className="group relative flex h-full w-full cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3 text-left shadow-xs outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
      >
        <ToolIcon id={tool.id} className="size-10 transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-4">
          <span className="text-sm leading-tight font-semibold">{name}</span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{t(`pdf.tools.${tool.id}.desc`)}</span>
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

const GRID = 'grid grid-cols-1 gap-2.5 @[460px]:grid-cols-2 @[780px]:grid-cols-3 @[1120px]:grid-cols-4'

/** Every tool, searchable and grouped by category. */
export function Catalog({ recent, onOpen }: { recent: ToolId[]; onOpen: (id: ToolId) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const search = useRef<HTMLInputElement>(null)
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

  const chips: { value: Category | 'all'; count: number }[] = [
    { value: 'all', count: matches.length },
    ...CATEGORIES.map((id) => ({ value: id, count: matches.filter((tool) => tool.category === id).length })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <CatalogSearch value={query} onChange={setQuery} inputRef={search} />
        <div role="tablist" aria-label={t('pdf.ui.categoriesLabel')} className="flex flex-wrap gap-1.5">
          {chips.map(({ value, count }) => {
            const active = value === category
            const Icon = value === 'all' ? LayoutGridIcon : CATEGORY_META[value].icon
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(value)}
                disabled={!count && !active}
                className={cn(
                  'relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-colors duration-200 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40',
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
                <span className="relative">{value === 'all' ? t('pdf.ui.all') : t(`pdf.cat.${value}`)}</span>
                <span className={cn('relative tabular-nums', active ? 'text-primary-foreground/75' : 'text-muted-foreground/70')}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {recent.length > 0 && !query.trim() && category === 'all' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <HistoryIcon className="size-3.5" aria-hidden />
            {t('pdf.ui.recent')}
          </span>
          {recent.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border bg-card pr-2.5 pl-1 text-[11px] font-medium outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ToolIcon id={id} className="size-5 rounded-full" />
              {t(`pdf.tools.${id}.name`)}
            </button>
          ))}
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
