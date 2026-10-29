import { SelectorStudioHubShell } from '@/features/selector-studio/components/SelectorStudioHubShell'
import '@/features/selector-studio/i18n'
import { createDevToolsClient } from '@/features/selector-studio/pageClient'
import { useSelectorStudio } from '@/features/selector-studio/useSelectorStudio'
import { useMemo } from 'react'

export default function DevToolsSelectorStudioSidebarPage() {
  const client = useMemo(() => createDevToolsClient(), [])
  const model = useSelectorStudio(client)
  return <SelectorStudioHubShell model={model} variant="pane" />
}
