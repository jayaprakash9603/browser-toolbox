import { motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'

export function ScanSection({
  className,
  style,
  children,
  /** Header/footer chrome should not fade in behind scrollable content. */
  instant = false,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
  instant?: boolean
}) {
  if (instant) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
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
