import { useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'

import { useSitesTool } from '../_shared'
import { ScriptStudioLoadingSkeleton } from './components/ScriptStudioLoadingSkeleton'
import { ScriptStudioWorkspace } from './components/ScriptStudioWorkspace'
import { PANEL_TABS, type StudioTab } from './components/workspaceTabs'
import { useActiveTabUrl } from './hooks/useActiveTabUrl'
import { useScriptStudio } from './hooks/useScriptStudio'

export default function ScriptStudioTool() {
  const tool = useSitesTool('sites.script-studio')
  const url = useActiveTabUrl()
  const ss = useScriptStudio()
  const [tab, setTab] = useDeepLinkTab('tab', PANEL_TABS, 'thisPage')
  const [editId, setEditId] = useState<string | null>(null)

  const openDashboard = () => {
    const hash = editId && tab === 'editor' ? `#/edit/${editId}` : ''
    void chrome.tabs.create({ url: chrome.runtime.getURL(`script-studio.html${hash}`) })
  }

  return (
    <ToolPage tool={tool}>
      {ss.loading || !ss.index || !ss.settings ? (
        <ScriptStudioLoadingSkeleton variant="panel" />
      ) : (
        <ScriptStudioWorkspace
          studio={ss}
          surface="panel"
          tab={tab}
          onTabChange={(next: StudioTab) => setTab(next as (typeof PANEL_TABS)[number])}
          editId={editId}
          onEdit={(id) => {
            setEditId(id)
            setTab('editor')
          }}
          url={url}
          onOpenDashboard={openDashboard}
        />
      )}
    </ToolPage>
  )
}
