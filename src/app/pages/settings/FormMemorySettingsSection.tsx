import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { FORM_AUTOFILL_ROUTE } from '@/core/form-memory/model'
import { useFormMemory } from '@/features/form-memory/useFormMemory'
import { useShortcutDisplay } from '@/features/shortcuts/useShortcutDisplay'
import { Switch } from '@/shared/components/ui/switch'

export function FormMemorySettingsSection() {
  const { t } = useTranslation()
  const { state, patchSettings } = useFormMemory()
  const fillKey = useShortcutDisplay('form-fill')
  const clearKey = useShortcutDisplay('form-clear')
  if (!state) return null
  const active = state.settings.enabled
  return (
    <>
      <SettingsRow
        searchId="formMemoryEnabled"
        label={t('formMemory.settings.enabled')}
        description={t('formMemory.settings.enabledHint')}
      >
        <Switch
          checked={active}
          onCheckedChange={(on) => void patchSettings({ enabled: on })}
          aria-label={t('formMemory.settings.enabled')}
        />
      </SettingsRow>
      <SettingsRow
        searchId="formMemoryLearn"
        label={t('formMemory.settings.learn')}
        description={t('formMemory.settings.learnHint', { fill: fillKey, clear: clearKey })}
      >
        <Switch
          checked={state.settings.learn}
          disabled={!active}
          onCheckedChange={(on) => void patchSettings({ learn: on })}
          aria-label={t('formMemory.settings.learn')}
        />
      </SettingsRow>
      <SettingsRow
        searchId="formMemoryReview"
        label={t('formMemory.settings.review')}
        description={t('formMemory.settings.reviewHint')}
      >
        <Switch
          checked={state.settings.review}
          disabled={!active}
          onCheckedChange={(on) => void patchSettings({ review: on })}
          aria-label={t('formMemory.settings.review')}
        />
      </SettingsRow>
      <SettingsLinkRow to={FORM_AUTOFILL_ROUTE}>{t('formMemory.settings.manage')}</SettingsLinkRow>
    </>
  )
}
