import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react'

import { useRouter } from '@/app/router'
import { CAPTURE_DELAYS_SEC, type ScreenshotSettings } from '@/core/screenshot/settings'
import { IMAGE_FORMATS } from '@/features/captureEditor/ScreenshotOptions'
import { OptionField, OptionSelect, OptionSwitch, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

/** The capture settings people change most, applied as soon as they change. */
export function QuickOptions({
  settings,
  onChange,
}: {
  settings: ScreenshotSettings
  onChange: (patch: Partial<ScreenshotSettings>) => void
}) {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const reduce = useReducedMotion()
  const bodyId = useId()
  const [open, setOpen] = useState(true)

  return (
    <PanelSection
      title={t('capture.options.title')}
      icon={<SlidersHorizontalIcon />}
      actions={
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="xs" onClick={() => navigate('/tools/screenshots/capture?options=1')}>
            {t('capture.options.all')}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={t(open ? 'capture.options.collapse' : 'capture.options.expand')}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDownIcon className={cn('transition-transform duration-200', open && 'rotate-180')} />
          </Button>
        </div>
      }
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="options"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="-mx-1 overflow-hidden px-1"
          >
            <div className="flex flex-col gap-3 pb-0.5">
              <div className="grid gap-3 @[600px]:grid-cols-2">
                <OptionField label={t('capture.options.delay')}>
                  <Segmented
                    size="sm"
                    ariaLabel={t('capture.options.delay')}
                    className="flex w-full [&>button]:flex-1"
                    value={String(settings.captureDelaySec)}
                    onValueChange={(value) => onChange({ captureDelaySec: Number(value) })}
                    options={CAPTURE_DELAYS_SEC.map((seconds) => ({
                      value: String(seconds),
                      label: seconds === 0 ? t('capture.options.delayOff') : t('capture.options.delaySec', { count: seconds }),
                    }))}
                  />
                </OptionField>
                <OptionSelect
                  label={t('capture.options.after')}
                  value={settings.afterCapture}
                  onChange={(afterCapture) => onChange({ afterCapture })}
                  options={[
                    { value: 'editor', label: t('capture.options.afterEditor') },
                    { value: 'clipboard', label: t('capture.options.afterCopy') },
                    { value: 'autosave', label: t('capture.options.afterSave') },
                  ]}
                />
                <OptionSelect
                  label={t('capture.options.format')}
                  value={settings.defaultFormat}
                  onChange={(defaultFormat) => onChange({ defaultFormat })}
                  options={IMAGE_FORMATS}
                />
                <OptionSelect
                  label={t('capture.options.allTabs')}
                  value={settings.allTabsMode}
                  onChange={(allTabsMode) => onChange({ allTabsMode })}
                  options={[
                    { value: 'entire', label: t('capture.options.allTabsEntire') },
                    { value: 'visible', label: t('capture.options.allTabsVisible') },
                  ]}
                />
              </div>
              <div className="grid gap-2 @[600px]:grid-cols-2">
                <OptionSwitch
                  label={t('capture.options.sticky')}
                  hint={t('capture.options.stickyHint')}
                  checked={settings.hideStickyHeaders}
                  onChange={(hideStickyHeaders) => onChange({ hideStickyHeaders })}
                />
                <OptionSwitch
                  label={t('capture.options.stamp')}
                  hint={t('capture.options.stampHint')}
                  checked={settings.pageInfoStamp}
                  onChange={(pageInfoStamp) => onChange({ pageInfoStamp })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PanelSection>
  )
}
