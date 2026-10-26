import { useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon, CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { CategoryDefinition, ToolDefinition } from '@/core/registry'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { useDemoCycle, useInViewport, usePageVisible } from '@/app/pages/home/useDemoCycle'

const EASE = [0.22, 1, 0.36, 1] as const

/** Seconds into each demo step; the whole beat fits inside `DEMO_STEP_MS`. */
const BEAT = { type: 0.3, cursor: 0.85, click: 1.5 } as const

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
        <div className="relative flex aspect-[16/11] items-center justify-center rounded-xl bg-muted/40">
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

  return (
    <Link
      to={`/categories/${category.id}`}
      title={description}
      className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-1.5 outline-none transition-colors duration-200 hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] motion-reduce:active:scale-100"
    >
      <CategoryDemo category={category} tools={tools} position={position} playing={playing} />

      <div className="flex min-w-0 items-start gap-1.5 px-1.5 pb-1">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] leading-5 font-semibold">{name}</span>
          <span className="text-[11px] leading-4 text-muted-foreground tabular-nums">
            {t('home.toolCount', { count: tools.length })}
          </span>
        </span>
        <ArrowUpRightIcon
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      </div>
    </Link>
  )
}

/** A tiny One Panel window that loops through every tool in the category. Decorative. */
function CategoryDemo({ category, tools, position, playing }: Required<Omit<CategoryCardProps, 'category'>> & {
  category: CategoryDefinition
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewport(ref)
  const pageVisible = usePageVisible()
  const reduceMotion = useReducedMotion()
  const active = playing && inView && pageVisible && !reduceMotion
  const { index, stepMs, running } = useDemoCycle(tools.length, active, (position % 6) * 450)
  const tool = tools[index]
  const CategoryIcon = category.icon

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative aspect-[16/11] overflow-hidden rounded-xl bg-muted/45 bg-[radial-gradient(circle,var(--border)_1px,transparent_1.2px)] bg-[size:10px_10px] transition-colors duration-200 group-hover:bg-primary/[0.06]"
    >
      <div className="absolute inset-x-2.5 top-2.5 -bottom-px flex flex-col overflow-hidden rounded-t-lg border border-b-0 bg-background transition-[translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 motion-reduce:transition-none">
        <div className="flex h-5 shrink-0 items-center gap-1 border-b px-1.5">
          <span className="size-1 rounded-full bg-foreground/20" />
          <span className="size-1 rounded-full bg-foreground/20" />
          <span className="size-1 rounded-full bg-foreground/20" />
          <CategoryIcon className="ml-1 size-2.5 shrink-0 text-primary" />
          <span className="flex-1" />
          <span className="text-[8.5px] leading-none font-medium text-muted-foreground tabular-nums">
            {index + 1}/{tools.length}
          </span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <DemoScene key={tool.id} tool={tool} play={running} />
          </AnimatePresence>
        </div>

        <span className="h-0.5 shrink-0 bg-muted">
          {running && (
            <motion.span
              key={index}
              className="block h-full origin-left bg-primary/60"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: stepMs / 1000, ease: 'linear' }}
            />
          )}
        </span>
      </div>
    </div>
  )
}

/** One tool's beat: it slides in, the input "types", and the cursor presses the action button. */
function DemoScene({ tool, play }: { tool: ToolDefinition; play: boolean }) {
  const { name, description } = useToolLabels(tool)
  const ToolIcon = tool.icon
  const at = (delay: number, duration = 0.35) => ({ duration, delay, ease: EASE })

  return (
    <motion.div
      className="absolute inset-0 flex flex-col gap-1.5 p-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
      transition={at(0, 0.4)}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <motion.span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-3.5"
          initial={play ? { scale: 0.5, rotate: -12 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
        >
          <ToolIcon />
        </motion.span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[10.5px] leading-[14px] font-semibold">{name}</span>
          <span className="truncate text-[8.5px] leading-3 text-muted-foreground">{description}</span>
        </span>
      </div>

      <div className="mt-auto flex items-center gap-1">
        <span className="flex h-4 min-w-0 flex-1 items-center rounded border bg-muted/40 px-1">
          <motion.span
            className="block h-1 w-4/5 origin-left rounded-full bg-foreground/25"
            initial={play ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: BEAT.type, ease: [0.45, 0, 0.55, 1] }}
          />
        </span>
        <span className="relative flex h-4 w-6 shrink-0 items-center justify-center overflow-visible rounded bg-primary/15">
          <motion.span
            className="absolute inset-0 rounded bg-primary"
            initial={play ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={at(BEAT.click, 0.2)}
          />
          <motion.span
            className="relative text-primary-foreground [&_svg]:size-2.5"
            initial={play ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: BEAT.click + 0.05 }}
          >
            <CheckIcon strokeWidth={3} />
          </motion.span>
          {play && (
            <>
              <motion.span
                className="absolute inset-0 rounded border-2 border-primary"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 1.9] }}
                transition={{ duration: 0.5, delay: BEAT.click, times: [0, 0.1, 1] }}
              />
              <motion.svg
                viewBox="0 0 24 24"
                className="absolute top-1/2 left-1/2 size-3.5 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
                initial={{ opacity: 0, x: -56, y: 22 }}
                animate={{ opacity: [0, 1, 1, 0], x: [-56, 0, 0, 2], y: [22, 0, 0, 6], scale: [1, 1, 0.82, 1] }}
                transition={{
                  duration: 1.5,
                  delay: BEAT.cursor,
                  times: [0, 0.42, 0.5, 1],
                  ease: EASE,
                }}
              >
                <path
                  d="M4 2.5 19.5 11l-6.6 1.9L9.6 19.8z"
                  className="fill-background stroke-foreground"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </>
          )}
        </span>
      </div>
    </motion.div>
  )
}
