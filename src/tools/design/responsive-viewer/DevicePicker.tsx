import { useCallback, useId, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckIcon, ChevronDownIcon, MonitorSmartphoneIcon, PlusIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { CUSTOM_MAX, CUSTOM_MIN, DEVICE_KINDS, isValidDimension, kindForWidth, type Device, type DeviceKind } from './devices'
import { EASE_OUT, KIND_ICON } from './helpers'

type Filter = 'all' | DeviceKind

const DEVICES_OPEN_KEY = 'tbx.rv.devices.open'

function readDevicesOpen(selectedCount: number): boolean {
  try {
    const stored = localStorage.getItem(DEVICES_OPEN_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    /* preference only */
  }
  return selectedCount === 0
}

interface DevicePickerProps {
  devices: readonly Device[]
  selected: readonly string[]
  onToggle: (id: string) => void
  onClear: () => void
  onAddCustom: (device: Device) => void
  onRemoveCustom: (id: string) => void
}

export function DevicePicker({ devices, selected, onToggle, onClear, onAddCustom, onRemoveCustom }: DevicePickerProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const panelId = useId()
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState(() => readDevicesOpen(selected.length))

  const visible = filter === 'all' ? devices : devices.filter((d) => d.kind === filter)
  const selectedDevices = useMemo(
    () => selected.map((id) => devices.find((d) => d.id === id)).filter((d): d is Device => d != null),
    [devices, selected],
  )

  const summary = useMemo(() => {
    if (selectedDevices.length === 0) return t('rv.devices.summaryNone')
    const names = selectedDevices.slice(0, 2).map((d) => d.label)
    const rest = selectedDevices.length - names.length
    if (rest <= 0) return names.join(', ')
    return t('rv.devices.summaryMore', { names: names.join(', '), count: rest })
  }, [selectedDevices, t])

  const changeOpen = useCallback((next: boolean) => {
    setOpen(next)
    try {
      localStorage.setItem(DEVICES_OPEN_KEY, next ? '1' : '0')
    } catch {
      /* preference only */
    }
  }, [])

  return (
    <section className="overflow-hidden rounded-2xl border bg-card/70 shadow-xs">
      <div className="flex items-center gap-1 p-1.5 @[480px]:p-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t('rv.devices.collapse') : t('rv.devices.expand')}
          title={open ? t('rv.devices.collapse') : t('rv.devices.expand')}
          onClick={() => changeOpen(!open)}
          className="group flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <MonitorSmartphoneIcon className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-5">{t('rv.devices.title')}</span>
            <AnimatePresence initial={false} mode="wait">
              {!open && (
                <motion.span
                  key="summary"
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="block truncate text-[11px] leading-4 text-muted-foreground"
                >
                  {summary}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {t('rv.devices.selected', { count: selected.length })}
          </Badge>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </button>
        <Button variant="ghost" size="xs" className="shrink-0" onClick={onClear} disabled={selected.length === 0}>
          {t('rv.devices.clear')}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="picker"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: reduceMotion ? 0 : 0.16, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t px-3 pb-3 pt-2.5 @[480px]:px-4 @[480px]:pb-4">
              <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <Segmented<Filter>
                  size="sm"
                  ariaLabel={t('rv.devices.filter')}
                  value={filter}
                  onValueChange={setFilter}
                  options={[
                    { value: 'all', label: t('rv.kind.all') },
                    ...DEVICE_KINDS.map((kind) => {
                      const Icon = KIND_ICON[kind]
                      return {
                        value: kind,
                        label: (
                          <>
                            <Icon aria-hidden />
                            {t(`rv.kind.${kind}`)}
                          </>
                        ),
                      }
                    }),
                  ]}
                />
              </div>

              <motion.ul layout className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((device) => (
                    <motion.li
                      key={device.id}
                      layout="position"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="flex"
                    >
                      <DeviceChip
                        device={device}
                        on={selected.includes(device.id)}
                        onToggle={() => onToggle(device.id)}
                        onRemove={device.custom ? () => onRemoveCustom(device.id) : undefined}
                      />
                    </motion.li>
                  ))}
                  <motion.li key="custom" layout="position" className="flex">
                    <CustomDevicePopover onAdd={onAddCustom} />
                  </motion.li>
                </AnimatePresence>
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function DeviceChip({ device, on, onToggle, onRemove }: { device: Device; on: boolean; onToggle: () => void; onRemove?: () => void }) {
  const { t } = useTranslation()
  const Icon = KIND_ICON[device.kind]
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        className={cn(
          'inline-flex h-8 cursor-pointer items-center gap-1.5 border px-2.5 text-xs font-medium outline-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring',
          onRemove ? 'rounded-l-lg' : 'rounded-lg',
          on
            ? 'border-primary/40 bg-primary/10 text-primary shadow-xs hover:bg-primary/15'
            : 'bg-background text-foreground/80 hover:border-foreground/20 hover:bg-accent hover:text-foreground',
        )}
      >
        <span className="relative flex size-3.5 items-center justify-center" aria-hidden>
          <AnimatePresence initial={false} mode="wait">
            {on ? (
              <motion.span
                key="on"
                className="flex"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              >
                <CheckIcon className="size-3.5" strokeWidth={2.5} />
              </motion.span>
            ) : (
              <motion.span
                key="off"
                className="flex"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Icon className="size-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="whitespace-nowrap">{device.label}</span>
        <span className="whitespace-nowrap font-mono text-[10px] tabular-nums opacity-70">
          {device.width}×{device.height}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('rv.custom.remove', { name: device.label })}
          title={t('rv.custom.remove', { name: device.label })}
          className="inline-flex h-8 w-7 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 bg-background text-muted-foreground outline-none transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      )}
    </>
  )
}

function CustomDevicePopover({ onAdd }: { onAdd: (device: Device) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [width, setWidth] = useState('390')
  const [height, setHeight] = useState('844')
  const [touched, setTouched] = useState(false)
  const w = Number(width)
  const h = Number(height)
  const valid = isValidDimension(w) && isValidDimension(h)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!valid) return
    onAdd({
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      label: name.trim() || t('rv.custom.defaultName', { width: w, height: h }),
      kind: kindForWidth(w),
      width: w,
      height: h,
      custom: true,
    })
    setName('')
    setTouched(false)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary/50 data-[state=open]:text-primary"
        >
          <PlusIcon className="size-3.5" aria-hidden />
          {t('rv.custom.add')}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <p className="text-sm font-semibold">{t('rv.custom.title')}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name`} className="text-[11px] font-medium text-muted-foreground">
              {t('rv.custom.name')}
            </label>
            <Input
              id={`${id}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rv.custom.namePlaceholder')}
              maxLength={40}
              className="h-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['width', width, setWidth],
                ['height', height, setHeight],
              ] as const
            ).map(([field, value, set]) => (
              <div key={field} className="flex flex-col gap-1">
                <label htmlFor={`${id}-${field}`} className="text-[11px] font-medium text-muted-foreground">
                  {t(`rv.custom.${field}`)}
                </label>
                <div className="relative">
                  <Input
                    id={`${id}-${field}`}
                    type="number"
                    inputMode="numeric"
                    min={CUSTOM_MIN}
                    max={CUSTOM_MAX}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    aria-invalid={touched && !isValidDimension(Number(value))}
                    aria-describedby={`${id}-hint`}
                    className="h-8 pr-7 font-mono tabular-nums aria-invalid:border-destructive"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">px</span>
                </div>
              </div>
            ))}
          </div>
          <p id={`${id}-hint`} className={cn('text-[11px]', touched && !valid ? 'text-destructive' : 'text-muted-foreground')}>
            {t('rv.custom.range', { min: CUSTOM_MIN, max: CUSTOM_MAX })}
          </p>
          <Button type="submit" size="sm">
            <PlusIcon />
            {t('rv.custom.save')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
