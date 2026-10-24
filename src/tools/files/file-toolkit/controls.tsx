import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleAlertIcon } from 'lucide-react'

import type { DocumentSettings } from '@/core/engines/files/document'
import { Segmented } from '@/shared/components/ui/segmented'
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
}

export function OptionSelect<T extends string>({ label, value, onChange, options, className }: OptionSelectProps<T>) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
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

const FONT_SIZES = ['9', '10', '11', '12', '14', '16'] as const
const LINE_HEIGHTS = ['1.15', '1.4', '1.6', '2'] as const

interface DocumentSettingsFormProps {
  value: DocumentSettings
  onChange: (value: DocumentSettings) => void
  /** Hide title, Markdown and line-number options for batch conversion. */
  compact?: boolean
}

export function DocumentSettingsForm({ value, onChange, compact = false }: DocumentSettingsFormProps) {
  const { t } = useTranslation()
  const set = <K extends keyof DocumentSettings>(key: K, next: DocumentSettings[K]) => onChange({ ...value, [key]: next })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5 @[520px]:grid-cols-3">
        <OptionSelect
          label={t('fs.doc.pageSize')}
          value={value.pageSize}
          onChange={(next) => set('pageSize', next)}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'letter', label: 'US Letter' },
            { value: 'legal', label: 'US Legal' },
          ]}
        />
        <OptionField label={t('fs.doc.orientation')}>
          <Segmented
            size="sm"
            ariaLabel={t('fs.doc.orientation')}
            value={value.orientation}
            onValueChange={(next) => set('orientation', next)}
            options={[
              { value: 'portrait', label: t('fs.doc.portrait') },
              { value: 'landscape', label: t('fs.doc.landscape') },
            ]}
            className="h-8 w-full [&>button]:flex-1"
          />
        </OptionField>
        <OptionSelect
          label={t('fs.doc.margins')}
          value={value.margin}
          onChange={(next) => set('margin', next)}
          options={[
            { value: 'narrow', label: t('fs.doc.narrow') },
            { value: 'normal', label: t('fs.doc.normal') },
            { value: 'wide', label: t('fs.doc.wide') },
          ]}
        />
        <OptionSelect
          label={t('fs.doc.font')}
          value={value.font}
          onChange={(next) => set('font', next)}
          options={[
            { value: 'sans', label: t('fs.doc.sans') },
            { value: 'serif', label: t('fs.doc.serif') },
            { value: 'mono', label: t('fs.doc.mono') },
          ]}
        />
        <OptionSelect
          label={t('fs.doc.fontSize')}
          value={String(value.fontSize) as (typeof FONT_SIZES)[number]}
          onChange={(next) => set('fontSize', Number(next))}
          options={FONT_SIZES.map((size) => ({ value: size, label: `${size} pt` }))}
        />
        <OptionSelect
          label={t('fs.doc.lineHeight')}
          value={String(value.lineHeight) as (typeof LINE_HEIGHTS)[number]}
          onChange={(next) => set('lineHeight', Number(next))}
          options={LINE_HEIGHTS.map((height) => ({ value: height, label: `${height}×` }))}
        />
      </div>
      <div className="grid gap-2 @[520px]:grid-cols-2">
        <OptionSwitch label={t('fs.doc.pageNumbers')} checked={value.pageNumbers} onChange={(next) => set('pageNumbers', next)} />
        {!compact && (
          <>
            <OptionSwitch
              label={t('fs.doc.markdown')}
              hint={t('fs.doc.markdownHint')}
              checked={value.markdown}
              onChange={(next) => set('markdown', next)}
            />
            <OptionSwitch
              label={t('fs.doc.lineNumbers')}
              hint={t('fs.doc.lineNumbersHint')}
              checked={value.lineNumbers}
              disabled={value.markdown}
              onChange={(next) => set('lineNumbers', next)}
            />
          </>
        )}
      </div>
    </div>
  )
}
