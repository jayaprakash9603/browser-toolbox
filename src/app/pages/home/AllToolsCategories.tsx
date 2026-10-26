import { ArrowRightIcon, LayoutGridIcon, PauseIcon, PlayIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { Link } from '@/app/router'
import { CategoryCard } from '@/app/pages/home/CategoryCard'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { useDemoPlayback } from '@/app/pages/home/useDemoCycle'
import { SlideUp } from '@/shared/components/motion'

export function AllToolsCategories({ delay = 0.3 }: { delay?: number }) {
  const { t } = useTranslation()
  const { paused, toggle } = useDemoPlayback()
  const categories = useMemo(
    () =>
      [...categoryRegistry.getAll()]
        .sort((a, b) => a.order - b.order)
        .map((category) => ({ category, tools: toolRegistry.getByCategory(category.id) })),
    [],
  )
  const toolTotal = useMemo(() => toolRegistry.getAll().length, [])
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
        <ul className="grid grid-cols-1 gap-2.5 @[520px]:grid-cols-2 @[960px]:grid-cols-3">
          {categories.map(({ category, tools }, position) => (
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
    </SlideUp>
  )
}
