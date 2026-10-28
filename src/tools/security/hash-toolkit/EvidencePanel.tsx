import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DownloadIcon, FileJsonIcon, ShieldCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { checkExtension } from '@/core/engines/hash/signature'
import {
  buildEvidenceReport,
  toCsv,
  verifyEvidenceSeal,
  type EvidenceItem,
} from '@/core/engines/hash/report'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

import { EntropyMiniBar } from './ForensicsViz'
import type { HashQueueItem } from './types'

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function EvidencePanel({ items }: { items: HashQueueItem[] }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [caseRef, setCaseRef] = useState('')
  const [examiner, setExaminer] = useState('')
  const [note, setNote] = useState('')
  const [sealOk, setSealOk] = useState<boolean | null>(null)
  const done = items.filter((item) => item.status === 'done' && item.result)

  const toItems = (): EvidenceItem[] =>
    done.map((item) => ({
      path: item.path,
      size: item.file.size,
      reportedType: item.file.type,
      lastModified: item.file.lastModified,
      hashedAt: item.hashedAt ?? new Date().toISOString(),
      digests: item.result!.digests,
      detectedType: item.result!.signature?.label ?? null,
      extension: item.result!.signature
        ? checkExtension(item.path, item.result!.signature)
        : 'unknown',
      entropy: item.result!.entropy,
    }))

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-2 rounded-2xl border bg-background/80 p-3 @md:grid-cols-2"
      >
        <div>
          <label className="text-[11px] font-medium" htmlFor="case-ref">
            {t('hashToolkit.evidence.case')}
          </label>
          <Input
            id="case-ref"
            value={caseRef}
            onChange={(e) => setCaseRef(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium" htmlFor="examiner">
            {t('hashToolkit.evidence.examiner')}
          </label>
          <Input
            id="examiner"
            value={examiner}
            onChange={(e) => setExaminer(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="col-span-full">
          <label className="text-[11px] font-medium" htmlFor="evidence-note">
            {t('hashToolkit.evidence.note')}
          </label>
          <Textarea
            id="evidence-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 min-h-16 text-xs"
          />
        </div>
      </motion.div>

      <p className="text-[11px] text-muted-foreground">
        {t('hashToolkit.evidence.hint', { count: done.length })}
      </p>

      {done.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-x-auto rounded-xl border bg-card/80"
        >
          <p className="border-b px-3 py-2 text-[11px] font-medium">{t('hashToolkit.evidence.preview')}</p>
          <table className="w-full min-w-[28rem] text-left text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-1.5 font-medium">{t('hashToolkit.evidence.colFile')}</th>
                <th className="px-3 py-1.5 font-medium tabular-nums">{t('hashToolkit.evidence.colSize')}</th>
                <th className="px-3 py-1.5 font-medium">{t('hashToolkit.evidence.colEntropy')}</th>
                <th className="hidden px-3 py-1.5 font-medium font-mono @md:table-cell">
                  {t('hashToolkit.evidence.colSha256')}
                </th>
              </tr>
            </thead>
            <tbody>
              {done.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : index * 0.04 }}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="max-w-[12rem] truncate px-3 py-2" title={item.path}>
                    {item.file.name}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{item.file.size.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-[6rem] flex-col gap-0.5">
                      <EntropyMiniBar entropy={item.result!.entropy} />
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {item.result!.entropy.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 font-mono text-[10px] @md:table-cell">
                    <span className={cn('break-all', item.baseline === 'modified' && 'text-red-600')}>
                      {item.result!.digests['SHA-256']?.slice(0, 16)}…
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={done.length === 0}
          onClick={() => {
            void (async () => {
              const stamp = Date.now()
              const report = await buildEvidenceReport(toItems(), {
                caseReference: caseRef,
                examiner,
                note,
              })
              setSealOk(await verifyEvidenceSeal(report))
              download(
                `hash-evidence-${stamp}.json`,
                'application/json',
                `${JSON.stringify(report, null, 2)}\n`,
              )
            })()
          }}
        >
          <FileJsonIcon className="size-3.5" />
          {t('hashToolkit.evidence.exportJson')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={done.length === 0}
          onClick={() => {
            const stamp = Date.now()
            download(`hash-evidence-${stamp}.csv`, 'text/csv', toCsv(toItems()))
          }}
        >
          <DownloadIcon className="size-3.5" />
          {t('hashToolkit.evidence.exportCsv')}
        </Button>
      </div>

      {sealOk != null && (
        <p
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
            sealOk ? 'border-emerald-500/40 text-emerald-700' : 'border-red-500/40 text-red-700'
          }`}
        >
          <ShieldCheckIcon className="size-3.5" aria-hidden />
          {sealOk ? t('hashToolkit.evidence.sealOk') : t('hashToolkit.evidence.sealBad')}
        </p>
      )}
    </div>
  )
}
