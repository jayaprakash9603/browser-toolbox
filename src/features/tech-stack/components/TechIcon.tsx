import { cn } from '@/shared/utils/cn'

const HUE_SPREAD = 360
const MAX_INITIALS = 2

function hueFor(name: string): number {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % HUE_SPREAD
  return hash
}

function initialsFor(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/)
  const letters = words.length > 1 ? words.slice(0, MAX_INITIALS).map((word) => word[0]) : [words[0]?.slice(0, MAX_INITIALS)]
  return letters.join('').toUpperCase()
}

/** Offline monogram standing in for a brand logo, tinted from the technology name. */
export function TechIcon({ name, className }: { name: string; className?: string }) {
  const hue = hueFor(name)
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-tight',
        className,
      )}
      style={{ backgroundColor: `hsl(${hue} 70% 50% / 0.16)`, color: `hsl(${hue} 65% 52%)` }}
    >
      {initialsFor(name)}
    </span>
  )
}
