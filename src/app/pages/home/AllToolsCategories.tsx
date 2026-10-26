import { ArrowRightIcon, LayoutGridIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { Link } from '@/app/router'
import { CategoryCard } from '@/app/pages/home/CategoryCard'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'

const HOME_LIMIT = 6

export function AllToolsCategories({ delay = 0.3 }: { delay?: number }) {
  const { t } = useTranslation()
  const categories = useMemo(
    () =>
      [...categoryRegistry.getAll()]
        .sort((a, b) => a.order - b.order)
        .map((category) => ({ category, tools: toolRegistry.getByCategory(category.id) }))
        .filter(({ category, tools }) => category.enabled && tools.length > 0),
    [],
  )
  const shown = categories.slice(0, HOME_LIMIT)

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <div id="all-tools" className="scroll-mt-4">
        <SectionHeader
          title={t('home.allTools')}
          icon={LayoutGridIcon}
          count={categories.length}
          action={{ to: '/categories', label: t('home.viewAll') }}
        />
        <ul className="grid grid-cols-2 gap-2 @[560px]:grid-cols-3">
          {shown.map(({ category, tools }) => (
            <li key={category.id} className="min-w-0">
              <CategoryCard category={category} tools={tools} />
            </li>
          ))}
        </ul>
        {categories.length > shown.length && (
          <Link
            to="/categories"
            className="group mt-2 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs font-medium text-muted-foreground outline-none transition-colors duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('home.viewAllCategories', { count: categories.length })}
            <ArrowRightIcon
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </Link>
        )}
      </div>
    </SlideUp>
  )
}
