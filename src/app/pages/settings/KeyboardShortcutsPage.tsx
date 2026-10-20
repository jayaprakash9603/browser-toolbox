import { useTranslation } from 'react-i18next'

import { KeyboardShortcutsEditor } from '@/app/pages/settings/KeyboardShortcutsEditor'
import { SettingsSubpageHeader } from '@/app/pages/settings/SettingsSubpageHeader'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'

export default function KeyboardShortcutsPage() {
  const { t } = useTranslation()
  useFocusTarget()

  return (
    <div className="h-full overflow-y-auto px-3 py-3 @[360px]:px-4">
      <SettingsSubpageHeader
        searchId="keyboardShortcuts"
        title={t('shortcuts.settingsTitle')}
        description={t('shortcuts.settingsDescription')}
      />
      <KeyboardShortcutsEditor showHeader={false} />
    </div>
  )
}
