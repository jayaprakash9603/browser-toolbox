import { cn } from '@/shared/utils/cn'

import { mixTint } from '../categoryStyle'

const MAX_INITIALS = 2

function initialsFor(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/)
  const letters = words.length > 1 ? words.slice(0, MAX_INITIALS).map((word) => word[0]) : [words[0]?.slice(0, MAX_INITIALS)]
  return letters.join('').toUpperCase()
}

export function TechIcon({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold tracking-tight',
        className,
      )}
      style={{ color, backgroundColor: mixTint(color) }}
    >
      {initialsFor(name)}
    </span>
  )
}
