import { AnimatePresence, motion } from 'motion/react'
import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'

const EASE = [0.22, 1, 0.36, 1] as const

interface CalcDisplayProps {
  expr: string
  preview: { ok: true; value: string } | { ok: false; error: string } | null
  memoryActive: boolean
}

export function CalcDisplay({ expr, preview, memoryActive }: CalcDisplayProps) {
  const { t } = useTranslation()
  const showExpr = expr.trim() || t('calcTool.display.empty')
  const copyText = preview?.ok ? preview.value : expr.trim() || '0'

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 100% 0%, color-mix(in oklab, var(--color-primary) 28%, transparent), transparent 55%),
            radial-gradient(ellipse 70% 50% at 0% 100%, color-mix(in oklab, var(--color-chart-4, var(--color-primary)) 22%, transparent), transparent 50%),
            linear-gradient(165deg, color-mix(in oklab, var(--color-muted) 40%, transparent), transparent 45%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[24px_24px] mask-[linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div className="relative flex flex-col gap-2 p-3 @[400px]:p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <SparklesIcon className="size-3 text-primary" aria-hidden />
            {t('calcTool.display.degrees')}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-medium transition-opacity',
              memoryActive ? 'bg-primary/15 text-primary opacity-100' : 'opacity-0',
            )}
            aria-hidden={!memoryActive}
          >
            {t('calcTool.memorySet')}
          </span>
        </div>
        <div className="min-h-[4.5rem] rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 shadow-inner backdrop-blur-sm dark:bg-black/35">
          <p className="truncate text-right font-mono text-xs leading-5 text-muted-foreground" aria-label={t('calcTool.display.expr')}>
            {showExpr}
          </p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={preview?.ok ? preview.value : preview?.ok === false ? preview.error : 'idle'}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: EASE }}
              className={cn(
                'mt-1 truncate text-right font-mono text-3xl font-semibold tabular-nums tracking-tight @[400px]:text-4xl',
                preview && !preview.ok && 'text-destructive text-lg @[400px]:text-xl',
                preview?.ok && 'text-foreground',
                !preview && 'text-muted-foreground/50',
              )}
              aria-live="polite"
              aria-label={t('calcTool.display.preview')}
            >
              {preview?.ok ? preview.value : preview?.ok === false ? preview.error : '—'}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex justify-end">
          <CopyButton text={copyText} label={t('calcTool.copy')} />
        </div>
      </div>
    </div>
  )
}
