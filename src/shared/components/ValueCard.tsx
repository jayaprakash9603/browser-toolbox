import { Children, type ComponentType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/shared/components/CopyButton'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

interface ValueCardProps {
  label: ReactNode
  value: ReactNode
  /** Text placed on the clipboard; defaults to `value` when it is a string. */
  copyText?: string
  hint?: ReactNode
  icon?: ComponentType<{ className?: string }>
  mono?: boolean
  emphasis?: boolean
  className?: string
}

export function ValueCard({
  label,
  value,
  copyText,
  hint,
  icon: Icon,
  mono = true,
  emphasis = false,
  className,
}: ValueCardProps) {
  const { t } = useTranslation()
  const clip = copyText ?? (typeof value === 'string' ? value : '')
  const copyLabel = typeof label === 'string' ? `${t('common.copy')} ${label}` : undefined
  return (
    <div
      className={cn(
        'group/value flex h-full min-w-0 flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-sm',
        emphasis && 'border-primary/30 bg-primary/[0.04]',
        className,
      )}
    >
      <div className="flex min-h-6 items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {clip && <CopyButton text={clip} label={copyLabel} />}
      </div>
      <div
        className={cn(
          'min-w-0 text-foreground',
          mono ? 'font-mono text-[13px] break-all tabular-nums' : 'text-sm break-words',
          emphasis && 'text-[15px] font-semibold',
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

interface ValueGridProps {
  children: ReactNode
  /** Columns once the container is wide enough. */
  columns?: 2 | 3
  className?: string
}

export function ValueGrid({ children, columns = 2, className }: ValueGridProps) {
  return (
    <div className="@container">
      <StaggerChildren
        stagger={0.035}
        className={cn(
          'grid grid-cols-1 gap-2 @sm:grid-cols-2',
          columns === 3 && '@2xl:grid-cols-3',
          className,
        )}
      >
        {Children.toArray(children).map((child, index) => (
          <StaggerItem key={index} className="min-w-0">
            {child}
          </StaggerItem>
        ))}
      </StaggerChildren>
    </div>
  )
}

interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string }>
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-xs', className)}>
      {(title || actions) && (
        <header className="flex items-center gap-2.5 border-b px-3 py-2.5">
          {Icon && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate text-[13px] font-semibold">{title}</h3>}
            {description && (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn('p-3', bodyClassName)}>{children}</div>
    </section>
  )
}
