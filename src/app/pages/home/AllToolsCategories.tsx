import { useTranslation } from 'react-i18next'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { Link } from '@/app/router'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { AnimatedCard, SlideUp } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

export function AllToolsCategories({ delay = 0.55 }: { delay?: number }) {
  const { t } = useTranslation()
  const categories = categoryRegistry.getAll().sort((a, b) => a.order - b.order)

  return (
    <SlideUp delay={delay} className="mb-5">
      <div id="all-tools" className="scroll-mt-4">
      <SectionHeader title={t('home.allTools')} />
      <div className="grid grid-cols-1 gap-2 @[360px]:grid-cols-2">
        {categories.map((category) => {
          const count = toolRegistry.getByCategory(category.id).length
          const Icon = category.icon
          const name = t(`categories.${category.id}.name`, { defaultValue: category.name })
          const description = t(`categories.${category.id}.description`, {
            defaultValue: category.description,
          })
          const comingSoon = count === 0

          return (
            <AnimatedCard key={category.id} className={cn(!category.enabled && 'opacity-60')}>
              {comingSoon || !category.enabled ? (
                <div className="flex h-full flex-col gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-tool-name">{name}</span>
                  </div>
                  <p className="text-tool-desc line-clamp-2">{description}</p>
                  <span className="mt-auto text-[11px] font-medium text-muted-foreground">
                    {t('home.categoryComingSoon')}
                  </span>
                </div>
              ) : (
                <Link
                  to={`/categories/${category.id}`}
                  className="flex h-full flex-col gap-2 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="truncate text-tool-name">{name}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                  <p className="text-tool-desc line-clamp-2">{description}</p>
                </Link>
              )}
            </AnimatedCard>
          )
        })}
      </div>
      </div>
    </SlideUp>
  )
}
