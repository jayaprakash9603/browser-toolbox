import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

type TabsVariant = 'pill' | 'underline'

const TabsVariantContext = React.createContext<TabsVariant>('underline')

const tabsListVariants = cva('inline-flex w-fit items-center text-muted-foreground', {
  variants: {
    variant: {
      pill: 'h-9 justify-center rounded-lg bg-muted p-1',
      underline: 'h-9 gap-0 rounded-none border-0 bg-transparent p-0',
    },
  },
  defaultVariants: { variant: 'underline' },
})

const tabsTriggerVariants = cva(
  'group/tab inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium outline-none transition-[color,background-color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        pill:
          'h-7 flex-1 rounded-md px-3 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        underline:
          'relative z-10 h-9 rounded-none border-0 bg-transparent px-3 shadow-none hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
      },
    },
    defaultVariants: { variant: 'underline' },
  },
)

const UNDERLINE_PX = 2
const SCROLL_PADDING_PX = 24

type UnderlineBox = { left: number; top: number; width: number }
type Edges = { start: boolean; end: boolean }

function activeTab(list: HTMLElement): HTMLElement | null {
  return list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
}

/** Position inside the list's scrollable content, so wrapped rows and scrolled lists line up. */
function measureActiveTab(list: HTMLElement | null): UnderlineBox {
  const active = list && activeTab(list)
  if (!list || !active) return { left: 0, top: 0, width: 0 }
  const l = list.getBoundingClientRect()
  const a = active.getBoundingClientRect()
  return {
    left: a.left - l.left + list.scrollLeft,
    top: a.bottom - l.top + list.scrollTop - UNDERLINE_PX,
    width: a.width,
  }
}

function measureEdges(list: HTMLElement | null): Edges {
  if (!list || list.scrollWidth <= list.clientWidth + 1) return { start: false, end: false }
  return {
    start: list.scrollLeft > 1,
    end: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
  }
}

function listOverflows(list: HTMLElement | null): boolean {
  return !!list && list.scrollWidth > list.clientWidth + 1
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

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-3', className)} {...props} />
}

function TabsList({
  className,
  variant = 'underline',
  scrollButtons = 'auto',
  fullWidth = false,
  children,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    /** Chevron controls when tabs overflow; use false for wrapped tab rows. */
    scrollButtons?: boolean | 'auto'
    /** Stretch the tab row to the container so each tab is the same width. */
    fullWidth?: boolean
  }) {
  const { t } = useTranslation()
  const resolved = variant ?? 'underline'
  const listRef = React.useRef<HTMLDivElement>(null)
  const [underline, setUnderline] = React.useState<UnderlineBox>({ left: 0, top: 0, width: 0 })
  const [edges, setEdges] = React.useState<Edges>({ start: false, end: false })
  const [overflowing, setOverflowing] = React.useState(false)
  const reduceMotion = useReducedMotion()
  const showScrollButtons = scrollButtons === true || (scrollButtons === 'auto' && overflowing)

  const sync = React.useCallback(() => {
    const node = listRef.current
    setOverflowing(listOverflows(node))
    setEdges((prev) => {
      const next = measureEdges(node)
      return next.start === prev.start && next.end === prev.end ? prev : next
    })
    if (resolved === 'underline') setUnderline(measureActiveTab(node))
  }, [resolved])

  React.useLayoutEffect(() => {
    const node = listRef.current
    if (!node) return
    scrollActiveIntoView(node, false)
    sync()

    const observer = new MutationObserver(() => {
      scrollActiveIntoView(node, !reduceMotion)
      sync()
    })
    observer.observe(node, { attributes: true, subtree: true, attributeFilter: ['data-state'], childList: true })

    const resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(node)
    for (const tab of node.querySelectorAll('[role="tab"]')) resizeObserver.observe(tab)

    node.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      node.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync, reduceMotion])

  const scroll = (direction: -1 | 1) => {
    const node = listRef.current
    if (!node) return
    scrollTabsBy(node, direction, !reduceMotion)
  }

  return (
    <TabsVariantContext.Provider value={resolved}>
      <div
        className={cn(
          'flex w-full max-w-full items-stretch',
          resolved === 'underline' && 'border-b border-border',
          !showScrollButtons && !fullWidth && 'w-fit',
          fullWidth && 'w-full',
        )}
      >
        {showScrollButtons && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="my-auto shrink-0 rounded-md text-muted-foreground disabled:opacity-25"
            disabled={!edges.start}
            aria-label={t('common.scrollTabsLeft')}
            onClick={() => scroll(-1)}
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
        )}
        <TabsPrimitive.List
          ref={listRef}
          className={cn(
            tabsListVariants({ variant: resolved }),
            'relative',
            showScrollButtons
              ? 'min-w-0 flex-1 overflow-x-auto overscroll-x-contain scrollbar-none'
              : 'max-w-full',
            className,
          )}
          style={style}
          {...props}
        >
          {children}
          {resolved === 'underline' && underline.width > 0 && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 z-20 h-0.5 rounded-full bg-primary"
              initial={false}
              animate={{ left: underline.left, top: underline.top, width: underline.width }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }}
            />
          )}
        </TabsPrimitive.List>
        {showScrollButtons && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="my-auto shrink-0 rounded-md text-muted-foreground disabled:opacity-25"
            disabled={!edges.end}
            aria-label={t('common.scrollTabsRight')}
            onClick={() => scroll(1)}
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        )}
      </div>
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
  return (
    <TabsPrimitive.Trigger className={cn(tabsTriggerVariants({ variant }), className)} {...props}>
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[11px] leading-4 tabular-nums group-data-[state=active]/tab:bg-primary/15 group-data-[state=active]/tab:text-primary">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'min-h-0 flex-1 outline-none rounded-md data-[state=active]:flex data-[state=active]:flex-col',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
