import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { CircleAlertIcon } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

export function OptionField({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

interface OptionSelectProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  className?: string
  disabled?: boolean
}

export function OptionSelect<T extends string>({ label, value, onChange, options, className, disabled }: OptionSelectProps<T>) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function OptionSwitch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-2.5 py-1.5', disabled && 'opacity-50')}>
      <label htmlFor={id} className="flex min-w-0 flex-col">
        <span className="text-xs font-medium">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

export function PanelError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  )
}

export function PanelSection({
  title,
  icon,
  actions,
  children,
  className,
}: {
  title: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4', className)}>
      <header className="flex min-h-7 items-center gap-2">
        {icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-3.5" aria-hidden>
            {icon}
          </span>
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** Sticky footer for a panel's primary action, with an optional progress line along its top edge. */
export function ActionBar({ children, progress, className }: { children: ReactNode; progress?: number | null; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 overflow-hidden rounded-2xl border bg-background/90 p-2.5 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      {progress != null && (
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 origin-left bg-gradient-to-r from-[var(--hero-from)] to-[var(--hero-to)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0.02, Math.min(1, progress)) }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
        />
      )}
      {children}
    </div>
  )
}
