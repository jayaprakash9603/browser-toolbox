import { ChevronDownIcon, PlayIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import '@/app/demos/i18n'
import type { ToolDefinition } from '@/core/registry'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

const loadPlayer = () => import('@/app/pages/category/CategoryDemoPlayer')
const CategoryDemoPlayer = lazy(loadPlayer)

const OPEN: Transition = {
  height: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
  opacity: { duration: 0.24, delay: 0.06 },
  y: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
}
const CLOSE: Transition = {
  height: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
  opacity: { duration: 0.14 },
  y: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
}
const INSTANT: Transition = { duration: 0 }

function preloadPlayer() {
  loadPlayer().catch(() => undefined)
}

/** Header pill that opens the category walkthrough; it keeps one label and reports state through `aria-expanded`. */
export function DemoToggle({
  id,
  panelId,
  open,
  onToggle,
}: {
  id: string
  panelId: string
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          id={id}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          onPointerEnter={preloadPlayer}
          onFocus={preloadPlayer}
          className={cn(
            'group flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background py-1 pr-2.5 pl-1 text-xs font-medium text-foreground outline-none transition-[background-color,border-color,color,transform] duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:transition-none @max-[480px]:pr-1.5',
            open && 'border-primary/40 bg-primary/10 text-primary',
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none [&_svg]:size-2.5">
            <PlayIcon aria-hidden className="translate-x-px fill-current" />
          </span>
          <span className="@max-[480px]:sr-only">{t('demo.player.trigger')}</span>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              'size-3.5 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none',
              open && 'rotate-180 text-primary',
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{open ? t('demo.player.hide') : t('demo.player.show')}</TooltipContent>
    </Tooltip>
  )
}

/** Animated region under the page header; the player chunk only loads once it opens. */
export function DemoPanel({
  id,
  labelledBy,
  open,
  tools,
  resetKey,
}: {
  id: string
  labelledBy: string
  open: boolean
  tools: readonly ToolDefinition[]
  resetKey: string
}) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="demo"
          id={id}
          role="region"
          aria-labelledby={labelledBy}
          initial={{ height: 0, opacity: 0, y: -8 }}
          animate={{ height: 'auto', opacity: 1, y: 0, transition: reduce ? INSTANT : OPEN }}
          exit={{ height: 0, opacity: 0, y: -6, transition: reduce ? INSTANT : CLOSE }}
          className="overflow-hidden"
        >
          <div className="pb-4">
            <Suspense fallback={<PlayerSkeleton count={tools.length} />}>
              <CategoryDemoPlayer key={resetKey} tools={tools} />
            </Suspense>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Same footprint as the player so the panel opens to its final height. */
function PlayerSkeleton({ count }: { count: number }) {
  return (
    <div aria-hidden className="rounded-2xl border bg-card p-2.5 @[720px]:p-3">
      {count > 1 ? <div className="mb-2.5 h-6" /> : null}
      <div className="grid gap-3 @[720px]:grid-cols-[minmax(0,1.45fr)_minmax(15rem,1fr)] @[720px]:items-start">
        <div className="aspect-[520/469] animate-pulse rounded-[22px] bg-[#0f0f16] motion-reduce:animate-none" />
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-muted" />
            <div className="h-3.5 w-1/2 rounded bg-muted" />
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-muted/60 motion-reduce:animate-none" />
        </div>
      </div>
      {count > 1 ? <div className="mt-3 h-9" /> : null}
    </div>
  )
}
