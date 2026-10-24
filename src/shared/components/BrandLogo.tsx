import { useId } from 'react'

import { useSettings } from '@/shared/hooks/useSettings'
import { DEFAULT_PALETTE, getPalette, isPaletteId, type PaletteId } from '@/shared/lib/theme/palettes'
import { cn } from '@/shared/utils/cn'

interface BrandLogoProps {
  className?: string
  size?: number
}

function bootPalette(): PaletteId {
  const value = document.documentElement.dataset.palette
  return value && isPaletteId(value) ? value : DEFAULT_PALETTE
}

/** Same mark as the toolbar icon (`public/icons/themes/<palette>/`), tinted with the selected palette. */
export function BrandLogo({ className, size = 28 }: BrandLogoProps) {
  const settings = useSettings()
  const { from, via, to, accent } = getPalette(settings?.palette ?? bootPalette()).logo
  const id = useId().replace(/:/g, '')
  const tileId = `brand-tile-${id}`
  const windowId = `brand-window-${id}`
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="0.5" stopColor={via} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <clipPath id={windowId}>
          <rect x="3" y="3" width="58" height="58" rx="11" />
        </clipPath>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="11" fill={`url(#${tileId})`} />
      <g stroke="#ffffff" strokeLinejoin="round">
        <path clipPath={`url(#${windowId})`} strokeWidth="12" d="M3 12H38" />
        <rect x="3" y="3" width="58" height="58" rx="11" strokeWidth="6" />
        <path strokeWidth="6.5" strokeLinecap="round" d="M35.5 30.5 44 22v39" />
      </g>
      <g fill={`url(#${tileId})`}>
        <circle cx="12.5" cy="12" r="2.4" />
        <circle cx="19.5" cy="12" r="2.4" />
        <circle cx="26.5" cy="12" r="2.4" />
      </g>
      <circle cx="51" cy="12.5" r="3.2" fill={accent} />
      <rect
        x="0.25"
        y="0.25"
        width="63.5"
        height="63.5"
        rx="13.75"
        stroke={from}
        strokeOpacity="0.35"
        strokeWidth="0.5"
      />
    </svg>
  )
}
