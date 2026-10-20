import * as PopoverPrimitive from '@radix-ui/react-popover'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

import { useNetLive, useNetMonitorSettings } from '../hooks'
import { useLiveStatusLabel } from '../useLiveStatusLabel'
import { STATUS_ICONS, statusColor } from '../statusStyle'
import { StatusDot } from './StatusBadge'

const PopoverBody = lazy(() => import('./NetStatusPopoverBody'))

/** Header Wi-Fi icon; the AppShell only mounts it on the home page. */
export function NetStatusIndicator() {
  const { t } = useTranslation()
  const { settings } = useNetMonitorSettings()
  const live = useNetLive()
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const label = useLiveStatusLabel(live)

  if (!settings?.enabled || !settings.showHeaderIcon) return null

  const status = live?.status ?? null
  const Icon = status ? STATUS_ICONS[status] : STATUS_ICONS.online

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('netmon.popover.indicator', { status: label })}
          title={label}
        >
          <motion.span
            key={status ?? 'none'}
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className="flex"
            style={{ color: status && status !== 'online' ? statusColor(status) : undefined }}
          >
            <Icon className="size-[18px]" />
          </motion.span>
          <StatusDot
            status={status}
            pulse={status === 'online' || status === 'offline'}
            className="absolute top-1.5 right-1.5 size-2 ring-2 ring-background rounded-full"
          />
        </Button>
      </PopoverPrimitive.Trigger>
      <AnimatePresence>
        {open && (
          <PopoverPrimitive.Portal forceMount>
            <PopoverPrimitive.Content forceMount asChild align="end" sideOffset={8} collisionPadding={8}>
              <motion.div
                className="z-50 w-[22rem] max-w-[calc(100vw-1rem)] origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-xl outline-none"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
                transition={reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 420, damping: 32 }}
              >
                <Suspense fallback={<div className="h-80" />}>
                  <PopoverBody live={live} onNavigate={() => setOpen(false)} />
                </Suspense>
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  )
}

