import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { cn } from '@/shared/utils/cn'

interface RollingTextProps {
  text: string
  className?: string
}

/** Rolls each changed character vertically; static text when reduced motion is on. */
export function RollingText({ text, className }: RollingTextProps) {
  const reduce = useReducedMotion()
  if (reduce) return <span className={cn('tabular-nums', className)}>{text}</span>
  return (
    <span className={cn('inline-flex overflow-hidden tabular-nums', className)}>
      <span className="sr-only">{text}</span>
      {[...text].map((char, index) => (
        <span key={index} aria-hidden className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={char}
              className="inline-block whitespace-pre"
              initial={{ y: '-70%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '70%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
