import { useEffect, useState } from 'react'
import { AnimatePresence, Reorder, motion, useReducedMotion } from 'motion/react'
import {
  BookmarkCheckIcon,
  BookmarkPlusIcon,
  LockIcon,
  PlusIcon,
  Redo2Icon,
  ShuffleIcon,
  Trash2Icon,
  Undo2Icon,
  UnlockIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { EASE_OUT, useColorLabels } from './labels'
import { MAX_COLORS, MIN_COLORS, textOn, type Swatch } from './paletteModel'

interface PaletteStageProps {
  swatches: Swatch[]
  selectedId: string
  /** Increments on every regenerate so unlocked columns replay their shimmer. */
  generation: number
  canUndo: boolean
  canRedo: boolean
  onSelect: (id: string) => void
  onToggleLock: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (swatches: Swatch[]) => void
  onReorderEnd: () => void
  onGenerate: () => void
  onUndo: () => void
  onRedo: () => void
  onAdd: () => void
  onSave: () => void
}

export function PaletteStage(props: PaletteStageProps) {
  const { swatches, generation, onGenerate, onUndo, onRedo, onAdd, onSave, canUndo, canRedo } = props
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [savedFlash, setSavedFlash] = useState(false)
  const hexes = swatches.map((s) => s.hex)

  useEffect(() => {
    if (!savedFlash) return
    const timer = setTimeout(() => setSavedFlash(false), 1600)
    return () => clearTimeout(timer)
  }, [savedFlash])

  return (
    <section aria-label={t('pg.stage.label')} className="relative isolate overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 opacity-40 blur-2xl dark:opacity-30">
        {hexes.slice(0, 3).map((hex, index) => (
          <motion.span
            key={index}
            className="absolute bottom-0 size-28 rounded-full"
            style={{ left: `${8 + index * 32}%` }}
            initial={false}
            animate={{
              backgroundColor: hex,
              x: reduce ? 0 : [0, 24, -12, 0],
              y: reduce ? 0 : [0, -14, 6, 0],
            }}
            transition={{
              backgroundColor: { duration: 0.6, ease: EASE_OUT },
              x: { duration: 9 + index * 2, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 7 + index * 2, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        ))}
      </div>

      <Reorder.Group
        as="div"
        axis="x"
        values={swatches}
        onReorder={props.onReorder}
        className="flex h-48 gap-1 p-1.5 @[520px]:h-56"
      >
        {swatches.map((swatch, index) => (
          <SwatchColumn key={swatch.id} {...props} swatch={swatch} index={index} />
        ))}
      </Reorder.Group>

      <div className="flex flex-wrap items-center gap-1.5 border-t bg-background/40 px-2 py-2 backdrop-blur-sm">
        <Button size="sm" onClick={onGenerate} className="gap-2">
          <motion.span
            aria-hidden
            className="flex"
            animate={{ rotate: generation * 180 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <ShuffleIcon />
          </motion.span>
          {t('pg.generate')}
          <kbd className="hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] leading-4 opacity-80 @[400px]:inline">
            {t('pg.spaceKey')}
          </kbd>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onUndo} disabled={!canUndo} aria-label={t('pg.undo')} title={t('pg.undo')}>
          <Undo2Icon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRedo} disabled={!canRedo} aria-label={t('pg.redo')} title={t('pg.redo')}>
          <Redo2Icon />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onAdd}
            disabled={swatches.length >= MAX_COLORS}
            aria-label={t('pg.addColor')}
            title={t('pg.addColor')}
          >
            <PlusIcon />
          </Button>
          <CopyButton text={hexes.join(', ')} size="icon-sm" label={t('pg.copyAll')} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSave()
              setSavedFlash(true)
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={savedFlash ? 'saved' : 'save'}
                className="flex"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.16 }}
                aria-hidden
              >
                {savedFlash ? <BookmarkCheckIcon className="text-emerald-600 dark:text-emerald-400" /> : <BookmarkPlusIcon />}
              </motion.span>
            </AnimatePresence>
            {savedFlash ? t('pg.saved') : t('pg.save')}
          </Button>
        </div>
      </div>
      <span role="status" className="sr-only">
        {savedFlash ? t('pg.savedAnnounce') : ''}
      </span>
    </section>
  )
}

function SwatchColumn({
  swatch,
  index,
  generation,
  swatches,
  selectedId,
  onSelect,
  onToggleLock,
  onRemove,
  onReorderEnd,
}: PaletteStageProps & { swatch: Swatch; index: number }) {
  const { t } = useTranslation()
  const labels = useColorLabels()
  const selected = swatch.id === selectedId
  const text = textOn(swatch.hex).hex
  const role = labels.role(index)
  const name = labels.name(swatch.hex)
  const canRemove = swatches.length > MIN_COLORS && !swatch.locked

  return (
    <Reorder.Item
      as="div"
      value={swatch}
      onDragEnd={onReorderEnd}
      initial={false}
      animate={{ backgroundColor: swatch.hex }}
      whileDrag={{ scale: 1.04, zIndex: 20, boxShadow: '0 14px 32px -8px rgb(0 0 0 / 0.45)' }}
      transition={{ duration: 0.5, ease: EASE_OUT, layout: { type: 'spring', stiffness: 380, damping: 32 } }}
      className={cn(
        'group/sw relative min-w-0 cursor-grab overflow-hidden rounded-xl active:cursor-grabbing',
        selected ? 'flex-[2.6]' : 'flex-1',
      )}
      style={{ color: text }}
    >
      <button
        type="button"
        onClick={() => onSelect(swatch.id)}
        aria-pressed={selected}
        aria-label={t('pg.stage.select', { role, name, hex: swatch.hex })}
        className="absolute inset-0 z-0 cursor-[inherit] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-inset"
      />

      {!swatch.locked && (
        <motion.span
          key={generation}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: '0%' }}
          animate={{ x: '420%' }}
          transition={{ duration: 0.85, delay: index * 0.06, ease: EASE_OUT }}
        />
      )}

      {selected && (
        <motion.span
          layoutId="pg-selected-ring"
          aria-hidden
          className="pointer-events-none absolute inset-1 rounded-lg ring-2 ring-current/70"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}

      <div className="pointer-events-none relative flex h-full flex-col p-2">
        <div className="flex items-start justify-between gap-1">
          <span
            className={cn(
              'truncate text-[10px] font-semibold tracking-wide uppercase opacity-75',
              selected ? 'block' : 'hidden @[600px]:block',
            )}
          >
            {role}
          </span>
          <button
            type="button"
            onClick={() => onToggleLock(swatch.id)}
            aria-pressed={swatch.locked}
            aria-label={swatch.locked ? t('pg.unlock', { role }) : t('pg.lock', { role })}
            title={swatch.locked ? t('pg.unlock', { role }) : t('pg.lock', { role })}
            className={cn(
              'pointer-events-auto ml-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none transition-[opacity,background-color] duration-150 hover:bg-current/15 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current',
              swatch.locked || selected ? 'opacity-100' : 'opacity-0 group-hover/sw:opacity-100',
              swatch.locked && 'bg-current/15',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={swatch.locked ? 'locked' : 'open'}
                className="flex"
                initial={{ rotate: -40, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 40, scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                aria-hidden
              >
                {swatch.locked ? <LockIcon className="size-3.5" /> : <UnlockIcon className="size-3.5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <div className="mt-auto min-w-0">
          {selected ? (
            <motion.div layout="position" className="flex flex-col gap-0.5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={swatch.hex}
                  className="block truncate font-mono text-base leading-tight font-bold tracking-tight uppercase @[520px]:text-lg"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                >
                  {swatch.hex.slice(1)}
                </motion.span>
              </AnimatePresence>
              <span className="truncate text-[11px] font-medium opacity-80">{name}</span>
              <div className="pointer-events-auto mt-1 flex items-center gap-0.5 [&_button]:text-current [&_button:hover]:bg-current/15">
                <CopyButton text={swatch.hex} label={t('pg.copyHex', { hex: swatch.hex })} />
                <button
                  type="button"
                  onClick={() => onRemove(swatch.id)}
                  disabled={!canRemove}
                  aria-label={t('pg.removeColor', { role })}
                  title={t('pg.removeColor', { role })}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-current disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                </button>
              </div>
            </motion.div>
          ) : (
            <span className="mx-auto block w-fit font-mono text-[11px] font-semibold tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 opacity-90">
              {swatch.hex.slice(1)}
            </span>
          )}
        </div>
      </div>
    </Reorder.Item>
  )
}
