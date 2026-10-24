import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FingerprintIcon,
  GlobeIcon,
  MapPinIcon,
  PlusIcon,
  ShapesIcon,
  Trash2Icon,
  TypeIcon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'

import {
  FIELD_CATEGORIES,
  FIELD_TYPES,
  getFieldType,
  type ColumnSpec,
  type FieldCategory,
} from '@/core/engines/testdata'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/utils/cn'
import { columnsFromPreset, nextColumnKey, SCHEMA_PRESETS } from './presets'

export interface Column extends ColumnSpec {
  key: number
}

const CATEGORY_STYLE: Record<FieldCategory, { icon: LucideIcon; tone: string }> = {
  person: { icon: UserIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' },
  location: { icon: MapPinIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  internet: { icon: GlobeIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  finance: { icon: WalletIcon, tone: 'bg-amber-500/14 text-amber-600 dark:text-amber-400' },
  identifiers: { icon: FingerprintIcon, tone: 'bg-rose-500/12 text-rose-600 dark:text-rose-400' },
  datetime: { icon: CalendarIcon, tone: 'bg-orange-500/12 text-orange-600 dark:text-orange-400' },
  text: { icon: TypeIcon, tone: 'bg-teal-500/12 text-teal-600 dark:text-teal-400' },
  misc: { icon: ShapesIcon, tone: 'bg-slate-500/14 text-slate-600 dark:text-slate-400' },
}

interface SchemaEditorProps {
  columns: Column[]
  onChange: (columns: Column[]) => void
}

export function SchemaEditor({ columns, onChange }: SchemaEditorProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  const update = (key: number, patch: Partial<Column>) =>
    onChange(columns.map((column) => (column.key === key ? { ...column, ...patch } : column)))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= columns.length) return
    const next = [...columns]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const add = () => {
    const type = FIELD_TYPES[0]
    onChange([...columns, { id: `c${columns.length}`, key: nextColumnKey(), name: type.id, type: type.id }])
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t('testData.schema.title')}</h3>
          <p className="truncate text-xs text-muted-foreground">{t('testData.schema.subtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                {t('testData.schema.presets')}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SCHEMA_PRESETS.map((preset) => (
                <DropdownMenuItem key={preset.id} onSelect={() => onChange(columnsFromPreset(preset.columns))}>
                  {t(preset.labelKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="xs" onClick={() => onChange([])} disabled={columns.length === 0}>
            {t('testData.schema.clear')}
          </Button>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
          {t('testData.schema.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {columns.map((column, index) => {
              const category = getFieldType(column.type)?.category ?? 'misc'
              const { icon: Icon, tone } = CATEGORY_STYLE[category]
              return (
                <motion.li
                  key={column.key}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="flex items-stretch gap-2 rounded-xl border bg-card p-2 shadow-xs"
                >
                  <div className={cn('flex w-9 shrink-0 flex-col items-center justify-between rounded-lg py-1', tone)}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-6 text-current hover:bg-black/5 dark:hover:bg-white/10"
                      aria-label={t('testData.schema.moveUp', { name: column.name })}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Icon className="size-4" aria-hidden />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-6 text-current hover:bg-black/5 dark:hover:bg-white/10"
                      aria-label={t('testData.schema.moveDown', { name: column.name })}
                      disabled={index === columns.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={column.name}
                        onChange={(event) => update(column.key, { name: event.target.value })}
                        aria-label={t('testData.schema.columnName')}
                        className="h-8 min-w-0 flex-1 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => update(column.key, { nullable: !column.nullable })}
                        aria-pressed={!!column.nullable}
                        aria-label={t('testData.schema.nullable')}
                        title={t('testData.schema.nullable')}
                        className={cn(
                          'h-8 shrink-0 cursor-pointer rounded-md border px-2 font-mono text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          column.nullable
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-input text-muted-foreground hover:text-foreground',
                        )}
                      >
                        NULL
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onChange(columns.filter((entry) => entry.key !== column.key))}
                        aria-label={t('testData.schema.remove', { name: column.name })}
                        className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                    <Select value={column.type} onValueChange={(type) => update(column.key, { type })}>
                      <SelectTrigger className="h-8 w-full" aria-label={t('testData.schema.fieldType')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_CATEGORIES.map((entry) => (
                          <SelectGroup key={entry}>
                            <SelectLabel>{t(`testData.category.${entry}`)}</SelectLabel>
                            {FIELD_TYPES.filter((type) => type.category === entry).map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <Button variant="outline" size="sm" onClick={add} className="w-full border-dashed">
        <PlusIcon /> {t('testData.schema.addField')}
      </Button>
    </section>
  )
}
