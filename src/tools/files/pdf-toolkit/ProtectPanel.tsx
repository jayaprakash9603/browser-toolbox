import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDownIcon, KeyRoundIcon, LoaderCircleIcon, LockKeyholeIcon, LockKeyholeOpenIcon, ShieldCheckIcon } from 'lucide-react'

import { isPdfEncrypted, protectPdf, unlockPdf } from '@/core/engines/pdf/edit'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { PasswordField } from './DocumentChrome'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

function strengthOf(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  return Math.max(1, score)
}

const STRENGTH_TONES = ['bg-destructive', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'] as const

export function ProtectPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [encrypted, setEncrypted] = useState(doc.password !== undefined)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [owner, setOwner] = useState('')
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(true)
  const [allowEditing, setAllowEditing] = useState(false)
  const { busy, error, run } = useTask()
  const passwordId = useId()
  const confirmId = useId()
  const ownerId = useId()

  useEffect(() => {
    let cancelled = false
    isPdfEncrypted(doc.bytes).then(
      (value) => !cancelled && value && setEncrypted(true),
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [doc.bytes])

  const strength = strengthOf(password)
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length > 0 && password === confirm

  const protect = () =>
    run(async () => {
      const bytes = await protectPdf(sourceOf(doc), { userPassword: password, ownerPassword: owner || undefined, allowPrinting, allowCopying, allowEditing })
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}-protected.pdf`, bytes, {
            source: { name: doc.name, size: doc.bytes.length },
            password,
            note: t('pdf.protect.protectedNote'),
          }),
        ],
      })
    })

  const unlock = () =>
    run(async () => {
      const bytes = await unlockPdf(sourceOf(doc))
      showResults({
        artifacts: [pdfArtifact(`${stemOf(doc)}-unlocked.pdf`, bytes, { source: { name: doc.name, size: doc.bytes.length }, note: t('pdf.protect.unlockedNote') })],
      })
    })

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {encrypted && (
          <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-3 @[480px]:p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300" aria-hidden>
                <LockKeyholeOpenIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t('pdf.protect.removeTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('pdf.protect.removeText')}</p>
              </div>
              <Button variant="outline" onClick={() => void unlock()} disabled={busy}>
                {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <LockKeyholeOpenIcon aria-hidden />}
                {t('pdf.protect.remove')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PanelSection title={encrypted ? t('pdf.protect.changeTitle') : t('pdf.protect.addTitle')} icon={<LockKeyholeIcon />}>
        <div className="grid gap-3 @[560px]:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={passwordId} className="text-[11px] font-medium text-muted-foreground">
              {t('pdf.protect.password')}
            </label>
            <PasswordField id={passwordId} value={password} onChange={setPassword} />
            <div className="mt-1 flex items-center gap-2" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((step) => (
                  <span key={step} className="h-1 overflow-hidden rounded-full bg-muted">
                    <motion.span
                      className={cn('block h-full rounded-full', STRENGTH_TONES[Math.max(0, strength - 1)])}
                      initial={false}
                      animate={{ width: step < strength ? '100%' : '0%' }}
                      transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : step * 0.05 }}
                    />
                  </span>
                ))}
              </div>
              <span className="w-12 text-right text-[10px] text-muted-foreground">{password ? t(`pdf.protect.strength${strength}`) : ''}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={confirmId} className="text-[11px] font-medium text-muted-foreground">
              {t('pdf.protect.confirm')}
            </label>
            <PasswordField id={confirmId} value={confirm} onChange={setConfirm} invalid={mismatch} />
            {mismatch && (
              <span role="alert" className="text-[11px] text-destructive">
                {t('pdf.protect.mismatch')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-muted-foreground">{t('pdf.protect.permissions')}</p>
          <div className="grid gap-2 @[640px]:grid-cols-3">
            <OptionSwitch label={t('pdf.protect.printing')} checked={allowPrinting} onChange={setAllowPrinting} />
            <OptionSwitch label={t('pdf.protect.copying')} checked={allowCopying} onChange={setAllowCopying} />
            <OptionSwitch label={t('pdf.protect.editing')} checked={allowEditing} onChange={setAllowEditing} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
            className="flex cursor-pointer items-center gap-1 self-start rounded-md text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDownIcon className={cn('size-3.5 transition-transform duration-200', advanced && 'rotate-180')} aria-hidden />
            {t('pdf.protect.advanced')}
          </button>
          <AnimatePresence initial={false}>
            {advanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex max-w-md flex-col gap-1 pb-1">
                  <label htmlFor={ownerId} className="text-[11px] font-medium text-muted-foreground">
                    {t('pdf.protect.owner')}
                  </label>
                  <PasswordField id={ownerId} value={owner} onChange={setOwner} />
                  <span className="text-[11px] text-muted-foreground">{t('pdf.protect.ownerHint')}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheckIcon className="mt-px size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {t('pdf.protect.privacy')}
        </p>
      </PanelSection>

      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void protect()} disabled={busy || !ready} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <KeyRoundIcon aria-hidden />}
          {t('pdf.protect.run')}
        </Button>
      </ActionBar>
    </div>
  )
}
