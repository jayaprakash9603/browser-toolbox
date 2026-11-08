import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { ENTRANCE } from '@/shared/components/motion/motionConfig'
import { useMotionOnce } from '@/shared/components/motion/useMotionOnce'

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  onceKey?: string
}

export function FadeIn({ children, className, delay = 0, onceKey }: FadeInProps) {
  const reduce = useReducedMotion()
  const shouldAnimate = useMotionOnce(onceKey)
  if (reduce || !shouldAnimate) {
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
