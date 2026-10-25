import { useId, useState, type ReactNode } from 'react'

import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'
import { isHexColor } from './generators'

const ROW = 'grid grid-cols-[minmax(4.5rem,6.5rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1'

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs', className)}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (raw: string) => {
    setDraft(raw)
    const next = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(next)) onChange(Math.min(Math.max(next, min), max))
  }
  return (
    <div className={ROW}>
      <Label htmlFor={id} className="truncate text-xs font-medium">
        {label}
      </Label>
      <div className="flex min-w-0 items-center gap-2">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([next]) => {
            setDraft(null)
            onChange(next)
          }}
          thumbLabel={label}
          getValueText={(v) => `${v}${unit ?? ''}`}
          className="min-w-0 flex-1"
        />
        <div className="relative w-[4.5rem] shrink-0">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft ?? value}
            onChange={(event) => commit(event.target.value)}
            onBlur={() => setDraft(null)}
            className={cn(
              'h-8 [appearance:textfield] px-2 font-mono text-xs tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              unit && 'pr-7',
            )}
          />
          {unit && (
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value
  const invalid = draft !== null && !isHexColor(draft)
  return (
    <div className={ROW}>
      <Label htmlFor={id} className="truncate text-xs font-medium">
        {label}
      </Label>
      <div className="flex min-w-0 items-center gap-2">
        <label
          className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
          style={{ backgroundColor: value }}
        >
          <span className="sr-only">{label}</span>
          <input
            type="color"
            value={value}
            onChange={(event) => {
              setDraft(null)
              onChange(event.target.value)
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <Input
          id={id}
          value={text}
          spellCheck={false}
          aria-invalid={invalid}
          onChange={(event) => {
            const next = event.target.value.trim()
            setDraft(next)
            const hex = next.startsWith('#') ? next : `#${next}`
            if (isHexColor(hex)) onChange(hex.toLowerCase())
          }}
          onBlur={() => setDraft(null)}
          className={cn('h-8 min-w-0 flex-1 px-2 font-mono text-xs uppercase', invalid && 'border-destructive focus-visible:ring-destructive/30')}
        />
      </div>
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
}) {
  const id = useId()
  return (
    <div className={ROW}>
      <Label htmlFor={id} className="truncate text-xs font-medium">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
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

export function SwitchField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/** Label column plus a control, for controls that are not one of the fields above. */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={ROW}>
      <span className="truncate text-xs font-medium">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
