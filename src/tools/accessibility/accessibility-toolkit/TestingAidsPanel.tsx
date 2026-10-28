import { motion, useReducedMotion } from 'motion/react'
import { EyeIcon, RotateCcwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { Button } from '@/shared/components/ui/button'
import { PanelSection, OptionSwitch } from '@/shared/components/toolkit'

import type { A11yAidCounts } from './inPage/aids'
import type { A11yAidState, VisionMode } from './inPage/aids'

const VISION_MODES: VisionMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'blurred', 'lowContrast']

interface TestingAidsPanelProps {
  state: A11yAidState
  counts: A11yAidCounts | null
  disabled?: boolean
  onChange: (patch: Partial<A11yAidState>) => void
  onReset: () => void
}

export function TestingAidsPanel({ state, counts, disabled, onChange, onReset }: TestingAidsPanelProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <PanelSection title={t('a11y.aids.title')} icon={<EyeIcon />}>
      <p className="-mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{t('a11y.aids.subtitle')}</p>
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">{t('a11y.aids.vision')}</p>
        <ChoiceChips
          value={state.vision}
          onValueChange={(vision) => onChange({ vision: vision as VisionMode })}
          ariaLabel={t('a11y.aids.vision')}
          columns={2}
          options={VISION_MODES.map((mode) => ({
            value: mode,
            label: t(`a11y.aids.vision.${mode}`),
          }))}
        />
      </div>
      <motion.div
        className="grid gap-2 @sm:grid-cols-2"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <OptionSwitch
          label={t('a11y.aids.tabOrder')}
          hint={t('a11y.aids.tabOrderHint')}
          checked={state.tabOrder}
          onChange={(tabOrder) => onChange({ tabOrder })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.headings')}
          hint={t('a11y.aids.headingsHint')}
          checked={state.headings}
          onChange={(headings) => onChange({ headings })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.landmarks')}
          hint={t('a11y.aids.landmarksHint')}
          checked={state.landmarks}
          onChange={(landmarks) => onChange({ landmarks })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.altText')}
          hint={t('a11y.aids.altTextHint')}
          checked={state.altText}
          onChange={(altText) => onChange({ altText })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.focusRing')}
          hint={t('a11y.aids.focusRingHint')}
          checked={state.focusRing}
          onChange={(focusRing) => onChange({ focusRing })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.textSpacing')}
          hint={t('a11y.aids.textSpacingHint')}
          checked={state.textSpacing}
          onChange={(textSpacing) => onChange({ textSpacing })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.pauseMotion')}
          hint={t('a11y.aids.pauseMotionHint')}
          checked={state.pauseMotion}
          onChange={(pauseMotion) => onChange({ pauseMotion })}
          disabled={disabled}
        />
        <OptionSwitch
          label={t('a11y.aids.hideStyles')}
          hint={t('a11y.aids.hideStylesHint')}
          checked={state.hideStyles}
          onChange={(hideStyles) => onChange({ hideStyles })}
          disabled={disabled}
        />
      </motion.div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
        {counts ? (
          <p className="text-[11px] text-muted-foreground">
            {t('a11y.aids.counts', {
              tabs: counts.tabStops,
              headings: counts.headings,
              landmarks: counts.landmarks,
              images: counts.images,
            })}
          </p>
        ) : (
          <span />
        )}
        <Button variant="outline" size="xs" disabled={disabled} onClick={onReset}>
          <RotateCcwIcon className="size-3.5" />
          {t('a11y.aids.reset')}
        </Button>
      </div>
    </PanelSection>
  )
}
