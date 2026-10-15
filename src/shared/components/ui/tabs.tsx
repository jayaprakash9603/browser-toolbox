import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useReducedMotion } from 'motion/react'

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

function measureActiveTab(list: HTMLElement | null) {
  if (!list) return { left: 0, width: 0 }
  const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
  if (!active) return { left: 0, width: 0 }
  return { left: active.offsetLeft, width: active.offsetWidth }
}

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-3', className)} {...props} />
}

function TabsList({
  className,
  variant = 'underline',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const resolved = variant ?? 'underline'
  const listRef = React.useRef<HTMLDivElement>(null)
  const [underline, setUnderline] = React.useState({ left: 0, width: 0 })
  const reduceMotion = useReducedMotion()

  const syncUnderline = React.useCallback(() => {
    if (resolved !== 'underline') return
    setUnderline(measureActiveTab(listRef.current))
  }, [resolved])

  React.useLayoutEffect(() => {
    if (resolved !== 'underline') return
    syncUnderline()
    const node = listRef.current
    if (!node) return

    const observer = new MutationObserver(syncUnderline)
    observer.observe(node, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-state'],
      childList: true,
    })

    const resizeObserver = new ResizeObserver(syncUnderline)
    resizeObserver.observe(node)
    for (const tab of node.querySelectorAll('[role="tab"]')) {
      resizeObserver.observe(tab)
    }

    window.addEventListener('resize', syncUnderline)
    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncUnderline)
    }
  }, [resolved, syncUnderline])

  return (
    <TabsVariantContext.Provider value={resolved}>
      <div className={cn('relative w-fit max-w-full', resolved === 'underline' && 'border-b border-border')}>
        <TabsPrimitive.List
          ref={listRef}
          className={cn(tabsListVariants({ variant: resolved }), className)}
          {...props}
        />
        {resolved === 'underline' && underline.width > 0 && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 z-20 h-0.5 bg-primary"
            initial={false}
            animate={{ left: underline.left, width: underline.width }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 400, damping: 40 }
            }
          />
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
        'min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-md data-[state=active]:flex data-[state=active]:flex-col',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
