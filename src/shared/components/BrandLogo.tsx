import { useId, useSyncExternalStore } from 'react'

import { useSettings } from '@/shared/hooks/useSettings'
import {
  DEFAULT_PALETTE,
  LOGO_DARK_BASE,
  getPalette,
  isPaletteId,
  type PaletteId,
} from '@/shared/lib/theme/palettes'
import { cn } from '@/shared/utils/cn'

interface BrandLogoProps {
  className?: string
  size?: number
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeSystemDark(listener: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

const systemDark = () => window.matchMedia(DARK_QUERY).matches

function bootPalette(): PaletteId {
  const value = document.documentElement.dataset.palette
  return value && isPaletteId(value) ? value : DEFAULT_PALETTE
}

/**
 * Same mark as the toolbar icon (`public/icons/themes/<palette>/` and its `dark/` variant), tinted with the
 * selected palette: a white window on the palette gradient in light mode, a palette-tinted window in dark mode.
 */
export function BrandLogo({ className, size = 28 }: BrandLogoProps) {
  const settings = useSettings()
  const osDark = useSyncExternalStore(subscribeSystemDark, systemDark, () => false)
  const theme = settings?.theme
  const dark = theme ? theme === 'dark' || (theme === 'system' && osDark) : document.documentElement.classList.contains('dark')
  const palette = getPalette(settings?.palette ?? bootPalette())
  const id = useId().replace(/:/g, '')
  const gradientId = `brand-gradient-${id}`
  const windowId = `brand-window-${id}`
  const gradient = `url(#${gradientId})`
  const stops = dark
    ? [palette.logoDark.from, palette.logoDark.to]
    : [palette.logo.from, palette.logo.via, palette.logo.to]
  const ink = dark ? gradient : '#ffffff'
  const accent = dark ? palette.logoDark.accent : palette.logo.accent
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
        <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          {stops.map((color, i) => (
            <stop key={color} offset={i / (stops.length - 1)} stopColor={color} />
          ))}
        </linearGradient>
        <clipPath id={windowId}>
          <rect x="3" y="3" width="58" height="58" rx="11" />
        </clipPath>
      </defs>
      {dark ? (
        <>
          <rect x="3" y="3" width="58" height="58" rx="11" fill={LOGO_DARK_BASE} />
          <rect x="3" y="3" width="58" height="58" rx="11" fill={gradient} fillOpacity="0.14" />
        </>
      ) : (
        <rect x="3" y="3" width="58" height="58" rx="11" fill={gradient} />
      )}
      <g stroke={ink} strokeLinejoin="round">
        <path clipPath={`url(#${windowId})`} strokeWidth="12" d="M3 12H38" />
        <rect x="3" y="3" width="58" height="58" rx="11" strokeWidth="6" />
        <path strokeWidth="6.5" strokeLinecap="round" d="M35.5 30.5 44 22v39" />
      </g>
      <g fill={dark ? LOGO_DARK_BASE : gradient}>
        <circle cx="12.5" cy="12" r="2.4" />
        <circle cx="19.5" cy="12" r="2.4" />
        <circle cx="26.5" cy="12" r="2.4" />
      </g>
      <circle cx="51" cy="12.5" r="3.2" fill={accent} />
      {!dark && (
        <rect
          x="0.25"
          y="0.25"
          width="63.5"
          height="63.5"
          rx="13.75"
          stroke={palette.logo.from}
          strokeOpacity="0.35"
          strokeWidth="0.5"
        />
      )}
    </svg>
  )
}
