import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

/**
 * attached: pill rail with icon + label always visible; overflow scrolls with chevrons.
 * chips: compact navigation with a sliding outlined tile.
 * pill: segmented control with a sliding raised thumb. underline: classic sliding underline.
 */
type TabsVariant = 'attached' | 'chips' | 'pill' | 'underline'

const TabsVariantContext = React.createContext<TabsVariant>('attached')

/**
 * labeled — content-sized tabs that scroll when they overflow.
 * equal — share leftover width evenly, never shrink below the label.
 */
type TabDistribution = 'expand' | 'equal'
const TabsDistributionContext = React.createContext<TabDistribution>('expand')

const SCROLL_BTN =
  'absolute top-1/2 z-20 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-sm transition-[opacity,color,background-color] duration-200 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0'

const tabsListVariants = cva('inline-flex w-fit items-center text-muted-foreground', {
  variants: {
    variant: {
      attached:
        'h-auto w-full gap-0.5 rounded-full border border-primary/15 bg-primary/[0.07] p-1 shadow-inner dark:border-primary/30 dark:bg-primary/10',
      chips: 'h-auto gap-1 rounded-xl border bg-muted/40 p-1',
      pill: 'h-9 justify-center rounded-lg bg-muted p-1',
      underline: 'h-9 gap-0 rounded-none border-0 bg-transparent p-0',
    },
  },
  defaultVariants: { variant: 'attached' },
})

const tabsTriggerVariants = cva(
  'group/tab inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium outline-none transition-[color,background-color,box-shadow,transform,filter] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        attached:
          'relative z-10 h-9 min-h-9 shrink-0 rounded-full border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-medium leading-none text-muted-foreground transition-[color] duration-200 ease-out hover:text-primary/80 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none motion-reduce:transition-none [&_svg]:transition-colors [&_svg]:duration-200 data-[state=active]:[&_svg]:text-primary',
        chips:
          'relative z-10 min-h-11 rounded-lg border border-transparent bg-transparent px-3 text-xs hover:bg-background/60 hover:text-foreground data-[state=active]:text-primary motion-reduce:transition-none',
        pill: 'relative z-10 h-7 flex-1 rounded-md px-3 hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground',
        underline:
          'relative z-10 h-9 rounded-none border-0 bg-transparent px-3 shadow-none hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
      },
    },
    defaultVariants: { variant: 'attached' },
  },
)

const UNDERLINE_PX = 2
const SCROLL_PADDING_PX = 24
const FADE_PX = 24

type IndicatorBox = { left: number; top: number; width: number; height: number }
type Edges = { start: boolean; end: boolean }

function indicatorClose(a: IndicatorBox, b: IndicatorBox, epsilon = 0.75): boolean {
  return (
    Math.abs(a.left - b.left) < epsilon &&
    Math.abs(a.top - b.top) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  )
}

function activeTab(list: HTMLElement): HTMLElement | null {
  return list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
}

/** Position inside the list's scrollable content, so wrapped rows and scrolled lists line up. */
function measureActiveTab(list: HTMLElement | null, underline: boolean): IndicatorBox {
  const active = list && activeTab(list)
  if (!list || !active) return { left: 0, top: 0, width: 0, height: 0 }
  const l = list.getBoundingClientRect()
  const a = active.getBoundingClientRect()
  return {
    left: a.left - l.left + list.scrollLeft,
    top: (underline ? a.bottom - UNDERLINE_PX : a.top) - l.top + list.scrollTop,
    width: a.width,
    height: underline ? UNDERLINE_PX : a.height,
  }
}

function measureEdges(list: HTMLElement | null): Edges {
  if (!list || list.scrollWidth <= list.clientWidth + 1) return { start: false, end: false }
  return {
    start: list.scrollLeft > 1,
    end: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
  }
}

const OVERFLOW_ON_EXTRA_PX = 4
/** Wider deadband so chevron chrome does not toggle overflow every frame. */
const OVERFLOW_OFF_EXTRA_PX = -40

function nextOverflowing(list: HTMLElement | null, prev: boolean): boolean {
  if (!list) return false
  const slack = list.scrollWidth - list.clientWidth
  if (slack > OVERFLOW_ON_EXTRA_PX) return true
  if (slack < OVERFLOW_OFF_EXTRA_PX) return false
  return prev
}

function scrollActiveIntoView(list: HTMLElement | null, smooth: boolean) {
  const active = list && activeTab(list)
  if (!list || !active || list.scrollWidth <= list.clientWidth) return
  const l = list.getBoundingClientRect()
  const a = active.getBoundingClientRect()
  let delta = 0
  if (a.left < l.left + SCROLL_PADDING_PX) delta = a.left - l.left - SCROLL_PADDING_PX
  else if (a.right > l.right - SCROLL_PADDING_PX) delta = a.right - l.right + SCROLL_PADDING_PX
  if (delta) list.scrollTo({ left: list.scrollLeft + delta, behavior: smooth ? 'smooth' : 'auto' })
}

function scrollTabsBy(list: HTMLElement, direction: -1 | 1, smooth: boolean) {
  const step = Math.max(96, Math.round(list.clientWidth * 0.72))
  list.scrollBy({ left: direction * step, behavior: smooth ? 'smooth' : 'auto' })
}

function partitionTriggerChildren(children: React.ReactNode): {
  icon: React.ReactNode | null
  labels: React.ReactNode
} {
  const items = React.Children.toArray(children)
  if (items.length >= 2 && React.isValidElement(items[0])) {
    return { icon: items[0], labels: items.slice(1) }
  }
  return { icon: null, labels: children }
}

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-3', className)} {...props} />
}

function TabsList({
  className,
  variant,
  scrollButtons = 'auto',
  fullWidth = false,
  distribution: distributionProp,
  children,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    /** Chevron controls when tabs overflow; use false for wrapped tab rows. */
    scrollButtons?: boolean | 'auto'
    /** Stretch the tab rail to the container width (tabs scroll inside when needed). */
    fullWidth?: boolean
    /** labeled: natural width + scroll. equal: grow evenly without truncating labels. */
    distribution?: TabDistribution
  }) {
  const { t } = useTranslation()
  const resolved = variant ?? 'attached'
  const distribution: TabDistribution =
    distributionProp ??
    (resolved === 'attached' && (fullWidth || /grid/i.test(className ?? '')) ? 'equal' : 'expand')
  const listRef = React.useRef<HTMLDivElement>(null)
  const [underline, setUnderline] = React.useState<IndicatorBox>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const [edges, setEdges] = React.useState<Edges>({ start: false, end: false })
  const [overflowing, setOverflowing] = React.useState(false)
  const reduceMotion = useReducedMotion()
  const wantsScrollChrome = scrollButtons !== false
  const showScrollButtons = scrollButtons === true || (scrollButtons === 'auto' && overflowing)

  const sync = React.useCallback(() => {
    const node = listRef.current
    setOverflowing((prev) => nextOverflowing(node, prev))
    setEdges((prev) => {
      const next = measureEdges(node)
      return next.start === prev.start && next.end === prev.end ? prev : next
    })
    const nextUnderline = measureActiveTab(node, resolved === 'underline')
    setUnderline((prev) => (indicatorClose(prev, nextUnderline) ? prev : nextUnderline))
  }, [resolved])

  React.useLayoutEffect(() => {
    const node = listRef.current
    if (!node) return
    let syncRaf = 0
    const flushSync = () => {
      syncRaf = 0
      sync()
    }
    const scheduleSync = () => {
      if (syncRaf) return
      syncRaf = requestAnimationFrame(flushSync)
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const max = node.scrollWidth - node.clientWidth
      if (max <= 0) return
      if ((event.deltaY < 0 && node.scrollLeft <= 0) || (event.deltaY > 0 && node.scrollLeft >= max - 1)) return
      event.preventDefault()
      node.scrollLeft += event.deltaY
    }

    const onActiveChange = () => {
      if (node.scrollWidth > node.clientWidth + OVERFLOW_ON_EXTRA_PX) {
        scrollActiveIntoView(node, !reduceMotion)
      }
      sync()
    }

    scrollActiveIntoView(node, false)
    sync()

    const observer = new MutationObserver(onActiveChange)
    observer.observe(node, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-state'],
      childList: true,
    })

    const resizeObserver = new ResizeObserver(() => {
      if (resolved === 'attached') scheduleSync()
      else sync()
    })
    resizeObserver.observe(node)
    for (const tab of node.querySelectorAll('[role="tab"]')) resizeObserver.observe(tab)

    node.addEventListener('scroll', scheduleSync, { passive: true })
    node.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', scheduleSync)
    return () => {
      if (syncRaf) cancelAnimationFrame(syncRaf)
      observer.disconnect()
      resizeObserver.disconnect()
      node.removeEventListener('scroll', scheduleSync)
      node.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', scheduleSync)
    }
  }, [sync, reduceMotion, resolved])

  const scroll = (direction: -1 | 1) => {
    const node = listRef.current
    if (!node) return
    scrollTabsBy(node, direction, !reduceMotion)
  }

  const overlayFade = wantsScrollChrome && showScrollButtons
    ? `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${edges.start ? FADE_PX : 0}px, #000 calc(100% - ${edges.end ? FADE_PX : 0}px), ${edges.end ? 'transparent' : '#000'} 100%)`
    : undefined

  return (
    <TabsVariantContext.Provider value={resolved}>
      <TabsDistributionContext.Provider value={distribution}>
      <div
        className={cn(
          'group/tabs-rail relative min-w-0',
          fullWidth ? 'w-full max-w-full' : 'w-fit max-w-full',
          resolved === 'underline' && 'border-b border-border',
        )}
      >
        <TabsPrimitive.List
          ref={listRef}
          className={cn(
            tabsListVariants({ variant: resolved }),
            'relative w-full min-w-0 scroll-px-2',
            resolved === 'attached' &&
              'overflow-x-auto overscroll-x-contain scrollbar-none justify-start',
            resolved === 'attached' &&
              distribution === 'expand' &&
              '[&_[role=tab]]:shrink-0 [&_[role=tab]]:min-w-max',
            resolved === 'attached' &&
              distribution === 'equal' &&
              '[&_[role=tab]]:min-w-max [&_[role=tab]]:flex-1 [&_[role=tab]]:shrink-0',
            fullWidth &&
              resolved !== 'attached' &&
              '[&_[role=tab]]:min-w-0 [&_[role=tab]]:flex-1',
            !fullWidth && resolved !== 'attached' && 'max-w-full',
            className,
          )}
          style={overlayFade ? { ...style, maskImage: overlayFade, WebkitMaskImage: overlayFade } : style}
          {...props}
        >
          {children}
          {underline.width > 0 && (
            <motion.span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-0 left-0',
                resolved === 'underline' && 'z-20 rounded-full bg-primary',
                resolved === 'attached' &&
                  'z-0 rounded-full border border-primary/25 bg-card shadow-sm ring-1 ring-primary/15 dark:border-primary/40 dark:bg-primary/15 dark:ring-primary/25',
                resolved === 'chips' &&
                  'z-0 rounded-lg border border-primary/25 bg-background shadow-sm',
                resolved === 'pill' && 'z-0 rounded-md bg-background shadow-sm',
              )}
              initial={false}
              animate={{
                left: underline.left,
                top: underline.top,
                width: underline.width,
                height: underline.height,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : resolved === 'attached'
                    ? distribution === 'equal'
                      ? {
                          left: { type: 'spring', stiffness: 480, damping: 44, mass: 0.8 },
                          top: { duration: 0 },
                          width: { duration: 0 },
                          height: { duration: 0 },
                        }
                      : {
                          left: { type: 'spring', stiffness: 420, damping: 42, mass: 0.85 },
                          top: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                          width: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                          height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                        }
                    : { type: 'spring', stiffness: 400, damping: 40 }
              }
            />
          )}
        </TabsPrimitive.List>
        {wantsScrollChrome && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(SCROLL_BTN, 'left-0.5', showScrollButtons && edges.start ? 'opacity-100' : 'opacity-0')}
              disabled={!edges.start}
              aria-label={t('common.scrollTabsLeft')}
              onClick={() => scroll(-1)}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(SCROLL_BTN, 'right-0.5', showScrollButtons && edges.end ? 'opacity-100' : 'opacity-0')}
              disabled={!edges.end}
              aria-label={t('common.scrollTabsRight')}
              onClick={() => scroll(1)}
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </Button>
          </>
        )}
      </div>
      </TabsDistributionContext.Provider>
    </TabsVariantContext.Provider>
  )
}

function TabsTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number }) {
  const variant = React.useContext(TabsVariantContext)
  const distribution = React.useContext(TabsDistributionContext)
  const { icon, labels } = partitionTriggerChildren(children)

  return (
    <TabsPrimitive.Trigger
      className={cn(
        tabsTriggerVariants({ variant }),
        variant === 'attached' && distribution === 'equal' && 'flex-1',
        className,
      )}
      title={typeof labels === 'string' ? labels : undefined}
      {...props}
    >
      {variant === 'attached' ? (
        <>
          {icon}
          <span
            className="inline-block whitespace-nowrap text-sm font-medium leading-none"
            data-slot="tabs-trigger-label"
          >
            {labels}
          </span>
        </>
      ) : (
        children
      )}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full bg-muted-foreground/15 px-1.5 text-[11px] leading-4 tabular-nums',
            'group-data-[state=active]/tab:bg-primary/15 group-data-[state=active]/tab:text-primary',
          )}
        >
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const variant = React.useContext(TabsVariantContext)
  return (
    <TabsPrimitive.Content
      className={cn(
        'min-h-0 flex-1 outline-none data-[state=active]:flex data-[state=active]:flex-col',
        variant === 'attached' &&
          'mt-0 rounded-2xl border border-primary/15 bg-card shadow-xs dark:border-primary/25',
        variant !== 'attached' && 'rounded-md',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
