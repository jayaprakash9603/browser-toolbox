import { useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { NetSample } from '@/core/netmon'
import { cn } from '@/shared/utils/cn'

const WIDTH = 120
const HEIGHT = 28
const PAD = 2

export function Sparkline({
  samples,
  className,
}: {
  samples: readonly NetSample[]
  className?: string
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const points = useMemo(() => samples.filter((s) => s.latency !== null).slice(-40), [samples])
  const path = useMemo(() => {
    if (points.length < 2) return ''
    const values = points.map((s) => s.latency as number)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(1, max - min)
    return values
      .map((value, i) => {
        const x = PAD + (i / (values.length - 1)) * (WIDTH - PAD * 2)
        const y = HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }, [points])

  if (points.length < 2) return null

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn('h-7 w-[7.5rem] overflow-visible', className)}
      role="img"
      aria-label={t('netmon.hero.sparkline')}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--netmon-latency)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={
          reduceMotion
            ? undefined
            : { strokeDasharray: 1, strokeDashoffset: 0, animation: 'none' }
        }
      />
    </svg>
  )
}
