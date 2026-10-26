import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

import type { ConfettiBurst } from './effects'
import type { Progress } from './logic'

const RADIUS = 17
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ProgressRing({ progress }: { progress: Progress }) {
  const { t } = useTranslation()
  const ratio = progress.total ? progress.done / progress.total : 0
  const complete = progress.total > 0 && progress.done === progress.total
  return (
    <div
      className="relative size-11 shrink-0"
      role="img"
      aria-label={t('tasks.progress', { done: progress.done, total: progress.total })}
      title={t('tasks.progress', { done: progress.done, total: progress.total })}
    >
      <svg viewBox="0 0 44 44" className="size-full -rotate-90">
        <circle cx="22" cy="22" r={RADIUS} fill="none" strokeWidth="4" className="stroke-muted" />
        <motion.circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className={cn('transition-colors duration-300', complete ? 'stroke-emerald-500' : 'stroke-primary')}
          initial={false}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - ratio) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          {complete ? (
            <motion.span
              key="done"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 16 }}
              className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white"
            >
              <CheckIcon className="size-3.5" strokeWidth={3} />
            </motion.span>
          ) : (
            <motion.span
              key={`${progress.done}/${progress.total}`}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-[10.5px] font-semibold tabular-nums"
            >
              {progress.done}/{progress.total}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  )
}

function Confetti({ burst }: { burst: ConfettiBurst }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 right-5 z-20">
      {burst.pieces.map((piece, index) => (
        <motion.span
          key={index}
          className={cn('absolute block', piece.color, piece.round ? 'size-1.5 rounded-full' : 'h-2.5 w-1 rounded-[1px]')}
          style={{ backgroundColor: 'currentColor' }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{
            x: piece.x,
            y: [0, piece.y - 18, piece.y + 46],
            opacity: [1, 1, 0],
            rotate: piece.rotate,
            scale: 1,
          }}
          transition={{ duration: 1.25, delay: piece.delay, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </span>
  )
}

interface ViewHeaderProps {
  title: string
  subtitle: string
  icon?: ReactNode
  progress: Progress | null
  confetti: ConfettiBurst | null
  actions?: ReactNode
}

export function ViewHeader({ title, subtitle, icon, progress, confetti, actions }: ViewHeaderProps) {
  return (
    <div className="relative flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          >
            <h2 className="flex items-center gap-2 text-xl leading-7 font-semibold tracking-tight">
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      {actions}
      {progress && progress.total > 0 && <ProgressRing progress={progress} />}
      <AnimatePresence>{confetti && <Confetti key={confetti.id} burst={confetti} />}</AnimatePresence>
    </div>
  )
}
