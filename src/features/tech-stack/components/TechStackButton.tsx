import * as PopoverPrimitive from '@radix-ui/react-popover'
import { LayersIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

const loadBody = () => import('./TechStackPopoverBody')
const PopoverBody = lazy(loadBody)

function ScanPip({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="absolute top-1.5 right-1.5 size-2">
      {active && (
        <span className="absolute inset-0 rounded-full bg-[var(--hero-from)] opacity-60 motion-safe:animate-ping" />
      )}
      <span className="relative inline-flex size-full rounded-full bg-[var(--hero-from)] ring-2 ring-background" />
    </span>
  )
}

/** Header icon that opens the technologies detected on the page the user is looking at. */
export function TechStackButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const preload = () => void loadBody()

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverPrimitive.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={t('nav.techStack')}
              onPointerEnter={preload}
              onFocus={preload}
            >
              <motion.span
                key={open ? 'open' : 'closed'}
                initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className="flex"
                style={{ color: open ? 'var(--hero-from)' : undefined }}
              >
                <LayersIcon className="size-[18px]" />
              </motion.span>
              <ScanPip active={open} />
            </Button>
          </PopoverPrimitive.Trigger>
        </TooltipTrigger>
        <TooltipContent>{t('nav.techStack')}</TooltipContent>
      </Tooltip>
      <AnimatePresence>
        {open && (
          <PopoverPrimitive.Portal forceMount>
            <PopoverPrimitive.Content forceMount asChild align="end" sideOffset={8} collisionPadding={8}>
              <motion.div
                className="z-50 flex max-h-[min(36rem,calc(100dvh-4.5rem))] w-[min(24rem,calc(100vw-1rem))] origin-(--radix-popover-content-transform-origin) flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-xl outline-none"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
                transition={reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 420, damping: 32 }}
              >
                <Suspense fallback={<div className="h-80 bg-muted/20" />}>
                  <PopoverBody onNavigate={() => setOpen(false)} />
                </Suspense>
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  )
}
