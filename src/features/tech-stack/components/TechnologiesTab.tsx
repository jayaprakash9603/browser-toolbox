import { ExternalLinkIcon, SearchIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryLabel } from '@/core/engines/techStack/categories'
import { groupHitsByCategory } from '@/core/engines/techStack/detect'
import type { TechCategoryId, TechHit } from '@/core/engines/techStack/types'
import { ChipRail } from '@/shared/components/ChipRail'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import { categoryColor } from '../categoryStyle'
import { TechIcon } from './TechIcon'

function TechRow({ hit }: { hit: TechHit }) {
  const { t } = useTranslation()
  const color = categoryColor(hit.category)
  const title = hit.implied ? t('techStack.impliedHint') : hit.evidence
  const body = (
    <>
      <TechIcon name={hit.name} color={color} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[13px] leading-tight font-medium text-foreground">{hit.name}</span>
          {hit.website && <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
        </span>
        {(hit.version || hit.implied) && (
          <span className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
            {hit.version && <span className="font-mono tabular-nums">{hit.version}</span>}
            {hit.implied && <span className="tracking-wide uppercase">{t('techStack.implied')}</span>}
          </span>
        )}
      </div>
    </>
  )

  const rowClass =
    'flex min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-foreground transition-colors duration-200 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  if (hit.website) {
    return (
      <motion.li layout="position">
        <a
          href={hit.website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('techStack.openSite', { name: hit.name })}
          title={title}
          className={rowClass}
        >
          {body}
        </a>
      </motion.li>
    )
  }

  return (
    <motion.li layout="position" className={rowClass} title={title}>
      {body}
    </motion.li>
  )
}

function CategoryBlock({ category, groupHits }: { category: TechCategoryId; groupHits: TechHit[] }) {
  const accent = categoryColor(category)
  return (
    <section className="mb-2 overflow-hidden rounded-xl border border-border bg-card">
      <header
        className="flex items-center justify-between gap-2 border-b border-border/80 border-s-[3px] bg-muted/40 px-3 py-2"
        style={{ borderInlineStartColor: accent }}
      >
        <h3 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
          {categoryLabel(category)}
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{groupHits.length}</span>
      </header>
      <ul className="px-1.5 py-1">
        {groupHits.map((hit) => (
          <TechRow key={hit.name} hit={hit} />
        ))}
      </ul>
    </section>
  )
}

function FilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-[color,background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected
          ? 'border-primary/45 bg-primary/10 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      {label}
      <span className="font-mono tabular-nums opacity-80">{count}</span>
    </button>
  )
}

function matchesQuery(hit: TechHit, query: string): boolean {
  if (!query) return true
  return `${hit.name} ${hit.category} ${hit.evidence}`.toLowerCase().includes(query)
}

export function TechnologiesTab({ hits }: { hits: TechHit[] }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TechCategoryId | 'all'>('all')
  const normalizedQuery = query.trim().toLowerCase()
  const groups = useMemo(() => groupHitsByCategory(hits), [hits])
  const filteredGroups = useMemo(
    () =>
      groups
        .map(({ category, hits: groupHits }) => ({
          category,
          hits: groupHits.filter(
            (hit) =>
              (categoryFilter === 'all' || hit.category === categoryFilter) && matchesQuery(hit, normalizedQuery),
          ),
        }))
        .filter((group) => group.hits.length > 0),
    [groups, categoryFilter, normalizedQuery],
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('techStack.filter.placeholder')}
          aria-label={t('techStack.filter.placeholder')}
          className="h-8 border-border bg-background ps-8 text-xs text-foreground"
        />
      </div>
      {groups.length > 1 && (
        <ChipRail role="group" label={t('techStack.filter.categories')} className="min-w-0">
          <FilterChip
            label={t('techStack.filter.all')}
            count={hits.length}
            selected={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          />
          {groups.map(({ category, hits: groupHits }) => (
            <FilterChip
              key={category}
              label={categoryLabel(category)}
              count={groupHits.length}
              selected={categoryFilter === category}
              onClick={() => setCategoryFilter(categoryFilter === category ? 'all' : category)}
            />
          ))}
        </ChipRail>
      )}
      {filteredGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {t('techStack.filter.noMatches')}
        </p>
      ) : (
        <StaggerChildren stagger={0.035} className="columns-1 gap-x-3 @[480px]:columns-2">
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
