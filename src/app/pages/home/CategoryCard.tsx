import { lazy, Suspense, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { CategoryDefinition, ToolDefinition } from '@/core/registry'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { useDemoCycle, useInViewport, usePageVisible } from '@/app/pages/home/useDemoCycle'

const DemoReel = lazy(() => import('@/app/pages/home/demo/DemoReel'))

/** Matches the reel's geometry (a 520x420 demo canvas over a 34px caption bar) so nothing shifts as it loads. */
const FRAME = 'relative overflow-hidden rounded-xl'
const CANVAS = 'aspect-[520/420]'
const BAR = 'h-[34px]'

interface CategoryCardProps {
  category: CategoryDefinition
  tools: readonly ToolDefinition[]
  /** Grid position, used to stagger the demo loops. */
  position?: number
  /** False when the user paused the home demos. */
  playing?: boolean
}

export function CategoryCard({ category, tools, position = 0, playing = true }: CategoryCardProps) {
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
        <div className={`${FRAME} bg-muted/45 bg-[radial-gradient(circle,var(--border)_1px,transparent_1.2px)] bg-[size:10px_10px]`}>
          <div className={`${CANVAS} flex items-center justify-center`}>
            <span className="flex size-12 items-center justify-center rounded-2xl border border-dashed bg-background/60">
              <Icon className="size-5" aria-hidden />
            </span>
          </div>
          <div className={BAR} />
        </div>
        <div className="flex min-w-0 flex-col px-1.5 pb-1">
          <span className="truncate text-[13px] font-semibold text-foreground/70">{name}</span>
          <span className="text-[10px] font-semibold tracking-wide uppercase">{t('home.categoryComingSoon')}</span>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={`/categories/${category.id}`}
      title={description}
      className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-1.5 outline-none transition-colors duration-200 hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] motion-reduce:active:scale-100"
    >
      <CategoryDemo category={category} tools={tools} position={position} playing={playing} />

      <div className="flex min-w-0 items-start gap-2 px-1.5 pb-1">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-3.5">
          <Icon aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] leading-5 font-semibold">{name}</span>
          <span className="text-[11px] leading-4 text-muted-foreground tabular-nums">
            {t('home.toolCount', { count: tools.length })}
          </span>
          <ToolIconRow tools={tools} />
        </span>
        <ArrowUpRightIcon
          aria-hidden
          className="mt-1 size-3.5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      </div>
    </Link>
  )
}

const DEMO_PREVIEW_LIMIT = 6
const ICON_PREVIEW_LIMIT = 6

function ToolGlyph({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon
  return <Icon className="size-3" aria-hidden />
}

function ToolIconRow({ tools }: { tools: readonly ToolDefinition[] }) {
  const extra = tools.length - ICON_PREVIEW_LIMIT
  return (
    <span aria-hidden className="mt-1 flex items-center gap-1.5 text-muted-foreground/80">
      {tools.slice(0, ICON_PREVIEW_LIMIT).map((tool) => (
        <ToolGlyph key={tool.id} tool={tool} />
      ))}
      {extra > 0 && <span className="text-[10px] tabular-nums">+{extra}</span>}
    </span>
  )
}

function CategoryDemo({
  category,
  tools,
  position,
  playing,
}: Required<Omit<CategoryCardProps, 'category'>> & { category: CategoryDefinition }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewport(ref)
  const pageVisible = usePageVisible()
  const reduceMotion = useReducedMotion()
  const active = playing && inView && pageVisible && !reduceMotion
  const previewTools = tools.slice(0, DEMO_PREVIEW_LIMIT)
  const { index, running, advance } = useDemoCycle(previewTools.length, active, (position % 4) * 350)

  return (
    <div
      ref={ref}
      aria-hidden
      className={`${FRAME} bg-surface ring-1 ring-black/5 transition-shadow duration-200 ring-inset group-hover:shadow-[0_10px_30px_-14px_rgb(0_0_0/0.55)] dark:ring-white/5`}
    >
      <Suspense fallback={<Poster tool={previewTools[index]} />}>
        <DemoReel category={category} tools={previewTools} index={index} running={running} advance={advance} />
      </Suspense>
    </div>
  )
}

/** Still frame shown until the reel chunk loads. */
function Poster({ tool }: { tool: ToolDefinition }) {
  const { name } = useToolLabels(tool)
  const ToolIcon = tool.icon
  return (
    <>
      <div className={`${CANVAS} flex flex-col items-center justify-center gap-2 text-ink`}>
        <span className="flex size-11 items-center justify-center rounded-2xl border border-ink/15 bg-ink/[0.06] [&_svg]:size-5">
          <ToolIcon />
        </span>
        <span className="max-w-[80%] truncate text-xs font-semibold">{name}</span>
      </div>
      <div className={`${BAR} border-t border-ink/10`} />
    </>
  )
}
