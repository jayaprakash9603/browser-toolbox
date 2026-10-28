import { MoonIcon, WifiIcon, WifiLowIcon, WifiOffIcon, type LucideIcon } from 'lucide-react'

import { STATUS_META, type LatencyGrade, type NetStatus } from '@/core/netmon'

export const STATUS_ICONS: Record<NetStatus, LucideIcon> = {
  online: WifiIcon,
  lan: WifiLowIcon,
  offline: WifiOffIcon,
  nodata: MoonIcon,
}

export function statusColor(status: NetStatus | null): string {
  return status ? STATUS_META[status].color : 'var(--netmon-nodata)'
}

export function availabilityColor(value: number | null): string {
  if (value === null) return 'var(--netmon-nodata)'
  if (value >= 0.99) return 'var(--netmon-online)'
  if (value >= 0.95) return 'var(--netmon-lan)'
  return 'var(--netmon-offline)'
}

export function latencyGradeColor(grade: LatencyGrade): string {
  if (grade === 'excellent') return 'var(--netmon-online)'
  if (grade === 'good') return 'var(--netmon-latency)'
  if (grade === 'fair') return 'var(--netmon-lan)'
  if (grade === 'poor') return 'var(--netmon-offline)'
  return 'var(--netmon-nodata)'
}
