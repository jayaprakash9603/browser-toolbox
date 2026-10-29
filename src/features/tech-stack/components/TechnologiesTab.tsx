import { SearchIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryLabel } from '@/core/engines/techStack/categories'
import { groupHitsByCategory } from '@/core/engines/techStack/detect'
import type { TechCategoryId, TechHit } from '@/core/engines/techStack/types'
import { ChipRail } from '@/shared/components/ChipRail'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import { TechIcon } from './TechIcon'

function TechRow({ hit }: { hit: TechHit }) {
  const { t } = useTranslation()
  const title = hit.implied ? t('techStack.impliedHint') : hit.evidence

  return (
    <motion.li
      layout="position"
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-transparent px-1.5 py-1.5 transition-[border-color,background-color] duration-150 hover:border-border/80 hover:bg-accent/30"
      title={title}
    >
      <TechIcon name={hit.name} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {hit.website ? (
          <a
            href={hit.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('techStack.openSite', { name: hit.name })}
            className="min-w-0 text-[13px] leading-tight text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {hit.name}
          </a>
        ) : (
          <span className="min-w-0 text-[13px] leading-tight font-medium">{hit.name}</span>
        )}
        {hit.version && (
          <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal">
            {hit.version}
          </Badge>
        )}
        {hit.implied && (
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase">{t('techStack.implied')}</span>
        )}
      </div>
    </motion.li>
  )
}

function matchesQuery(hit: TechHit, query: string): boolean {
  if (!query) return true
  const hay = `${hit.name} ${hit.category} ${hit.evidence}`.toLowerCase()
  return hay.includes(query)
}

function CategoryBlock({ category, groupHits }: { category: TechCategoryId; groupHits: TechHit[] }) {
  return (
    <section className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card/60 shadow-xs">
      <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <h3 className="text-xs font-semibold tracking-tight text-foreground/90">{categoryLabel(category)}</h3>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal tabular-nums">
          {groupHits.length}
        </Badge>
      </header>
      <ul className="px-1.5 py-1">
        {groupHits.map((hit) => (
          <TechRow key={hit.name} hit={hit} />
        ))}
      </ul>
    </section>
  )
}

export function TechnologiesTab({ hits }: { hits: TechHit[] }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TechCategoryId | 'all'>('all')

  const normalizedQuery = query.trim().toLowerCase()
  const groups = useMemo(() => groupHitsByCategory(hits), [hits])

  const filteredGroups = useMemo(() => {
    return groups
      .map(({ category, hits: groupHits }) => ({
        category,
        hits: groupHits.filter(
          (hit) =>
            (categoryFilter === 'all' || hit.category === categoryFilter) && matchesQuery(hit, normalizedQuery),
        ),
      }))
      .filter((group) => group.hits.length > 0)
  }, [groups, categoryFilter, normalizedQuery])

  const chipCategories = useMemo(
    () =>
      groups.map(({ category, hits: groupHits }) => ({
        id: category,
        name: categoryLabel(category),
        count: groupHits.length,
      })),
    [groups],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('techStack.filter.placeholder')}
          aria-label={t('techStack.filter.placeholder')}
          className="h-8 ps-8 text-xs"
        />
      </div>
      {chipCategories.length > 1 ? (
        <ChipRail role="group" label={t('techStack.filter.categories')} className="min-w-0">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-[color,background-color,border-color] duration-150',
              categoryFilter === 'all'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
            )}
          >
            {t('techStack.filter.all')}
            <span className="tabular-nums opacity-80">{hits.length}</span>
          </button>
          {chipCategories.map(({ id, name, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === id ? 'all' : id)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-[color,background-color,border-color] duration-150',
                categoryFilter === id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
              )}
            >
              {name}
              <span className="tabular-nums opacity-80">{count}</span>
            </button>
          ))}
        </ChipRail>
      ) : null}
      {filteredGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t('techStack.filter.noMatches')}
        </p>
      ) : (
        <StaggerChildren stagger={0.04} className="columns-1 gap-x-6 @[480px]:columns-2">
          {filteredGroups.map(({ category, hits: groupHits }) => (
            <StaggerItem key={category}>
              <CategoryBlock category={category} groupHits={groupHits} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}
    </div>
  )
}
