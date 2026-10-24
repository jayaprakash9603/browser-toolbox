import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { ToolPage } from '@/shared/components/ToolPage'
import { TabsContent } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useFileTool } from '../_shared'
import { ArchivePanel } from './ArchivePanel'
import { ConvertPanel } from './ConvertPanel'
import { ImagesPdfPanel } from './ImagesPdfPanel'
import { InspectPanel } from './InspectPanel'
import { MODES, toQueueItems, type Mode, type QueueItem } from './modes'
import { ModeTiles, ToolkitHero } from './ToolkitChrome'
import { ViewPanel } from './ViewPanel'
import { WritePanel } from './WritePanel'

/** Tabs from the previous layout keep working in bookmarks and search results. */
const LEGACY_TABS = ['csv', 'json', 'text'] as const
const TAB_VALUES = [...MODES, ...LEGACY_TABS] as const

function toMode(tab: (typeof TAB_VALUES)[number]): Mode {
  return (LEGACY_TABS as readonly string[]).includes(tab) ? 'view' : (tab as Mode)
}

const PANEL_CLASS = 'mt-0 flex flex-col gap-3 data-[state=inactive]:hidden'

export default function FileToolkitTool() {
  const tool = useFileTool('files.file-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', TAB_VALUES, 'convert')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const mode = toMode(tab)

  return (
    <ToolPage tool={tool}>
      <TabsPrimitive.Root
        value={mode}
        onValueChange={(value) => setTab(value as Mode)}
        className="flex flex-col gap-3 @container"
      >
        <ToolkitHero mode={mode} />
        <ModeTiles value={mode} />

        <TabsContent value="convert" forceMount className={PANEL_CLASS}>
          <ConvertPanel queue={queue} onQueueChange={setQueue} />
        </TabsContent>
        <TabsContent value="write" forceMount className={PANEL_CLASS}>
          <WritePanel />
        </TabsContent>
        <TabsContent value="pdf" forceMount className={PANEL_CLASS}>
          <ImagesPdfPanel />
        </TabsContent>
        <TabsContent value="archive" forceMount className={PANEL_CLASS}>
          <ArchivePanel />
        </TabsContent>
        <TabsContent value="inspect" forceMount className={PANEL_CLASS}>
          <InspectPanel />
        </TabsContent>
        <TabsContent value="view" forceMount className={PANEL_CLASS}>
          <ViewPanel
            onConvert={(file) => {
              setQueue((current) => [...current, ...toQueueItems([file])])
              setTab('convert')
            }}
          />
        </TabsContent>
      </TabsPrimitive.Root>
    </ToolPage>
  )
}
