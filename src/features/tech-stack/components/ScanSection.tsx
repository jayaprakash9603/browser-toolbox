import { motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'

export function ScanSection({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
