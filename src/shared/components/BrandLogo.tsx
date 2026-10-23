import { cn } from '@/shared/utils/cn'

const LOGO_SRC = '/icons/icon32.png'

interface BrandLogoProps {
  className?: string
  size?: number
}

export function BrandLogo({ className, size = 28 }: BrandLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      alt=""
      className={cn('shrink-0 rounded-md object-contain', className)}
      aria-hidden
      decoding="async"
    />
  )
}
