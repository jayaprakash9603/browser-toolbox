import { WifiIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { NetStatus } from '@/core/netmon'
import { cn } from '@/shared/utils/cn'

import { STATUS_ICONS, statusColor } from '../statusStyle'

export function StatusDot({
  status,
  pulse = false,
  className,
}: {
  status: NetStatus | null
  pulse?: boolean
  className?: string
}) {
  const color = statusColor(status)
  return (
    <span aria-hidden className={cn('relative inline-flex size-2.5 shrink-0', className)}>
      {pulse && (
        <span
          className="absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="relative inline-flex size-full rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

/** Color plus text, so status never depends on color alone. */
export function StatusBadge({
  status,
  short = false,
  className,
}: {
  status: NetStatus
  short?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      title={short ? t(`netmon.status.${status}`) : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        className,
      )}
      style={{
        color: statusColor(status),
        borderColor: `color-mix(in srgb, ${statusColor(status)} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${statusColor(status)} 10%, transparent)`,
      }}
    >
      <StatusDot status={status} className="size-1.5" />
      {t(short ? `netmon.statusShort.${status}` : `netmon.status.${status}`)}
    </span>
  )
}

export function StatusIconTile({
  status,
  size = 'md',
  className,
}: {
  status: NetStatus | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const Icon = status ? STATUS_ICONS[status] : WifiIcon
  const color = statusColor(status)
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl',
        size === 'sm' && 'size-8 [&_svg]:size-4',
        size === 'md' && 'size-10 [&_svg]:size-5',
        size === 'lg' && 'size-12 [&_svg]:size-6',
        className,
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon />
    </span>
  )
}
