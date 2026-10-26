import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ChevronRightIcon, DownloadIcon, ZapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FORMAT_LABELS, type SaveImageAsState } from '@/core/imageConvert'
import { cn } from '@/shared/utils/cn'

import { EASE_OUT, FORMAT_DOT } from './formatMeta'

const ROW = 24
const PAD = 4
const SEPARATOR = 9

/** Decorative replica of the right-click menu, driven by the live settings. */
export function MenuPreview({ state }: { state: SaveImageAsState }) {
  const { t } = useTranslation()
  const quick = state.quickFormat && state.formats.includes(state.quickFormat) ? state.quickFormat : null
  const saveAs = t('sia.menu.saveAs')
  const flyoutY = PAD + ROW * 2 + SEPARATOR + (quick ? ROW : 0) - PAD

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[19rem] select-none">
      <LayoutGroup>
        <div
          className={cn(
            'flex items-start transition-[opacity,filter,min-height] duration-300',
            !state.enabled && 'opacity-40 grayscale',
          )}
          style={{ minHeight: flyoutY + state.formats.length * ROW + PAD * 2 + 2 }}
        >
          <motion.div layout className="min-w-0 flex-1 rounded-lg border bg-popover p-1 text-[11px] shadow-lg">
            {[t('sia.menu.openImage'), t('sia.menu.copyImage')].map((label) => (
              <div key={label} className="flex h-6 items-center truncate rounded px-2 text-muted-foreground">
                {label}
              </div>
            ))}
            <div className="mx-1 my-1 h-px bg-border" />
            <AnimatePresence initial={false}>
              {quick && (
                <motion.div
                  key="quick"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: ROW }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  className="flex items-center gap-1.5 overflow-hidden rounded px-2 font-medium"
                >
                  <ZapIcon className="size-3 shrink-0 text-amber-500" />
                  <span className="truncate">
                    {saveAs} {FORMAT_LABELS[quick]}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div layout className="flex h-6 items-center gap-1.5 rounded bg-primary px-2 font-medium text-primary-foreground">
              <DownloadIcon className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{saveAs}</span>
              <ChevronRightIcon className="size-3 shrink-0" />
            </motion.div>
          </motion.div>

          <motion.div
            className="-ml-1 w-[5.5rem] shrink-0 rounded-lg border bg-popover p-1 text-[11px] shadow-xl"
            animate={{ y: flyoutY }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <AnimatePresence initial={false}>
              {state.formats.map((format) => (
                <motion.div
                  key={format}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: ROW }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  className="flex items-center gap-1.5 overflow-hidden rounded px-2"
                >
                  <span className={cn('size-1.5 shrink-0 rounded-full', FORMAT_DOT[format])} />
                  <span className="min-w-0 flex-1 truncate">{FORMAT_LABELS[format]}</span>
                  {format === quick && <ZapIcon className="size-2.5 shrink-0 text-amber-500" />}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </LayoutGroup>
      <AnimatePresence>
        {!state.enabled && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium shadow-md"
          >
            {t('sia.menu.hidden')}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
