import { ArrowRightIcon, LayoutGridIcon, PauseIcon, PlayIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRememberedState } from '@/app/navigationMemory'
import { CatalogFilterChips } from '@/app/pages/all-tools/CatalogFilterChips'
import { CategoryViewerHost } from '@/app/pages/all-tools/CategoryViewerHost'
import { ALL_CATALOG, useToolCatalog } from '@/app/pages/all-tools/useToolCatalog'
import { getPrimaryToolsForUserCategory, getUserCategories } from '@/core/registry/userCategories'
import { Link } from '@/app/router'
import { CategoryCard } from '@/app/pages/home/CategoryCard'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { useDemoPlayback } from '@/app/pages/home/useDemoCycle'
import { SlideUp } from '@/shared/components/motion'

export function AllToolsCategories({ delay = 0.3 }: { delay?: number }) {
  const { t } = useTranslation()
  const { paused, toggle } = useDemoPlayback()
  const [filter, setFilter] = useRememberedState<string>('home.categoryFilter', ALL_CATALOG)
  const [viewerOpen, setViewerOpen] = useState(false)
  const { categories: catalogCategories, sections, toolTotal } = useToolCatalog()

  const categories = useMemo(
    () =>
      getUserCategories()
        .map((category) => ({ category, tools: getPrimaryToolsForUserCategory(category.id) }))
        .filter(({ tools }) => tools.length > 0),
    [],
  )

  const visible =
    filter === ALL_CATALOG ? categories : categories.filter(({ category }) => category.id === filter)

  const chipCategories = useMemo(
    () =>
      catalogCategories.map(({ category, name, count }) => ({
        id: category.id,
        name,
        count,
        icon: <category.icon className="size-3" aria-hidden />,
      })),
    [catalogCategories],
  )

  const PlaybackIcon = paused ? PlayIcon : PauseIcon

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <div id="all-tools" className="scroll-mt-4">
        <SectionHeader
          title={t('home.allTools')}
          icon={LayoutGridIcon}
          count={categories.length}
          action={{ to: '/tools', label: t('home.allToolsLink') }}
          controls={
            <button
              type="button"
              onClick={toggle}
              aria-pressed={paused}
              aria-label={paused ? t('home.demos.play') : t('home.demos.pause')}
              title={paused ? t('home.demos.play') : t('home.demos.pause')}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlaybackIcon className="size-3.5" aria-hidden />
            </button>
          }
        />
        <CatalogFilterChips
          className="mb-2.5"
          filter={filter}
          allCount={toolTotal}
          categories={chipCategories}
          viewerOpen={viewerOpen}
          onFilter={setFilter}
          onOpenFullView={() => setViewerOpen(true)}
        />
        <ul className="grid grid-cols-2 gap-2 @[360px]:gap-2.5 @[960px]:grid-cols-3">
          {visible.map(({ category, tools }, position) => (
            <li key={category.id} className="min-w-0">
              <CategoryCard category={category} tools={tools} position={position} playing={!paused} />
            </li>
          ))}
        </ul>
        <Link
          to="/tools"
          className="group mt-2 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs font-medium text-muted-foreground outline-none transition-colors duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('home.browseAllTools', { count: toolTotal })}
          <ArrowRightIcon
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
      </div>
      <CategoryViewerHost
        open={viewerOpen}
        sections={sections}
        initialId={filter}
        onClose={(id) => {
          setFilter(id)
          setViewerOpen(false)
        }}
      />
    </SlideUp>
  )
}
