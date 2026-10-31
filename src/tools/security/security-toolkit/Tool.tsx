import { useTranslation } from 'react-i18next'

import { WorkspaceLanding } from '@/features/workspace/WorkspaceLanding'

export default function SecurityToolkitTool() {
  const { t } = useTranslation()
  return (
    <WorkspaceLanding
      workspaceId="security.toolkit"
      note={t('workspace.security.note', {
        defaultValue:
          'Everything runs locally and nothing is sent anywhere. Decoding a JWT shows its contents but does not verify its signature.',
      })}
    />
  )
}
