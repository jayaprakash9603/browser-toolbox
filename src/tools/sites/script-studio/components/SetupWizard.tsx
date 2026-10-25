import { CheckIcon, ExternalLinkIcon, RefreshCwIcon, ShieldCheckIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import type { UserScriptsProbe } from '../hooks/useScriptStudio'

type Props = {
  probe: UserScriptsProbe | null
  onEnable: () => Promise<unknown> | void
  onOpenSettings: () => void
  onRecheck: () => Promise<unknown> | void
}

type StepState = 'done' | 'current' | 'todo'

function Step({ index, state, title, body, action }: {
  index: number
  state: StepState
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors',
          state === 'done' && 'border-primary bg-primary text-primary-foreground',
          state === 'current' && 'border-primary text-primary',
          state === 'todo' && 'text-muted-foreground',
        )}
        aria-hidden
      >
        {state === 'done' ? <CheckIcon className="size-3.5" /> : index}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', state === 'todo' && 'text-muted-foreground')}>{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
        {state === 'current' && action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </li>
  )
}

export function SetupWizard({ probe, onEnable, onOpenSettings, onRecheck }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [busy, setBusy] = useState(false)

  if (!probe || probe.operational) return null

  const run = async (fn: () => Promise<unknown> | void) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  if (probe.step === 'unsupported') {
    return (
      <div role="status" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        {t('scriptStudio.setup.unsupported')}
      </div>
    )
  }

  const permissionState: StepState = probe.permissionGranted ? 'done' : 'current'
  const toggleState: StepState = probe.permissionGranted ? 'current' : 'todo'

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      aria-labelledby="ss-setup-title"
      className="rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-primary" aria-hidden />
          <h2 id="ss-setup-title" className="text-sm font-semibold">
            {t('scriptStudio.setup.title')}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => void run(onRecheck)}
        >
          <RefreshCwIcon className={cn('size-3.5', busy && 'animate-spin')} aria-hidden />
          {t('scriptStudio.setup.recheck')}
        </Button>
      </div>
      <ol className="flex flex-col gap-3">
        <Step
          index={1}
          state={permissionState}
          title={t('scriptStudio.setup.step1.title')}
          body={t('scriptStudio.setup.step1.body')}
          action={
            <Button size="sm" className="min-h-9" disabled={busy} onClick={() => void run(onEnable)}>
              {t('scriptStudio.setup.enable')}
            </Button>
          }
        />
        <Step
          index={2}
          state={toggleState}
          title={t('scriptStudio.setup.step2.title')}
          body={t('scriptStudio.setup.step2.body')}
          action={
            <Button size="sm" variant="outline" className="min-h-9 gap-1.5" onClick={onOpenSettings}>
              <ExternalLinkIcon className="size-3.5" aria-hidden />
              {t('scriptStudio.setup.openSettings')}
            </Button>
          }
        />
      </ol>
    </motion.section>
  )
}
