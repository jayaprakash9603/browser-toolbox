import { useTranslation } from 'react-i18next'

import { KeyboardShortcutsEditor } from '@/app/pages/settings/KeyboardShortcutsEditor'
import { BackButton } from '@/shared/components/BackButton'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'

export default function KeyboardShortcutsPage() {
  const { t } = useTranslation()
  useFocusTarget()

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <BackButton to="/settings" />
      </div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('settings.title')}
      </p>
      <KeyboardShortcutsEditor />
    </div>
  )
}
