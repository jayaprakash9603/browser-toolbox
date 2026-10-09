import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { ENTRANCE } from '@/shared/components/motion/motionConfig'

interface ScaleInProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: ENTRANCE.duration * 0.85, ease: ENTRANCE.ease, delay }}
    >
      {children}
    </motion.div>
  )
}
