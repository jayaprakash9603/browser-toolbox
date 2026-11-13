import { useTranslation } from 'react-i18next'

import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { ToolPage } from '@/shared/components/ToolPage'

import { useProductivityTool } from '../_shared'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import './i18n'
import { useBookmarkWorkspace } from './useBookmarkWorkspace'
import { WorkspaceShell } from './WorkspaceShell'

export default function BookmarksTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.bookmarks')
  const granted = usePermissionGranted({ permissions: ['bookmarks'] })
  const model = useBookmarkWorkspace(granted === true)
  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <PermissionNotice
        active
        permissions={['bookmarks']}
        origins={[]}
        message={t('bookmarks.permission')}
      />
      <WorkspaceShell model={model} granted={granted === true} />
    </ToolPage>
  )
}
