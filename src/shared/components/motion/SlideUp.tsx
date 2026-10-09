import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { ENTRANCE } from '@/shared/components/motion/motionConfig'

interface SlideUpProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function SlideUp({ children, className, delay = 0 }: SlideUpProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: ENTRANCE.y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ENTRANCE.duration, ease: ENTRANCE.ease, delay }}
    >
      {children}
    </motion.div>
  )
}
