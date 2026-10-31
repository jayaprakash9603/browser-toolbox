import { LoaderCircleIcon } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { updateAdblockState } from '@/core/adblock'
import { updateProtectionState } from '@/core/protection'
import { toolRegistry } from '@/core/registry'
import { useAdblock } from '@/features/adblock/useAdblock'
import { useProtection } from '@/features/protection/useProtection'
import { getToolName } from '@/i18n/toolLabels'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

interface HeaderToggleProps {
  toolId: string
  enabled: boolean | null
  setEnabled: (next: boolean) => Promise<boolean>
}

function HeaderToggle({ toolId, enabled, setEnabled }: HeaderToggleProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const tool = toolRegistry.get(toolId)
  if (!tool) return null

  const name = getToolName(tool, t)
  const busy = pending || enabled === null
  const Icon: ComponentType<{ className?: string }> = busy ? LoaderCircleIcon : tool.icon
  const describe = (on: boolean) =>
    on ? t('headerToggle.on', { defaultValue: 'on' }) : t('headerToggle.off', { defaultValue: 'off' })
  const label =
    enabled === null
      ? `${name}: ${t('headerToggle.loading', { defaultValue: 'loading' })}`
      : `${name}: ${describe(enabled)}`

  const toggle = async () => {
    if (busy) return
    setPending(true)
    const result = await setEnabled(!enabled).catch(() => enabled)
    setPending(false)
    setAnnouncement(
      result === !enabled
        ? t('headerToggle.changed', {
            defaultValue: '{{name}} turned {{state}}.',
            name,
            state: describe(result),
          })
        : t('headerToggle.unchanged', {
            defaultValue: '{{name}} was not changed. Site access may not have been granted.',
            name,
          }),
    )
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={enabled === true}
            aria-busy={busy}
            disabled={enabled === null}
            data-state={enabled ? 'on' : 'off'}
            onClick={() => void toggle()}
            className={cn(
              'relative',
              enabled
                ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                : 'text-muted-foreground',
            )}
          >
            <Icon className={cn('size-4', busy && 'motion-safe:animate-spin')} />
            {enabled && !busy && (
              <span
                aria-hidden
                className="absolute top-1 right-1 size-1.5 rounded-full bg-primary ring-2 ring-background"
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  )
}

export function HeaderProtectionToggles() {
  return (
    <>
      <AdblockHeaderToggle />
      <ProtectionHeaderToggle />
    </>
  )
}

export function AdblockHeaderToggle() {
  const { state } = useAdblock()
  const setEnabled = async (next: boolean) => (await updateAdblockState({ enabled: next })).enabled
  return <HeaderToggle toolId="privacy.ad-blocker" enabled={state ? state.enabled : null} setEnabled={setEnabled} />
}

export function ProtectionHeaderToggle() {
  const { state } = useProtection()
  const setEnabled = async (next: boolean) => (await updateProtectionState({ enabled: next })).enabled
  return (
    <HeaderToggle toolId="privacy.web-protection" enabled={state ? state.enabled : null} setEnabled={setEnabled} />
  )
}
