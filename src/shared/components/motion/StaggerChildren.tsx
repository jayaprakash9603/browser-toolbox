import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { useMotionOnce } from '@/shared/components/motion/useMotionOnce'

interface StaggerChildrenProps {
  children: ReactNode
  className?: string
  stagger?: number
  onceKey?: string
}

export function StaggerChildren({
  children,
  className,
  stagger = 0.04,
  onceKey,
}: StaggerChildrenProps) {
  const reduce = useReducedMotion()
  const shouldAnimate = useMotionOnce(onceKey)
  if (reduce || !shouldAnimate) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
