import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { cn } from '@/shared/utils/cn'
import { SEVERITIES, type Severity } from './report'
import { SEVERITY_TONE } from './tones'

export function SeverityPicker({
  value,
  onChange,
  labelId,
}: {
  value: Severity
  onChange: (value: Severity) => void
  labelId: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const groupId = useId()
  const hintId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (from: number, step: number) => {
    const index = (from + step + SEVERITIES.length) % SEVERITIES.length
    onChange(SEVERITIES[index])
    refs.current[index]?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1 @[400px]:grid-cols-5"
      >
        {SEVERITIES.map((severity, index) => {
          const selected = severity === value
          const tone = SEVERITY_TONE[severity]
          const label = t(`bugReporter.severity.${severity}`)
          return (
            <button
              key={severity}
              ref={(node) => {
                refs.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              title={label}
              onClick={() => onChange(severity)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  move(index, 1)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  move(index, -1)
                }
              }}
              className={cn(
                'relative flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
                selected ? tone.text : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`severity-${groupId}`}
                  aria-hidden
                  className={cn('absolute inset-0 rounded-md border bg-background shadow-sm', tone.border)}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
                />
              )}
              <span className="relative flex size-2 shrink-0" aria-hidden>
                {selected && !reduce && (
                  <motion.span
                    className={cn('absolute inset-0 rounded-full', tone.dot)}
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )}
                <span className={cn('relative size-2 rounded-full', tone.dot)} />
              </span>
              <span className="relative truncate">{label}</span>
            </button>
          )
        })}
      </div>
      <div id={hintId} className="relative min-h-4 text-[11px] leading-4 text-muted-foreground">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={value}
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
            transition={{ duration: 0.14 }}
          >
            {t(`bugReporter.severityHint.${value}`)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
