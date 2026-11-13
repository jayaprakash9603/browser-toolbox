import './i18n'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { ToolPage } from '@/shared/components/ToolPage'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { TabsContent } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useFileTool } from '../_shared'
import { MODES, toQueueItems, type Mode, type QueueItem } from './modes'
import { ModeTiles, ToolkitHero } from './ToolkitChrome'

const ArchivePanel = lazy(() => import('./ArchivePanel').then((m) => ({ default: m.ArchivePanel })))
const ConvertPanel = lazy(() => import('./ConvertPanel').then((m) => ({ default: m.ConvertPanel })))
const ImagesPdfPanel = lazy(() => import('./ImagesPdfPanel').then((m) => ({ default: m.ImagesPdfPanel })))
const InspectPanel = lazy(() => import('./InspectPanel').then((m) => ({ default: m.InspectPanel })))
const ViewPanel = lazy(() => import('./ViewPanel').then((m) => ({ default: m.ViewPanel })))
const WritePanel = lazy(() => import('./WritePanel').then((m) => ({ default: m.WritePanel })))

/** Tabs from the previous layout keep working in bookmarks and search results. */
const LEGACY_TABS = ['csv', 'json', 'text'] as const
const TAB_VALUES = [...MODES, ...LEGACY_TABS] as const

function toMode(tab: (typeof TAB_VALUES)[number]): Mode {
  return (LEGACY_TABS as readonly string[]).includes(tab) ? 'view' : (tab as Mode)
}

export default function FileToolkitTool() {
  const tool = useFileTool('files.file-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', TAB_VALUES, 'convert')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const mode = toMode(tab)
  const [visited, setVisited] = useState<ReadonlySet<Mode>>(() => new Set([mode]))
  if (!visited.has(mode)) setVisited(new Set(visited).add(mode))

  // Panels mount on first visit and then stay mounted so queued files and settings survive tab switches.
  const panel = (value: Mode, content: ReactNode) => (
    <TabsContent value={value} forceMount className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
      {visited.has(value) ? <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>{content}</Suspense> : null}
    </TabsContent>
  )

  return (
    <ToolPage tool={tool}>
      <TabsPrimitive.Root
        value={mode}
        onValueChange={(value) => setTab(value as Mode)}
        className="flex flex-col gap-3 @container"
      >
        <ToolkitHero mode={mode} />
        <ModeTiles value={mode} />

        {panel('convert', <ConvertPanel queue={queue} onQueueChange={setQueue} />)}
        {panel('write', <WritePanel />)}
        {panel('pdf', <ImagesPdfPanel />)}
        {panel('archive', <ArchivePanel />)}
        {panel('inspect', <InspectPanel />)}
        {panel(
          'view',
          <ViewPanel
            onConvert={(file) => {
              setQueue((current) => [...current, ...toQueueItems([file])])
              setTab('convert')
            }}
          />,
        )}
      </TabsPrimitive.Root>
    </ToolPage>
  )
}
