import { ChevronDownIcon, ExternalLinkIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryLabel } from '@/core/engines/techStack/categories'
import { groupHitsByCategory } from '@/core/engines/techStack/detect'
import type { ConfidenceLevel, TechCategoryId, TechHit } from '@/core/engines/techStack/types'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

import { categoryColor } from '../categoryStyle'
import { TechIcon } from './TechIcon'

function confidenceClass(level: ConfidenceLevel): string {
  if (level === 'high') return 'text-foreground'
  if (level === 'medium') return 'text-muted-foreground'
  return 'text-muted-foreground/80'
}

function TechRow({ hit }: { hit: TechHit }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const color = categoryColor(hit.category)
  const detailsId = `tech-details-${hit.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`

  return (
    <motion.li layout="position" className="rounded-xl">
      <div className="flex min-w-0 items-start gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={t('techStack.details.toggle', { name: hit.name })}
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-start text-foreground transition-colors duration-200 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <TechIcon name={hit.name} color={color} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[13px] leading-tight font-medium text-foreground">{hit.name}</span>
              <ChevronDownIcon
                className={cn('size-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                aria-hidden
              />
            </span>
            <span className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
              <span className={cn('tracking-wide uppercase', confidenceClass(hit.confidenceLevel))}>
                {t(`techStack.confidence.${hit.confidenceLevel}`)}
              </span>
              {hit.version ? (
                <span className="font-mono tabular-nums">{hit.version}</span>
              ) : (
                <span>{t('techStack.versionUnknown')}</span>
              )}
              {hit.implied && <span className="tracking-wide uppercase">{t('techStack.implied')}</span>}
            </span>
          </div>
        </button>
        {hit.website && (
          <a
            href={hit.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('techStack.openSite', { name: hit.name })}
            className="mt-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ExternalLinkIcon className="size-3.5" />
          </a>
        )}
      </div>
      {open && (
        <div id={detailsId} className="ms-11 me-1 mb-1.5 space-y-1.5 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
          {hit.description && <p className="text-foreground">{hit.description}</p>}
          <p>
            {hit.implied ? t('techStack.impliedHint') : t('techStack.observed')}
            {' · '}
            {t('techStack.confidence.estimate')}
          </p>
          <p className="font-medium text-foreground">{t('techStack.details.evidence')}</p>
          <ul className="flex flex-col gap-0.5">
            {hit.evidenceItems.map((item) => (
              <li key={`${item.type}:${item.detail}`} className="break-all font-mono text-[10px]">
                {item.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
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

export function TechnologiesTab({ hits }: { hits: TechHit[] }) {
  const groups = useMemo(
    () =>
      groupHitsByCategory(hits).map(({ category, hits: groupHits }) => ({
        category,
        hits: [...groupHits].sort((left, right) => left.name.localeCompare(right.name)),
      })),
    [hits],
  )

  return (
    <StaggerChildren stagger={0.035} className="columns-1 gap-x-3 @[480px]:columns-2">
      {groups.map(({ category, hits: groupHits }) => (
        <StaggerItem key={category}>
          <CategoryBlock category={category} groupHits={groupHits} />
        </StaggerItem>
      ))}
    </StaggerChildren>
  )
}
