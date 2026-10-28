import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react'
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { ChevronDownIcon, CircleAlertIcon, type LucideIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const

export function Section({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
  open,
  onOpenChange,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Pass with `onOpenChange` to make the section collapsible. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const headingId = useId()
  const bodyId = useId()
  const reduce = useReducedMotion()
  const collapsible = onOpenChange !== undefined
  const expanded = !collapsible || !!open
  const Title = collapsible ? 'span' : 'h2'

  const heading = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Title id={headingId} className="truncate text-[13px] leading-5 font-semibold">
          {title}
        </Title>
        {description && (
          <span className="truncate text-[11px] leading-4 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </>
  )

  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-xl border bg-card p-3 shadow-xs', className)}
    >
      <header className="flex items-center gap-2">
        {collapsible ? (
          <h2 className="flex min-w-0 flex-1">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={bodyId}
              onClick={() => onOpenChange(!expanded)}
              className="-m-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg p-1 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {heading}
              <ChevronDownIcon
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
          </h2>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">{heading}</div>
        )}
        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </header>
      {collapsible ? (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id={bodyId}
              key="body"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="-mx-1 -mb-1 overflow-hidden px-1"
            >
              <div className="flex flex-col gap-3 pt-3 pb-1">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="flex flex-col gap-3 pt-3">{children}</div>
      )}
    </section>
  )
}

/** Fades a block in a beat after the one before it, so a panel assembles top to bottom. */
export function Reveal({
  index = 0,
  children,
  className,
}: {
  index?: number
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT, delay: Math.min(index, 8) * 0.045 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string
  children: ReactNode
  required?: boolean
  hint?: ReactNode
}) {
  return (
    <div className="flex min-h-4 items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {children}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground tabular-nums">{hint}</span>}
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message: string | null }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex items-center gap-1 overflow-hidden text-[11px] font-medium text-destructive"
        >
          <CircleAlertIcon className="size-3 shrink-0" aria-hidden />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/** Nudges its children sideways each time `trigger` grows while `active`. */
export function Shake({
  trigger,
  active,
  children,
  className,
}: {
  trigger: number
  active: boolean
  children: ReactNode
  className?: string
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduce = useReducedMotion()
  const lastTrigger = useRef(trigger)

  useEffect(() => {
    if (trigger === lastTrigger.current) return
    lastTrigger.current = trigger
    if (!active || reduce || !scope.current) return
    void animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.38, ease: 'easeInOut' })
  }, [trigger, active, reduce, animate, scope])

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  )
}

export function IconAction({
  label,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, 'size' | 'variant' | 'aria-label'> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          className={cn('text-muted-foreground hover:text-foreground', className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
