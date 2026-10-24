import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { LoaderCircleIcon, RotateCcwIcon, RotateCwIcon, Undo2Icon } from 'lucide-react'

import { rotatePages } from '@/core/engines/pdf/edit'
import { ActionBar, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { PageThumb } from './common'
import { THUMB_GRID } from './modes'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

const wrap = (turn: number) => ((turn % 4) + 4) % 4

/** Turn single pages, odd or even pages, or all of them; rotation is saved in place. */
export function RotatePanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [turns, setTurns] = useState<number[]>(() => doc.pages.map(() => 0))
  const { busy, error, run } = useTask()
  const changed = turns.filter((turn) => wrap(turn) !== 0).length

  const turnPage = (index: number, delta: number) => setTurns((current) => current.map((turn, page) => (page === index ? turn + delta : turn)))
  const turnWhere = (pick: (index: number) => boolean, delta: number) => setTurns((current) => current.map((turn, page) => (pick(page) ? turn + delta : turn)))

  const apply = () =>
    run(async () => {
      const map = Object.fromEntries(turns.map((turn, index) => [index, wrap(turn)]).filter(([, turn]) => turn))
      const bytes = await rotatePages(sourceOf(doc), map)
      showResults({ artifacts: [pdfArtifact(`${stemOf(doc)}-rotated.pdf`, bytes, { source: { name: doc.name, size: doc.bytes.length } })] })
    })

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={t('pdf.rotate.title')}
        icon={<RotateCwIcon />}
        actions={
          <Button variant="ghost" size="xs" onClick={() => setTurns(doc.pages.map(() => 0))} disabled={!changed}>
            <Undo2Icon aria-hidden />
            {t('pdf.rotate.reset')}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">{t('pdf.rotate.allLabel')}</span>
          <Button variant="outline" size="xs" onClick={() => turnWhere(() => true, -1)}>
            <RotateCcwIcon aria-hidden />
            {t('pdf.rotate.left')}
          </Button>
          <Button variant="outline" size="xs" onClick={() => turnWhere(() => true, 1)}>
            <RotateCwIcon aria-hidden />
            {t('pdf.rotate.right')}
          </Button>
          {total > 1 && (
            <>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              <Button variant="outline" size="xs" onClick={() => turnWhere((index) => index % 2 === 0, 1)}>
                {t('pdf.rotate.odd')}
              </Button>
              <Button variant="outline" size="xs" onClick={() => turnWhere((index) => index % 2 === 1, 1)}>
                {t('pdf.rotate.even')}
              </Button>
            </>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{t('pdf.rotate.hint')}</p>
        <ol className={THUMB_GRID}>
          {doc.pages.map((info, index) => {
            const turn = wrap(turns[index])
            return (
              <li key={index} className={cn('group flex flex-col gap-1.5 rounded-xl border bg-card p-1.5 transition-colors', turn && 'border-primary/50 bg-primary/[0.03]')}>
                <button
                  type="button"
                  onClick={() => turnPage(index, 1)}
                  aria-label={t('pdf.rotate.page', { page: index + 1 })}
                  className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PageThumb handle={doc.handle} index={index} info={info} turn={turn} label={t('fileui.page', { index: index + 1, total })}>
                    {turn !== 0 && (
                      <motion.span
                        key={turn}
                        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-1 right-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums shadow-xs"
                      >
                        {turn * 90}°
                      </motion.span>
                    )}
                  </PageThumb>
                </button>
                <div className="flex justify-center gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => turnPage(index, -1)} aria-label={t('pdf.rotate.pageLeft', { page: index + 1 })}>
                    <RotateCcwIcon />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => turnPage(index, 1)} aria-label={t('pdf.rotate.pageRight', { page: index + 1 })}>
                    <RotateCwIcon />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      </PanelSection>
      {error && <PanelError message={error} />}
      <ActionBar>
        <Button onClick={() => void apply()} disabled={busy || !changed} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <RotateCwIcon aria-hidden />}
          {t('pdf.rotate.run', { count: changed })}
        </Button>
      </ActionBar>
    </div>
  )
}
