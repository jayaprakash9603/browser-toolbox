import { SelectorStudioView } from '@/features/selector-studio/components/SelectorStudioView'
import '@/features/selector-studio/i18n'
import { createDevToolsClient } from '@/features/selector-studio/pageClient'
import { useSelectorStudio } from '@/features/selector-studio/useSelectorStudio'
import { useMemo } from 'react'

export default function DevToolsSelectorStudioPage() {
  const client = useMemo(() => createDevToolsClient(), [])
  const model = useSelectorStudio(client)
  return <SelectorStudioView model={model} compact />
}
