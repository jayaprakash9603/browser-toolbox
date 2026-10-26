import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { LayoutGroup, Reorder, motion, useDragControls } from 'motion/react'
import { GripVerticalIcon, ListOrderedIcon, ZapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FORMAT_LABELS, IMAGE_SAVE_FORMATS, type ImageSaveFormat, type SaveImageAsState } from '@/core/imageConvert'
import { PanelSection } from '@/shared/components/toolkit'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { FormatBadge } from './parts'

interface FormatListProps {
  state: SaveImageAsState
  onToggle: (format: ImageSaveFormat, on: boolean) => void
  onReorder: (formats: ImageSaveFormat[]) => void
  onQuick: (format: ImageSaveFormat | null) => void
}

export function FormatList({ state, onToggle, onReorder, onQuick }: FormatListProps) {
  const { t } = useTranslation()
  const [order, setOrder] = useState(state.formats)
  const [synced, setSynced] = useState(state.formats)
  if (synced !== state.formats) {
    setSynced(state.formats)
    setOrder(state.formats)
  }
  const disabled = IMAGE_SAVE_FORMATS.filter((f) => !order.includes(f))

  const moveBy = (format: ImageSaveFormat, step: number) => {
    const from = order.indexOf(format)
    const to = from + step
    if (from < 0 || to < 0 || to >= order.length) return
    const next = [...order]
    ;[next[from], next[to]] = [next[to], next[from]]
    setOrder(next)
    onReorder(next)
  }

  return (
    <PanelSection
      title={t('sia.formats.title')}
      icon={<ListOrderedIcon />}
      actions={<span className="text-[11px] tabular-nums text-muted-foreground">{t('sia.formats.count', { count: order.length, total: IMAGE_SAVE_FORMATS.length })}</span>}
    >
      <p className="-mt-1 text-[11px] leading-4 text-muted-foreground">{t('sia.formats.hint')}</p>
      <LayoutGroup>
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="flex flex-col gap-1.5">
          {order.map((format, index) => (
            <DraggableRow
              key={format}
              format={format}
              onDragEnd={() => onReorder(order)}
              onMove={(step) => moveBy(format, step)}
              position={{ index, total: order.length }}
            >
              <RowBody
                format={format}
                on
                quick={state.quickFormat === format}
                lastOn={order.length === 1}
                onToggle={onToggle}
                onQuick={onQuick}
              />
            </DraggableRow>
          ))}
        </Reorder.Group>
        {disabled.length > 0 && (
          <motion.ul layout className="flex flex-col gap-1.5">
            {disabled.map((format) => (
              <motion.li
                key={format}
                layoutId={`sia-format-${format}`}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/20 py-1.5 pl-1.5 pr-2.5"
              >
                <span className="w-6 shrink-0" aria-hidden />
                <RowBody format={format} on={false} quick={false} lastOn={false} onToggle={onToggle} onQuick={onQuick} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </LayoutGroup>
    </PanelSection>
  )
}

function DraggableRow({
  format,
  children,
  onDragEnd,
  onMove,
  position,
}: {
  format: ImageSaveFormat
  children: ReactNode
  onDragEnd: () => void
  onMove: (step: number) => void
  position: { index: number; total: number }
}) {
  const { t } = useTranslation()
  const controls = useDragControls()
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    onMove(event.key === 'ArrowUp' ? -1 : 1)
  }
  return (
    <Reorder.Item
      value={format}
      layoutId={`sia-format-${format}`}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 28px -12px rgb(0 0 0 / 0.35)', zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className="relative flex items-center gap-2 rounded-xl border bg-card py-1.5 pl-1.5 pr-2.5 shadow-xs"
    >
      <button
        type="button"
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={onKeyDown}
        aria-label={t('sia.formats.reorder', { format: FORMAT_LABELS[format], position: position.index + 1, total: position.total })}
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-3.5" aria-hidden />
      </button>
      {children}
    </Reorder.Item>
  )
}

function RowBody({
  format,
  on,
  quick,
  lastOn,
  onToggle,
  onQuick,
}: {
  format: ImageSaveFormat
  on: boolean
  quick: boolean
  lastOn: boolean
  onToggle: (format: ImageSaveFormat, on: boolean) => void
  onQuick: (format: ImageSaveFormat | null) => void
}) {
  const { t } = useTranslation()
  const label = FORMAT_LABELS[format]
  return (
    <>
      <FormatBadge format={format} className={cn(!on && 'opacity-60')} />
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-1.5 text-xs font-semibold', !on && 'text-muted-foreground')}>
          {label}
          {quick && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
            >
              <ZapIcon className="size-2.5" aria-hidden />
              {t('sia.formats.oneClick')}
            </motion.span>
          )}
        </p>
        <p className="truncate text-[11px] leading-4 text-muted-foreground">{t(`sia.formats.desc.${format}`)}</p>
      </div>
      {on && (
        <button
          type="button"
          aria-pressed={quick}
          onClick={() => onQuick(quick ? null : format)}
          aria-label={t(quick ? 'sia.formats.quickOff' : 'sia.formats.quickOn', { format: label })}
          title={t(quick ? 'sia.formats.quickOff' : 'sia.formats.quickOn', { format: label })}
          className={cn(
            'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-90',
            quick ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'text-muted-foreground/60 hover:bg-accent hover:text-foreground',
          )}
        >
          <motion.span
            className="flex"
            animate={quick ? { rotate: [0, -14, 10, 0], scale: [1, 1.25, 1] } : { rotate: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ZapIcon className={cn('size-3.5', quick && 'fill-current')} aria-hidden />
          </motion.span>
        </button>
      )}
      <Switch
        checked={on}
        disabled={lastOn}
        onCheckedChange={(next) => onToggle(format, next)}
        aria-label={t('sia.formats.toggle', { format: label })}
        title={lastOn ? t('sia.formats.lastOne') : undefined}
      />
    </>
  )
}
