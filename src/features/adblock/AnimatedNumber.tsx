import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'

const formatter = new Intl.NumberFormat()

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion()
  const motionValue = useMotionValue(value)
  const display = useTransform(motionValue, (latest) => formatter.format(Math.round(latest)))

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [motionValue, reduceMotion, value])

  return <motion.span className={className}>{display}</motion.span>
}
