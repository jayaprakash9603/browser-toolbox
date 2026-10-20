import type { ReactNode } from 'react'
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, InfoIcon } from 'lucide-react'

import type { SeoCheck, SeoSeverity } from '@/core/engines/seo/types'
import { Badge } from '@/shared/components/ui/badge'
import { CopyButton } from '@/shared/components/CopyButton'

export function SeverityIcon({ severity }: { severity: SeoSeverity }) {
  if (severity === 'ok')
    return <CheckCircle2Icon className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
  if (severity === 'warning')
    return <AlertTriangleIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
  if (severity === 'error')
    return <XCircleIcon className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
  return <InfoIcon className="size-3.5 shrink-0 text-muted-foreground" />
}

export function CheckRow({ check }: { check: SeoCheck }) {
  return (
    <div className="flex items-start gap-1.5 rounded border p-1.5">
      <SeverityIcon severity={check.severity} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px]">{check.message}</p>
        {check.fix && <p className="mt-0.5 text-[10px] text-muted-foreground">{check.fix}</p>}
      </div>
    </div>
  )
}

export function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`rounded border p-2 text-center ${warn ? 'border-amber-500/40' : ''}`}>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function MetaRow({ label, value, maxLen }: { label: string; value?: string | null; maxLen?: number }) {
  if (!value) return null
  const len = value.length
  const over = maxLen != null && len > maxLen
  return (
    <div className="flex items-start justify-between gap-1 rounded border bg-muted/40 px-2 py-1">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          {maxLen != null && (
            <Badge variant="outline" className={`text-[10px] ${over ? 'border-amber-500/50' : ''}`}>
              {len}/{maxLen}
            </Badge>
          )}
        </div>
        <p className="break-words text-[11px]">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  )
}

export function Pill({ children, variant }: { children: ReactNode; variant: 'ok' | 'warn' | 'bad' }) {
  const cls =
    variant === 'ok'
      ? 'border-green-500/40 text-green-700 dark:text-green-400'
      : variant === 'warn'
        ? 'border-amber-500/40 text-amber-700 dark:text-amber-400'
        : 'border-red-500/40 text-red-700 dark:text-red-400'
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`}>
      {children}
    </Badge>
  )
}
