import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import type { TaskPriority } from '@/core/tasks/model'
import { cn } from '@/shared/utils/cn'

import { PRIORITY_STYLES } from './taskStyles'

const CHECK_PATH = 'M6 12.5l4 4L18 8.5'
const PARTICLES = 8

interface TaskCheckboxProps {
  checked: boolean
  priority: TaskPriority
  label: string
  onToggle: () => void
  size?: 'md' | 'sm'
  className?: string
}

export function TaskCheckbox({ checked, priority, label, onToggle, size = 'md', className }: TaskCheckboxProps) {
  const reduce = useReducedMotion()
  const style = PRIORITY_STYLES[priority]
  const [burst, setBurst] = useState(0)

  const box = size === 'md' ? 'size-[18px]' : 'size-[15px]'

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        if (!checked && !reduce) setBurst((n) => n + 1)
        onToggle()
      }}
      className={cn(
        'group/check relative flex shrink-0 cursor-pointer items-center justify-center rounded-full outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        size === 'md' ? 'size-6' : 'size-5',
        className,
      )}
    >
      <motion.span
        aria-hidden
        className={cn(
          'relative flex items-center justify-center rounded-full border-2 transition-colors duration-150',
          box,
          style.ring,
          checked ? style.fill : style.soft,
        )}
        animate={reduce ? undefined : { scale: checked ? [1, 0.82, 1.12, 1] : 1 }}
        transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
        whileTap={reduce ? undefined : { scale: 0.86 }}
      >
        <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" fill="none">
          {!checked && (
            <path
              d={CHECK_PATH}
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn('opacity-0 transition-opacity duration-150 group-hover/check:opacity-60', style.text)}
            />
          )}
          <motion.path
            d={CHECK_PATH}
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-background"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.26, ease: [0.2, 0.8, 0.2, 1], delay: checked ? 0.06 : 0 }}
          />
        </svg>
      </motion.span>

      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            aria-hidden
            className={cn('pointer-events-none absolute inset-0', style.text, priority === 4 && 'text-primary')}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => setBurst(0)}
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-current"
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            />
            {Array.from({ length: PARTICLES }, (_, i) => {
              const angle = (i / PARTICLES) * Math.PI * 2
              return (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 size-1 -translate-1/2 rounded-full bg-current"
                  initial={{ x: 0, y: 0, scale: 1 }}
                  animate={{ x: Math.cos(angle) * 15, y: Math.sin(angle) * 15, scale: 0.3 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                />
              )
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
