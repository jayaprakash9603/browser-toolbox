import { useId } from 'react'

import { cn } from '@/shared/utils/cn'

const DARK_BASE = '#0b0f17'

/** One Panel mark, dark variant: matches the website's logo and the extension's dark toolbar icon. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '')
  const tileId = `logo-tile-${id}`
  const windowId = `logo-window-${id}`
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
        <clipPath id={windowId}>
          <rect x="3" y="3" width="58" height="58" rx="11" />
        </clipPath>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="11" fill={DARK_BASE} />
      <rect x="3" y="3" width="58" height="58" rx="11" fill={`url(#${tileId})`} fillOpacity="0.14" />
      <g stroke={`url(#${tileId})`} strokeLinejoin="round">
        <path data-logo-stroke="" clipPath={`url(#${windowId})`} strokeWidth="12" d="M3 12H38" />
        <path
          data-logo-stroke=""
          strokeWidth="6"
          d="M3 14a11 11 0 0 1 11-11h36a11 11 0 0 1 11 11v36a11 11 0 0 1-11 11H14A11 11 0 0 1 3 50z"
        />
        <path data-logo-stroke="" strokeWidth="6.5" strokeLinecap="round" d="M35.5 30.5 44 22v39" />
      </g>
      <g fill={DARK_BASE}>
        <circle data-logo-dot="" cx="12.5" cy="12" r="2.4" />
        <circle data-logo-dot="" cx="19.5" cy="12" r="2.4" />
        <circle data-logo-dot="" cx="26.5" cy="12" r="2.4" />
      </g>
      <circle data-logo-dot="" cx="51" cy="12.5" r="3.2" fill="#fb923c" />
    </svg>
  )
}
