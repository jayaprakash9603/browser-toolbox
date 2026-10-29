import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { HubAttributesTable } from './HubAttributesTable'
import { HubSelectorFields } from './HubSelectorFields'
import { HubSettingsPanel } from './HubSettingsPanel'
import { HubSideRail } from './HubSideRail'
import { InspectPanel, type InspectSection } from './InspectPanel'
import { Playground } from './Playground'
import { SelectorStudioPanelView } from './SelectorStudioPanelView'
import {
  CodePanel,
  elementChip,
  filterHubCandidates,
  HistoryPanel,
  hostOf,
  HubEmpty,
  HubSelectorList,
  HUB_FULL_TABS,
  HUB_TABS,
  type HubTab,
  useHistoryNameState,
} from './studioHubContent'

const INSPECT_SECTIONS: InspectSection[] = ['styles', 'computed', 'listeners']

export function SelectorStudioView(props: {
  model: SelectorStudioModel
  compact?: boolean
  embedded?: boolean
  pane?: boolean
}) {
  if (props.embedded) return <SelectorStudioPanelView model={props.model} />
  return <SelectorStudioDevToolsView {...props} />
}

function SelectorStudioDevToolsView({
  model,
  compact = false,
  pane = false,
}: {
  model: SelectorStudioModel
  compact?: boolean
  pane?: boolean
}) {
  const { t } = useTranslation()
  const tabs = pane ? HUB_TABS : HUB_FULL_TABS
  const [tab, setTab] = useDeepLinkTab('tab', tabs, 'css')
  const [inspectSection, setInspectSection] = useDeepLinkTab('inspect', INSPECT_SECTIONS, 'styles')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playground, setPlayground] = useState(false)
  const [name, setName] = useHistoryNameState()
  const { snapshot } = model

  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.altKey && event.shiftKey)) return
    if (event.code === 'KeyP') {
      event.preventDefault()
      void model.pick()
    } else if (event.code === 'KeyY') {
      event.preventDefault()
      if (model.active) void navigator.clipboard.writeText(model.active.expression)
    } else if (event.code === 'KeyX') {
      event.preventDefault()
      setTab('xpath')
    } else if (event.code === 'KeyG') {
      event.preventDefault()
      setTab('css')
    } else if (event.code === 'Slash') {
      event.preventDefault()
      setPlayground(true)
    } else if (event.code === 'Backspace') {
      event.preventDefault()
      void model.clearSelection()
    }
  }

  return (
    <div
      className={cn('@container flex h-full min-h-0 outline-none', compact || pane ? 'p-1' : 'p-2')}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <HubSideRail
        model={model}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        onEdit={() => setPlayground(true)}
        onOpenHistory={() => setTab('history')}
        showHistory={!pane}
      />

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-1.5">
          <header className="shrink-0 space-y-1 border-b border-border/80 pb-1.5">
            <h1 className="truncate text-[12px] font-semibold tracking-tight">
              {pane ? t('studio.hub.titlePane') : t('studio.hub.title')}
            </h1>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {snapshot ? elementChip(snapshot) : t('studio.noElement')}
              {!pane && (
                <>
                  {' · '}
                  {hostOf(snapshot?.pageUrl || model.pageUrl)}
                </>
              )}
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pt-1.5">
            {model.picking && (
              <p role="status" aria-busy="true" className="mb-1.5 text-[11px] text-primary">
                {t('studio.pickProgress')}
              </p>
            )}
            {model.stale && !model.picking && (
              <p className="mb-1.5 text-[11px] text-muted-foreground">{t('studio.stale')}</p>
            )}
            {model.error && <p className="mb-1.5 text-[11px] text-destructive">{model.error}</p>}

            <HubSelectorFields model={model} />

            {playground && model.active && (
              <div className="mb-2">
                <Playground
                  candidate={model.active}
                  onValidate={model.validateExpression}
                  onReset={() => snapshot && void model.reanalyze()}
                />
              </div>
            )}

            <Tabs value={tab} onValueChange={(value) => setTab(value as HubTab)} className="gap-1.5">
              <TabsList variant="chips" scrollButtons="auto" className="h-auto w-full max-w-full justify-start gap-1">
                {tabs.map((id) => (
                  <TabsTrigger key={id} value={id} className="h-7 px-2.5 text-[10px]">
                    {t(`studio.tab.${id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="attributes" className="mt-1">
                {snapshot ? <HubAttributesTable snapshot={snapshot} /> : <HubEmpty />}
              </TabsContent>

              <TabsContent value="css" className="mt-1">
                <HubSelectorList
                  model={model}
                  items={filterHubCandidates(model.candidates, 'css', false)}
                />
              </TabsContent>

              <TabsContent value="xpath" className="mt-1">
                <HubSelectorList
                  model={model}
                  items={filterHubCandidates(model.candidates, 'xpath', false)}
                />
              </TabsContent>

              <TabsContent value="relCss" className="mt-1">
                <HubSelectorList
                  model={model}
                  items={filterHubCandidates(model.candidates, 'css', true)}
                />
              </TabsContent>

              <TabsContent value="relXpath" className="mt-1">
                <HubSelectorList
                  model={model}
                  items={filterHubCandidates(model.candidates, 'xpath', true)}
                />
              </TabsContent>

              <TabsContent value="code" className="mt-1">
                <CodePanel model={model} />
              </TabsContent>

              <TabsContent value="history" className="mt-1">
                <HistoryPanel model={model} name={name} setName={setName} compact />
              </TabsContent>

              <TabsContent value="inspect" className="mt-1">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1">
                    {INSPECT_SECTIONS.map((section) => (
                      <Button
                        key={section}
                        size="xs"
                        variant={inspectSection === section ? 'default' : 'outline'}
                        aria-pressed={inspectSection === section}
                        onClick={() => setInspectSection(section)}
                      >
                        {t(`studio.tab.${section}`)}
                      </Button>
                    ))}
                  </div>
                  <InspectPanel
                    inspect={model.elementInspect}
                    inspecting={model.inspecting}
                    section={inspectSection}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <p className="sr-only" role="status">
            {!model.picking &&
              (model.active ? model.active.expression : t('studio.noElement'))}
          </p>
        </div>

        {settingsOpen && (
          <aside className="w-44 shrink-0 overflow-y-auto border-l border-border/80 bg-muted/20 p-2 @[480px]:w-52">
            <HubSettingsPanel model={model} />
          </aside>
        )}
      </div>
    </div>
  )
}
