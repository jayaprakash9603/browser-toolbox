import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { ENTRANCE } from '@/shared/components/motion/motionConfig'
import { useMotionOnce } from '@/shared/components/motion/useMotionOnce'

interface SlideUpProps {
  children: ReactNode
  className?: string
  delay?: number
  onceKey?: string
}

export function SlideUp({ children, className, delay = 0, onceKey }: SlideUpProps) {
  const reduce = useReducedMotion()
  const shouldAnimate = useMotionOnce(onceKey)
  if (reduce || !shouldAnimate) {
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
