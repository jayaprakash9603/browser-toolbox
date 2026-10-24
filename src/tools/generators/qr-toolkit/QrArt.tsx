import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

import type { QrGeometry, QrStyle } from './qrModel'

interface QrArtProps {
  geometry: QrGeometry
  style: QrStyle
  logo: string | null
  /** Changing this replays the reveal; style edits alone only cross-fade colours. */
  revealKey: number
  label?: string
  className?: string
}

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const

export function QrArt({ geometry, style, logo, revealKey, label, className }: QrArtProps) {
  const reduce = useReducedMotion()
  const uid = useId().replace(/[^\w-]/g, '')
  const { width, height } = geometry
  const center = width / 2
  const radius = width * 0.75
  const ink = style.gradient === 'none' ? style.fg : `url(#${uid}-ink)`
  const eyeInk = style.eyeColor ?? ink
  const fade = { transition: 'fill 300ms ease' }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={className}
      shapeRendering="geometricPrecision"
    >
      <defs>
        {style.gradient === 'linear' && (
          <linearGradient id={`${uid}-ink`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2={width}>
            <stop offset="0" stopColor={style.fg} style={{ transition: 'stop-color 300ms' }} />
            <stop offset="1" stopColor={style.fg2} style={{ transition: 'stop-color 300ms' }} />
          </linearGradient>
        )}
        {style.gradient === 'radial' && (
          <radialGradient id={`${uid}-ink`} gradientUnits="userSpaceOnUse" cx={center} cy={center} r={width * 0.7}>
            <stop offset="0" stopColor={style.fg} style={{ transition: 'stop-color 300ms' }} />
            <stop offset="1" stopColor={style.fg2} style={{ transition: 'stop-color 300ms' }} />
          </radialGradient>
        )}
        <mask id={`${uid}-reveal`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <motion.circle
            key={revealKey}
            cx={center}
            cy={center}
            fill="white"
            initial={{ r: reduce ? radius : 0 }}
            animate={{ r: radius }}
            transition={{ duration: 0.75, ease: REVEAL_EASE }}
          />
        </mask>
      </defs>

      {!style.transparent && <rect width={width} height={height} fill={style.bg} style={fade} />}

      <g mask={`url(#${uid}-reveal)`}>
        <path d={geometry.body} fill={ink} style={fade} />
      </g>

      {!reduce && (
        <motion.circle
          key={`wave-${revealKey}`}
          cx={center}
          cy={center}
          fill="none"
          stroke={eyeInk}
          initial={{ r: 0, opacity: 0.55, strokeWidth: 1.6 }}
          animate={{ r: radius, opacity: 0, strokeWidth: 0.15 }}
          transition={{ duration: 0.8, ease: REVEAL_EASE }}
        />
      )}

      {geometry.eyes.map((eye, index) => (
        <motion.g
          key={`${revealKey}-${index}`}
          initial={reduce ? false : { scale: 0.2, rotate: -120, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 + index * 0.08 }}
        >
          <path d={eye.ring} fill={eyeInk} fillRule="evenodd" style={fade} />
          <path d={eye.pupil} fill={eyeInk} style={fade} />
        </motion.g>
      ))}

      {geometry.logo && logo && (
        <motion.g
          key={`logo-${revealKey}`}
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.35 }}
        >
          {!style.transparent && (
            <rect
              x={geometry.logo.x}
              y={geometry.logo.y}
              width={geometry.logo.size}
              height={geometry.logo.size}
              rx={geometry.logo.size * 0.18}
              fill={style.bg}
              style={fade}
            />
          )}
          <image
            href={logo}
            x={geometry.logo.x + geometry.logo.size * 0.12}
            y={geometry.logo.y + geometry.logo.size * 0.12}
            width={geometry.logo.size * 0.76}
            height={geometry.logo.size * 0.76}
            preserveAspectRatio="xMidYMid meet"
          />
        </motion.g>
      )}

      {geometry.label && (
        <text
          x={center}
          y={geometry.label.y}
          fontSize={geometry.label.fontSize}
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          fontWeight={700}
          letterSpacing={geometry.label.fontSize * 0.08}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={eyeInk}
          style={fade}
        >
          {style.label.trim()}
        </text>
      )}
    </svg>
  )
}
