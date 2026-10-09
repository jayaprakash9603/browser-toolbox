import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
}

export function AnimatedCard({ children, className }: AnimatedCardProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div className={cn('rounded-xl border bg-card shadow-[var(--shadow-card)]', className)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={cn(
        'rounded-xl border bg-card shadow-[var(--shadow-card)] transition-shadow duration-200',
        className,
      )}
      whileHover={{ scale: 1.01, y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.div>
  )
}
