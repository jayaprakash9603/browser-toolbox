import { AnimatePresence, motion } from 'motion/react'
import { HistoryIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { PanelSection } from '@/shared/components/toolkit'
import { cn } from '@/shared/utils/cn'

export interface HistoryEntry {
  id: string
  expr: string
  result: string
}

interface HistoryPanelProps {
  open: boolean
  entries: HistoryEntry[]
  onPick: (entry: HistoryEntry) => void
  onClear: () => void
}

export function HistoryPanel({ open, entries, onPick, onClear }: HistoryPanelProps) {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <PanelSection title={t('calcTool.history')} icon={<HistoryIcon className="size-4" />}>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('calcTool.historyEmpty')}</p>
      ) : (
        <>
          <ul className="scrollbar-styled max-h-48 space-y-1 overflow-y-auto">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <button
                    type="button"
                    onClick={() => onPick(entry)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-background/60 px-2.5 py-2 text-left',
                      'transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{entry.expr}</span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">= {entry.result}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <Button type="button" variant="ghost" size="xs" className="mt-1 w-fit cursor-pointer" onClick={onClear}>
            <Trash2Icon className="size-3.5" aria-hidden />
            {t('calcTool.historyClear')}
          </Button>
        </>
      )}
    </PanelSection>
  )
}
