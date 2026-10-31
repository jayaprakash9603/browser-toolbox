import { useTranslation } from 'react-i18next'

import { WorkspaceLanding } from '@/features/workspace/WorkspaceLanding'

export default function WebToolkitTool() {
  const { t } = useTranslation()
  return (
    <WorkspaceLanding
      workspaceId="web.toolkit"
      note={t('workspace.web.note', {
        defaultValue:
          'Link checks run only when you start them and are limited in number. Pages that block cross-origin requests are reported as unverified, not as working.',
      })}
    />
  )
}
