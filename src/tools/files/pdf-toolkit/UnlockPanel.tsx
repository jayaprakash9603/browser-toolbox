import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { LoaderCircleIcon, LockKeyholeOpenIcon, ShieldCheckIcon } from 'lucide-react'

import { isPdfEncrypted, unlockPdf } from '@/core/engines/pdf/edit'
import { PanelError } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

/** Saves a copy without the open password and without permission restrictions. */
export function UnlockPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [encrypted, setEncrypted] = useState<boolean | null>(doc.password !== undefined ? true : null)
  const { busy, error, run } = useTask()

  useEffect(() => {
    let cancelled = false
    isPdfEncrypted(doc.bytes).then(
      (value) => !cancelled && setEncrypted(value || doc.password !== undefined),
      () => !cancelled && setEncrypted(false),
    )
    return () => {
      cancelled = true
    }
  }, [doc.bytes, doc.password])

  const unlock = () =>
    run(async () => {
      const bytes = await unlockPdf(sourceOf(doc))
      showResults({ artifacts: [pdfArtifact(`${stemOf(doc)}-unlocked.pdf`, bytes, { source: { name: doc.name, size: doc.bytes.length }, note: t('pdf.protect.unlockedNote') })] })
    })

  const locked = encrypted === true
  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-2xl border px-4 py-8 text-center',
          locked ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-emerald-500/30 bg-emerald-500/[0.05]',
        )}
      >
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl',
            locked ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          )}
          aria-hidden
        >
          {locked ? <LockKeyholeOpenIcon className="size-7" /> : <ShieldCheckIcon className="size-7" />}
        </span>
        <div className="flex max-w-md flex-col gap-1">
          <p className="text-sm font-semibold">{encrypted === null ? t('pdf.unlock.checking') : locked ? t('pdf.unlock.lockedTitle') : t('pdf.unlock.openTitle')}</p>
          <p className="text-xs text-muted-foreground">{locked ? t('pdf.unlock.lockedText') : t('pdf.unlock.openText')}</p>
        </div>
        <Button onClick={() => void unlock()} disabled={busy || encrypted === null} variant={locked ? 'default' : 'outline'} className="min-w-44">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <LockKeyholeOpenIcon aria-hidden />}
          {locked ? t('pdf.unlock.run') : t('pdf.unlock.runAnyway')}
        </Button>
      </motion.div>
      {error && <PanelError message={error} />}
    </div>
  )
}
