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
  return (
    <>
      <SettingsRow
        searchId="formMemoryLearn"
        label={t('formMemory.settings.learn')}
        description={t('formMemory.settings.learnHint', { fill: fillKey, clear: clearKey })}
      >
        <Switch
          checked={state.settings.learn}
          onCheckedChange={(on) => void patchSettings({ learn: on })}
          aria-label={t('formMemory.settings.learn')}
        />
      </SettingsRow>
      <SettingsLinkRow to={FORM_AUTOFILL_ROUTE}>{t('formMemory.settings.manage')}</SettingsLinkRow>
    </>
  )
}
