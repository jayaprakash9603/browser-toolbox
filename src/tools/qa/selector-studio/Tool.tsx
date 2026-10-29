import { SelectorStudioView } from '@/features/selector-studio/components/SelectorStudioView'
import '@/features/selector-studio/i18n'
import { createSidePanelClient } from '@/features/selector-studio/pageClient'
import { useSelectorStudio } from '@/features/selector-studio/useSelectorStudio'
import { ToolPage } from '@/shared/components/ToolPage'
import { useMemo } from 'react'

import { useQaTool } from '../_shared'

export default function SelectorStudioTool() {
  const tool = useQaTool('qa.selector-studio')
  const client = useMemo(() => createSidePanelClient(), [])
  const model = useSelectorStudio(client)

  return (
    <ToolPage tool={tool} contentClassName="p-0">
      <SelectorStudioView model={model} embedded />
    </ToolPage>
  )
}
