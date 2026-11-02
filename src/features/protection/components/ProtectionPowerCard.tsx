import { LoaderCircleIcon, PowerIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

import './protection-power.css'

export function ProtectionPowerCard({
  name,
  enabled,
  disabled = false,
  onToggle,
  children,
}: {
  name: string
  enabled: boolean
  disabled?: boolean
  onToggle: (on: boolean) => Promise<boolean>
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const Icon = enabled ? ShieldCheckIcon : ShieldOffIcon
  const status = t(enabled ? 'headerToggle.on' : 'headerToggle.off')

  const toggle = async () => {
    if (pending || disabled) return
    setPending(true)
    setError('')
    try {
      const result = await onToggle(!enabled)
      if (result !== !enabled) setError(t('headerToggle.unchanged', { name }))
    } catch (cause) {
      console.error(`Unable to update ${name}`, cause)
      setError(t('protection.control.error', { name }))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="protection-power-card" data-enabled={enabled}>
      <div className="flex items-center gap-3">
        <span className="protection-power-orbit" aria-hidden>
          <span className="protection-power-ring" />
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{name}</h2>
          <p role="status" className="mt-1 text-[11px] text-muted-foreground">
            {t('protection.control.status', { state: status })}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={name}
          aria-busy={pending}
          disabled={pending || disabled}
          className="protection-power-button"
          onClick={() => void toggle()}
        >
          {pending ? (
            <LoaderCircleIcon className="size-5 motion-safe:animate-spin" aria-hidden />
          ) : (
            <PowerIcon className="size-5" aria-hidden />
          )}
        </button>
      </div>
      {children && (
        <div
          className={cn(
            'mt-3 border-t pt-3 text-xs',
            enabled ? 'border-emerald-500/20' : 'border-border',
          )}
        >
          {children}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
