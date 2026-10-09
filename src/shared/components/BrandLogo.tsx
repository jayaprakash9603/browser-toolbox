import { cn } from '@/shared/utils/cn'

interface BrandLogoProps {
  className?: string
  size?: number
}

export function BrandLogo({ className, size = 28 }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="brand-logo-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--hero-from)" />
          <stop offset="0.5" stopColor="var(--hero-via)" />
          <stop offset="1" stopColor="var(--hero-to)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#brand-logo-grad)" />
      <path
        d="M10 12h12v2.5H10V12zm0 5h8v2.5h-8V17zm0 5h10v2.5H10V22z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="22" cy="20" r="2" fill="white" fillOpacity="0.85" />
    </svg>
  )
}
