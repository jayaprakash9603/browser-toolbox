import { ArrowUpRightIcon, LoaderCircleIcon, XIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { toolRegistry } from '@/core/registry'
import { PlusFeatures } from '@/features/adblock/components/PlusFeatures'
import { useAdblock } from '@/features/adblock/useAdblock'
import { CategoryToggles, GuardToggles } from '@/features/protection/components/CategoryToggles'
import { ProtectionPowerCard } from '@/features/protection/components/ProtectionPowerCard'
import { useProtection } from '@/features/protection/useProtection'
import { getToolName } from '@/i18n/toolLabels'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import { FilterListToggles } from '@/tools/privacy/ad-blocker/FilterListToggles'

interface HeaderToggleProps {
  toolId: string
  enabled: boolean | null
  setEnabled: (next: boolean) => Promise<boolean>
  options: (save: (request: () => Promise<unknown>) => void, pending: boolean) => ReactNode
}

function HeaderToggle({ toolId, enabled, setEnabled, options }: HeaderToggleProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const tool = toolRegistry.get(toolId)
  if (!tool) return null

  const name = getToolName(tool, t)
  const Icon = enabled === null ? LoaderCircleIcon : tool.icon
  const label = `${name}: ${t(enabled === null ? 'headerToggle.loading' : enabled ? 'headerToggle.on' : 'headerToggle.off')}`
  const save = async (request: () => Promise<unknown>) => {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await request()
    } catch (cause) {
      console.error(`Unable to update ${name} options`, cause)
      setError(t('protection.control.error', { name }))
    } finally {
      setPending(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              disabled={enabled === null}
              className={cn(
                'relative',
                enabled
                  ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('size-4', enabled === null && 'motion-safe:animate-spin')} />
              {enabled && (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 size-1.5 rounded-full bg-primary ring-2 ring-background"
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        collisionPadding={8}
        aria-label={name}
        className="max-h-[var(--radix-popover-content-available-height)] w-[360px] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-2xl p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">{t('protection.control.quickSettings')}</p>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('protection.control.close')}
            onClick={() => setOpen(false)}
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
        </div>
        {enabled !== null && (
          <ProtectionPowerCard
            name={name}
            enabled={enabled}
            disabled={pending}
            onToggle={async (next) => {
              setPending(true)
              setError('')
              try {
                return await setEnabled(next)
              } finally {
                setPending(false)
              }
            }}
          />
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <fieldset
          disabled={pending}
          aria-busy={pending}
          className="mt-3 max-h-[45dvh] min-w-0 space-y-3 overflow-y-auto overscroll-contain pr-1 disabled:opacity-70"
        >
          <legend className="sr-only">{t('protection.control.options')}</legend>
          {options((request) => void save(request), pending)}
        </fieldset>
        <Link
          to={tool.route}
          onClick={() => setOpen(false)}
          className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-xs font-medium text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('protection.control.allSettings', { name })}
          <ArrowUpRightIcon className="size-4" aria-hidden />
        </Link>
      </PopoverContent>
    </Popover>
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
  const { state, patch } = useAdblock()
  return (
    <HeaderToggle
      toolId="privacy.ad-blocker"
      enabled={state?.enabled ?? null}
      setEnabled={async (enabled) => (await patch({ enabled })).enabled}
      options={(save, pending) =>
        state && (
          <>
            <FilterListToggles
              state={state}
              disabled={!state.enabled || pending}
              onPatch={(next) => save(() => patch(next))}
            />
            <fieldset disabled={!state.enabled || pending}>
              <PlusFeatures state={state} onPatch={(next) => save(() => patch(next))} />
            </fieldset>
          </>
        )
      }
    />
  )
}

export function ProtectionHeaderToggle() {
  const { state, patch } = useProtection()
  return (
    <HeaderToggle
      toolId="privacy.web-protection"
      enabled={state?.enabled ?? null}
      setEnabled={async (enabled) => (await patch({ enabled })).enabled}
      options={(save, pending) =>
        state && (
          <>
            <CategoryToggles
              state={state}
              threats={null}
              disabled={!state.enabled || pending}
              onPatch={(next) => save(() => patch(next))}
            />
            <GuardToggles
              state={state}
              disabled={!state.enabled || pending}
              onPatch={(next) => save(() => patch(next))}
            />
          </>
        )
      }
    />
  )
}
