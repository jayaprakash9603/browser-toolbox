import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { ENTRANCE } from '@/shared/components/motion/motionConfig'

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ENTRANCE.duration, ease: ENTRANCE.ease, delay }}
    >
      {children}
    </motion.div>
  )
}
