import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { cn } from '@/shared/utils/cn'

interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  side?: 'left' | 'right'
  children: ReactNode
  onClear?: () => void
  clearLabel?: string
  doneLabel?: string
}

export function FilterSheet({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  children,
  onClear,
  clearLabel,
  doneLabel,
}: FilterSheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-5 px-4 py-4">{children}</div>
        </div>
        <SheetFooter className={cn(onClear ? 'justify-between' : 'justify-end')}>
          {onClear ? (
            <Button type="button" variant="ghost" size="sm" className="min-h-11 px-3" onClick={onClear}>
              {clearLabel ?? t('common.clearAll')}
            </Button>
          ) : null}
          <Button type="button" size="sm" className="min-h-11 min-w-[5.5rem] px-4" onClick={() => onOpenChange(false)}>
            {doneLabel ?? t('common.done')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface FilterSectionProps {
  label: string
  hint?: string
  children: ReactNode
}

export function FilterSection({ label, hint, children }: FilterSectionProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="space-y-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
        {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

interface FilterOption<T extends string> {
  value: T
  label: string
}

interface FilterOptionListProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly FilterOption<T>[]
  ariaLabel: string
}

export function FilterOptionList<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
}: FilterOptionListProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'flex min-h-11 w-full items-center justify-between rounded-xl border px-3.5 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/80 bg-card text-foreground hover:border-foreground/20 hover:bg-muted/50',
            )}
          >
            {option.label}
            <span
              className={cn(
                'size-4 shrink-0 rounded-full border',
                selected ? 'border-primary bg-primary shadow-[inset_0_0_0_3px] shadow-background' : 'border-input',
              )}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
