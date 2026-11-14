import { SelectorStudioHubShell } from '@/features/selector-studio/components/SelectorStudioHubShell'
import '@/features/selector-studio/i18n'
import { createDevToolsClient } from '@/features/selector-studio/pageClient'
import { useSelectorStudio } from '@/features/selector-studio/useSelectorStudio'
import { useMemo } from 'react'

export default function DevToolsSelectorStudioSidebarPage() {
  const client = useMemo(() => createDevToolsClient(), [])
  const model = useSelectorStudio(client)
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <SelectorStudioHubShell model={model} variant="pane" />
    </div>
  )
}
