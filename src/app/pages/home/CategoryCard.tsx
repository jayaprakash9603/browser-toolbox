import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { CategoryDefinition, ToolDefinition } from '@/core/registry'
import { cn } from '@/shared/utils/cn'

/** Up to three tool tiles fanned like a hand of cards; they spread further while the card is hovered. */
const FAN = [
  'z-0 -translate-x-[95%] translate-y-1 -rotate-[12deg] group-hover:-translate-x-[118%] group-hover:-rotate-[16deg] group-focus-visible:-translate-x-[118%] group-focus-visible:-rotate-[16deg]',
  'z-10 -translate-y-1 group-hover:-translate-y-2.5 group-focus-visible:-translate-y-2.5',
  'z-0 translate-x-[95%] translate-y-1 rotate-[12deg] group-hover:translate-x-[118%] group-hover:rotate-[16deg] group-focus-visible:translate-x-[118%] group-focus-visible:rotate-[16deg]',
] as const

const TILE =
  'absolute top-1/2 left-1/2 -mt-5 -ml-5 flex size-10 items-center justify-center rounded-xl border bg-background text-foreground/70 transition-[translate,rotate,color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-primary/30 group-hover:text-primary motion-reduce:transition-none [&_svg]:size-[18px]'

interface CategoryCardProps {
  category: CategoryDefinition
  tools: readonly ToolDefinition[]
  /** Adds the category description; used on the full categories page. */
  detailed?: boolean
  /** Tools in this category matching the page search, shown as a hint under the name. */
  matches?: number
}

export function CategoryCard({ category, tools, detailed = false, matches }: CategoryCardProps) {
  const { t } = useTranslation()
  const Icon = category.icon
  const name = t(`categories.${category.id}.name`, { defaultValue: category.name })
  const description = t(`categories.${category.id}.description`, { defaultValue: category.description })
  const available = category.enabled && tools.length > 0

  if (!available) {
    return (
      <div
        title={description}
        className="flex h-full flex-col gap-2 rounded-2xl border border-dashed p-1.5 text-muted-foreground"
      >
        <div className="relative flex aspect-[16/10] items-center justify-center rounded-xl bg-muted/40">
          <span className="flex size-10 items-center justify-center rounded-xl border border-dashed bg-background/60">
            <Icon className="size-[18px]" aria-hidden />
          </span>
        </div>
        <div className="flex min-w-0 flex-col px-1.5 pb-1">
          <span className="truncate text-[13px] font-semibold text-foreground/70">{name}</span>
          <span className="text-[10px] font-semibold tracking-wide uppercase">{t('home.categoryComingSoon')}</span>
        </div>
      </div>
    )
  }

  const preview = tools.length === 1 ? [tools[0]] : tools.slice(0, 3)
  const extra = tools.length - preview.length

  return (
    <Link
      to={`/categories/${category.id}`}
      title={detailed ? undefined : description}
      className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-1.5 outline-none transition-colors duration-200 hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] motion-reduce:active:scale-100"
    >
      <div
        aria-hidden
        className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted/45 bg-[radial-gradient(circle,var(--border)_1px,transparent_1.2px)] bg-[size:10px_10px] transition-colors duration-200 group-hover:bg-primary/[0.06]"
      >
        <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-lg border bg-background/80 text-primary backdrop-blur-sm [&_svg]:size-3.5">
          <Icon />
        </span>
        {preview.map((tool, index) => {
          const ToolIcon = tool.icon
          return (
            <span key={tool.id} className={cn(TILE, preview.length === 1 ? FAN[1] : FAN[index])}>
              <ToolIcon />
            </span>
          )
        })}
        {extra > 0 && (
          <span className="absolute right-2 bottom-2 rounded-full border bg-background/85 px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums backdrop-blur-sm">
            +{extra}
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-start gap-1.5 px-1.5 pb-1">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] leading-5 font-semibold">{name}</span>
          <span className="text-[11px] leading-4 text-muted-foreground tabular-nums">
            {matches != null
              ? t('allCategories.matches', { count: matches })
              : t('home.toolCount', { count: tools.length })}
          </span>
          {detailed && (
            <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground/90">{description}</span>
          )}
        </span>
        <ArrowUpRightIcon
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      </div>
    </Link>
  )
}
