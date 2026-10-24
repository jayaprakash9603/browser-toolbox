import { LayoutGridIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryRegistry, toolRegistry, type CategoryDefinition, type ToolDefinition } from '@/core/registry'
import { Link } from '@/app/router'
import { tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'

const PREVIEW_ICONS = 3

export function AllToolsCategories({ delay = 0.3 }: { delay?: number }) {
  const { t } = useTranslation()
  const categories = useMemo(
    () =>
      [...categoryRegistry.getAll()]
        .sort((a, b) => a.order - b.order)
        .map((category) => ({ category, tools: toolRegistry.getByCategory(category.id) })),
    [],
  )

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <div id="all-tools" className="scroll-mt-4">
        <SectionHeader title={t('home.allTools')} icon={LayoutGridIcon} count={categories.length} />
        <ul className="grid grid-cols-2 gap-2 @[560px]:grid-cols-3">
          {categories.map(({ category, tools }, index) => (
            <li key={category.id} className="min-w-0">
              <CategoryTile category={category} tools={tools} color={tileColor(index)} />
            </li>
          ))}
        </ul>
      </div>
    </SlideUp>
  )
}

function CategoryTile({
  category,
  tools,
  color,
}: {
  category: CategoryDefinition
  tools: ToolDefinition[]
  color: string
}) {
  const { t } = useTranslation()
  const Icon = category.icon
  const name = t(`categories.${category.id}.name`, { defaultValue: category.name })
  const description = t(`categories.${category.id}.description`, { defaultValue: category.description })
  const available = category.enabled && tools.length > 0

  if (!available) {
    return (
      <div
        title={description}
        className="flex h-full min-h-[5.5rem] flex-col gap-2 rounded-2xl border border-dashed bg-muted/30 p-2.5 opacity-70"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="truncate text-[13px] font-semibold">{name}</span>
        <span className="mt-auto text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t('home.categoryComingSoon')}
        </span>
      </div>
    )
  }

  return (
    <Link
      to={`/categories/${category.id}`}
      title={description}
      className="group relative flex h-full min-h-[5.5rem] flex-col gap-1.5 overflow-hidden rounded-2xl border p-2.5 shadow-xs outline-none transition-[box-shadow,border-color] duration-150 hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 12%, var(--card)), var(--card) 75%)`,
        borderColor: `color-mix(in srgb, ${color} 22%, var(--border))`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="flex -space-x-1.5" aria-hidden>
          {tools.slice(0, PREVIEW_ICONS).map((tool) => {
            const ToolIcon = tool.icon
            return (
              <span
                key={tool.id}
                className="flex size-5 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground"
              >
                <ToolIcon className="size-2.5" />
              </span>
            )
          })}
        </span>
      </div>
      <span className="truncate text-[13px] leading-tight font-semibold">{name}</span>
      <span className="mt-auto text-[11px] font-medium text-muted-foreground tabular-nums">
        {t('home.toolCount', { count: tools.length })}
      </span>
    </Link>
  )
}
