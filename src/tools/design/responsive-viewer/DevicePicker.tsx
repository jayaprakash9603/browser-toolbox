import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ChipRail } from '@/shared/components/ChipRail'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import {
  CUSTOM_MAX,
  CUSTOM_MIN,
  DEVICE_KINDS,
  breakpointFor,
  isValidDimension,
  kindForWidth,
  type Device,
  type DeviceKind,
} from './devices'
import { EASE_OUT, KIND_ICON, KIND_TONE } from './helpers'

type Filter = 'all' | DeviceKind

const ESSENTIALS = ['iphone', 'ipad-mini', 'laptop', 'desktop']

function KindBadge({ kind, className }: { kind: DeviceKind; className?: string }) {
  const Icon = KIND_ICON[kind]
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        KIND_TONE[kind],
        className,
      )}
      aria-hidden
    >
      <Icon className="size-[55%]" />
    </span>
  )
}

interface DeviceMenuProps {
  devices: readonly Device[]
  selected: readonly string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (id: string) => void
  onSelect: (ids: string[]) => void
  onAddCustom: (device: Device) => void
  onRemoveCustom: (id: string) => void
}

/** Toolbar switcher for the device list: search, filter by type, pick in bulk, or add a custom size. */
export function DeviceMenu({
  devices,
  selected,
  open,
  onOpenChange,
  onToggle,
  onSelect,
  onAddCustom,
  onRemoveCustom,
}: DeviceMenuProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)
  const list = useRef<HTMLDivElement>(null)

  const search = query.trim().toLowerCase()
  const matches = devices.filter(
    (device) =>
      (filter === 'all' || device.kind === filter) &&
      (!search ||
        `${device.label} ${device.width}x${device.height}`.toLowerCase().includes(search)),
  )
  const groups = DEVICE_KINDS.map((kind) => ({
    kind,
    items: matches.filter((device) => device.kind === kind),
  })).filter((group) => group.items.length > 0)
  const selectedKinds = useMemo(
    () =>
      DEVICE_KINDS.filter((kind) =>
        devices.some((device) => device.kind === kind && selected.includes(device.id)),
      ),
    [devices, selected],
  )

  const setGroup = (items: readonly Device[], on: boolean) => {
    const ids = items.map((device) => device.id)
    onSelect(on ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)))
  }

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [
      ...(list.current?.querySelectorAll<HTMLButtonElement>('button[data-device]') ?? []),
    ]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setQuery('')
          setAdding(false)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 pl-1.5"
          aria-label={t('rv.devices.open')}
        >
          <span className="flex -space-x-1.5" aria-hidden>
            {(selectedKinds.length > 0 ? selectedKinds : (['phone'] as DeviceKind[])).map(
              (kind) => (
                <KindBadge
                  key={kind}
                  kind={kind}
                  className="size-6 rounded-full ring-2 ring-background"
                />
              ),
            )}
          </span>
          <span className="hidden text-xs font-semibold @[360px]:inline">
            {t('rv.devices.title')}
          </span>
          <span className="rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums">
            {selected.length}
          </span>
          <ChevronsUpDownIcon aria-hidden className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[min(22rem,calc(100vw-1.5rem))] flex-col p-0">
        <div className="flex flex-col gap-2 border-b p-2">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && matches[0]) onToggle(matches[0].id)
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  list.current?.querySelector<HTMLButtonElement>('button[data-device]')?.focus()
                }
              }}
              placeholder={t('rv.devices.search')}
              aria-label={t('rv.devices.search')}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Segmented<Filter>
            size="sm"
            ariaLabel={t('rv.devices.filter')}
            value={filter}
            onValueChange={setFilter}
            className="w-full [&>*]:flex-1"
            options={[
              { value: 'all', label: t('rv.kind.all') },
              ...DEVICE_KINDS.map((kind) => {
                const Icon = KIND_ICON[kind]
                return {
                  value: kind,
                  title: t(`rv.kind.${kind}`),
                  label: (
                    <>
                      <Icon aria-label={t(`rv.kind.${kind}`)} />
                      <span className="tabular-nums">
                        {devices.filter((device) => device.kind === kind).length}
                      </span>
                    </>
                  ),
                }
              }),
            ]}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                onSelect(ESSENTIALS.filter((id) => devices.some((device) => device.id === id)))
              }
              title={t('rv.devices.essentialsHint')}
            >
              <SparklesIcon />
              {t('rv.devices.essentials')}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setGroup(matches, true)}
              disabled={matches.length === 0}
            >
              <CheckIcon />
              {t('rv.devices.selectShown')}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="ml-auto hover:text-destructive"
              onClick={() => onSelect([])}
              disabled={selected.length === 0}
            >
              {t('rv.devices.clear')}
            </Button>
          </div>
        </div>

        <div
          ref={list}
          onKeyDown={onListKey}
          className="scrollbar-styled max-h-72 overflow-y-auto p-1.5"
        >
          {groups.map(({ kind, items }) => {
            const chosen = items.filter((device) => selected.includes(device.id)).length
            const all = chosen === items.length
            return (
              <div key={kind} className="pb-1" role="group" aria-label={t(`rv.kind.${kind}`)}>
                <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
                  <p className="flex-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t(`rv.kind.${kind}`)}
                    <span className="ml-1.5 font-mono tabular-nums normal-case">
                      {chosen}/{items.length}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setGroup(items, !all)}
                    className="cursor-pointer rounded px-1 text-[10px] font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {all ? t('rv.devices.none') : t('rv.devices.all')}
                  </button>
                </div>
                {items.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    on={selected.includes(device.id)}
                    onToggle={() => onToggle(device.id)}
                    onRemove={device.custom ? () => onRemoveCustom(device.id) : undefined}
                  />
                ))}
              </div>
            )
          })}
          {groups.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {t('rv.devices.noResults', { query: query.trim() })}
            </p>
          )}
        </div>

        <div className="border-t p-1.5">
          <AnimatePresence initial={false} mode="wait">
            {adding ? (
              <motion.div
                key="form"
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <CustomDeviceForm
                  onAdd={(device) => {
                    onAddCustom(device)
                    setAdding(false)
                  }}
                  onCancel={() => setAdding(false)}
                />
              </motion.div>
            ) : (
              <motion.button
                key="add"
                type="button"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setAdding(true)}
                className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusIcon className="size-3.5" aria-hidden />
                {t('rv.custom.add')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DeviceRow({
  device,
  on,
  onToggle,
  onRemove,
}: {
  device: Device
  on: boolean
  onToggle: () => void
  onRemove?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="group/row flex items-center gap-0.5">
      <button
        type="button"
        data-device
        aria-pressed={on}
        onClick={onToggle}
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
          on && 'bg-primary/[0.06]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150',
            on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
          )}
        >
          <AnimatePresence initial={false}>
            {on && (
              <motion.span
                className="flex"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 28 }}
              >
                <CheckIcon className="size-3" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <KindBadge kind={device.kind} className="size-7" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('truncate text-xs leading-4', on ? 'font-semibold' : 'font-medium')}>
            {device.label}
          </span>
          <span className="font-mono text-[10px] leading-4 text-muted-foreground tabular-nums">
            {device.width}×{device.height}
          </span>
        </span>
        <span
          className="shrink-0 rounded border px-1 font-mono text-[10px] leading-4 text-muted-foreground"
          title={t('rv.card.breakpoint', { name: breakpointFor(device.width) })}
        >
          {breakpointFor(device.width)}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('rv.custom.remove', { name: device.label })}
          title={t('rv.custom.remove', { name: device.label })}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

interface SelectedDevicesProps {
  devices: readonly Device[]
  selected: readonly string[]
  onRemove: (id: string) => void
  onJump: (id: string) => void
  onOpenMenu: () => void
}

/** Always-visible row of the devices being previewed; tap one to scroll to its preview. */
export function SelectedDevices({
  devices,
  selected,
  onRemove,
  onJump,
  onOpenMenu,
}: SelectedDevicesProps) {
  const { t } = useTranslation()
  const chosen = selected
    .map((id) => devices.find((device) => device.id === id))
    .filter((device): device is Device => device != null)

  if (chosen.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PlusIcon className="size-3.5" aria-hidden />
        {t('rv.devices.empty')}
      </button>
    )
  }

  return (
    <ChipRail label={t('rv.devices.title')}>
      <AnimatePresence initial={false} mode="popLayout">
        {chosen.map((device) => (
          <motion.span
            key={device.id}
            layout="position"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex h-7 shrink-0 items-center rounded-full border bg-background shadow-xs"
          >
            <button
              type="button"
              onClick={() => onJump(device.id)}
              title={t('rv.devices.jump', { name: device.label })}
              className="flex h-full cursor-pointer items-center gap-1.5 rounded-l-full pr-1.5 pl-0.5 text-[11px] font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <KindBadge kind={device.kind} className="size-6 rounded-full" />
              <span className="whitespace-nowrap">{device.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {device.width}×{device.height}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(device.id)}
              aria-label={t('rv.card.hide')}
              title={t('rv.card.hide')}
              className="mr-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-3" aria-hidden />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </ChipRail>
  )
}

function CustomDeviceForm({
  onAdd,
  onCancel,
}: {
  onAdd: (device: Device) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
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
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 p-1" noValidate>
      <p className="text-xs font-semibold">{t('rv.custom.title')}</p>
      <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-1.5">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-name`} className="text-[10px] font-medium text-muted-foreground">
            {t('rv.custom.name')}
          </label>
          <Input
            id={`${id}-name`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('rv.custom.namePlaceholder')}
            maxLength={40}
            className="h-8 text-xs"
          />
        </div>
        {(
          [
            ['width', width, setWidth],
            ['height', height, setHeight],
          ] as const
        ).map(([field, value, set]) => (
          <div key={field} className="flex flex-col gap-1">
            <label
              htmlFor={`${id}-${field}`}
              className="text-[10px] font-medium text-muted-foreground"
            >
              {t(`rv.custom.${field}`)}
            </label>
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
              className="h-8 px-2 font-mono text-xs tabular-nums aria-invalid:border-destructive"
            />
          </div>
        ))}
      </div>
      <p
        id={`${id}-hint`}
        className={cn(
          'text-[10px]',
          touched && !valid ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {t('rv.custom.range', { min: CUSTOM_MIN, max: CUSTOM_MAX })}
      </p>
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          {t('rv.custom.cancel')}
        </Button>
        <Button type="submit" size="xs">
          <PlusIcon />
          {t('rv.custom.save')}
        </Button>
      </div>
    </form>
  )
}
