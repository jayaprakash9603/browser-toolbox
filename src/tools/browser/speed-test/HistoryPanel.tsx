import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, Trash2Icon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatMbps, type SpeedTestResult } from '@/core/speedtest'
import { SPEED_DOWN, SPEED_UP } from '@/features/speedtest/style'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'

import { EmptyState, Panel } from '../internet-monitor/ui'

function when(at: number): string {
  return new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function HistoryPanel({ history, onClear }: { history: SpeedTestResult[]; onClear: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [confirm, setConfirm] = useState(false)

  return (
    <Panel
      title={t('speedtest.history.title')}
      description={t('speedtest.history.description')}
      actions={
        history.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setConfirm(true)}>
            <Trash2Icon className="size-3.5" aria-hidden />
            {t('speedtest.history.clear')}
          </Button>
        )
      }
    >
      {history.length === 0 ? (
        <EmptyState icon={HistoryIcon}>{t('speedtest.history.empty')}</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-2.5 py-1.5 text-left font-medium">{t('speedtest.history.when')}</th>
                <th className="px-2 py-1.5 text-right font-medium">{t('speedtest.metric.ping')}</th>
                <th className="px-2 py-1.5 text-right font-medium">
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowDownIcon className="size-3" style={{ color: SPEED_DOWN }} aria-hidden />
                    {t('speedtest.metric.download')}
                  </span>
                </th>
                <th className="px-2.5 py-1.5 text-right font-medium">
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowUpIcon className="size-3" style={{ color: SPEED_UP }} aria-hidden />
                    {t('speedtest.metric.upload')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono tabular-nums">
              <AnimatePresence initial={false}>
                {history.map((r) => (
                  <motion.tr
                    key={r.at}
                    initial={reduceMotion ? false : { opacity: 0, backgroundColor: 'color-mix(in srgb, var(--speed-down) 14%, transparent)' }}
                    animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                    transition={{ duration: 0.6 }}
                  >
                    <td className="px-2.5 py-1.5 font-sans text-muted-foreground">{when(r.at)}</td>
                    <td className="px-2 py-1.5 text-right">
                      {r.pingMs === null ? '—' : `${Math.round(r.pingMs)} ${t('speedtest.ms')}`}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold">{formatMbps(r.downloadMbps)}</td>
                    <td className="px-2.5 py-1.5 text-right font-semibold">{formatMbps(r.uploadMbps)}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('speedtest.history.clearTitle')}
        description={t('speedtest.history.clearBody')}
        confirmLabel={t('speedtest.history.clear')}
        destructive
        onConfirm={onClear}
      />
    </Panel>
  )
}
