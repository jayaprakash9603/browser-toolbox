import {
  Code2Icon,
  CrosshairIcon,
  HistoryIcon,
  LayoutGridIcon,
  Loader2Icon,
  SparklesIcon,
} from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { HubAttributesTable } from './HubAttributesTable'
import { HubSelectorFields } from './HubSelectorFields'
import { PanelSettingsSidebar } from './PanelSettingsSidebar'
import { Playground } from './Playground'
import {
  CodePanel,
  elementChip,
  filterHubCandidates,
  HistoryPanel,
  hostOf,
  HubEmpty,
  HubSelectorList,
  HUB_TABS,
  useHistoryNameState,
} from './studioHubContent'

type PanelWorkspaceTab = (typeof HUB_TABS)[number]

const PANEL_SECTIONS = ['workspace', 'history', 'code'] as const
type PanelSection = (typeof PANEL_SECTIONS)[number]

export function SelectorStudioPanelView({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()
  const [section, setSection] = useState<PanelSection>('workspace')
  const [tab, setTab] = useDeepLinkTab('tab', HUB_TABS, 'css')
  const [playground, setPlayground] = useState(false)
  const [name, setName] = useHistoryNameState()
  const { snapshot, settings } = model
  const disabled = !settings.enabled

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled || !(event.altKey && event.shiftKey)) return
    if (event.code === 'KeyP') {
      event.preventDefault()
      void model.pick()
    } else if (event.code === 'KeyY') {
      event.preventDefault()
      if (model.active) void navigator.clipboard.writeText(model.active.expression)
    } else if (event.code === 'Slash') {
      event.preventDefault()
      setPlayground(true)
    }
  }

  const pickLabel = model.picking ? t('studio.cancelPick') : t('studio.pick')

  return (
    <div
      className="@container flex h-full min-h-0 outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-border/80 bg-muted/10 @[480px]:w-56">
        <div className="border-b border-border/60 px-3 py-3">
          <p className="text-sm font-semibold tracking-tight">{t('studio.hub.title')}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {hostOf(snapshot?.pageUrl || model.pageUrl)}
          </p>
          {snapshot && (
            <Badge variant="secondary" className="mt-2 max-w-full truncate font-mono text-[10px]">
              {elementChip(snapshot)}
            </Badge>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 p-2" aria-label={t('studio.panel.navLabel')}>
          {(
            [
              { id: 'workspace' as const, icon: LayoutGridIcon, label: t('studio.panel.nav.workspace') },
              { id: 'history' as const, icon: HistoryIcon, label: t('studio.panel.nav.history') },
              { id: 'code' as const, icon: Code2Icon, label: t('studio.panel.nav.code') },
            ] as const
          ).map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <Button
                key={item.id}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                className="h-9 justify-start gap-2 px-2.5 text-xs font-medium"
                aria-current={active ? 'page' : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Button>
            )
          })}
        </nav>

        <div className="mt-auto max-h-[min(52vh,28rem)] overflow-y-auto border-t border-border/60 p-3">
          <PanelSettingsSidebar model={model} />
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {disabled && (
          <div
            role="status"
            className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-950 dark:text-amber-100"
          >
            {t('studio.panel.disabledBanner')}
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
          <Button
            size="sm"
            disabled={disabled}
            variant={model.picking ? 'secondary' : 'default'}
            onClick={() => void model.pick()}
          >
            <CrosshairIcon className="size-4" aria-hidden />
            {pickLabel}
          </Button>
          <Button size="sm" variant="outline" disabled={disabled || !snapshot} onClick={() => void model.reanalyze()}>
            {model.analyzing ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <SparklesIcon className="size-4" aria-hidden />
            )}
            {t('studio.refresh')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || !model.active}
            onClick={() => model.active && void model.highlight(model.active)}
          >
            {t('studio.highlight')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || !model.active}
            onClick={() => setPlayground(true)}
          >
            {t('studio.edit')}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {model.picking && (
            <p role="status" aria-busy="true" className="mb-3 text-sm text-primary">
              {t('studio.pickProgress')}
            </p>
          )}
          {model.stale && !model.picking && (
            <p className="mb-3 text-sm text-muted-foreground">{t('studio.stale')}</p>
          )}
          {model.error && <p className="mb-3 text-sm text-destructive">{model.error}</p>}

          {section === 'workspace' && (
            <div className="flex flex-col gap-4">
              <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('studio.hub.selectorFields')}
                </p>
                <div className={cn(disabled && 'pointer-events-none opacity-50')}>
                  <HubSelectorFields model={model} />
                </div>
              </section>

              {playground && model.active && (
                <section className="rounded-xl border border-border/70 p-4">
                  <Playground
                    candidate={model.active}
                    onValidate={model.validateExpression}
                    onReset={() => snapshot && void model.reanalyze()}
                  />
                </section>
              )}

              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as PanelWorkspaceTab)}
                className={cn('gap-3', disabled && 'pointer-events-none opacity-50')}
              >
                <TabsList variant="underline" className="h-auto w-full justify-start">
                  {HUB_TABS.map((id) => (
                    <TabsTrigger key={id} value={id} className="text-xs">
                      {t(`studio.tab.${id}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="attributes">
                  {snapshot ? <HubAttributesTable snapshot={snapshot} /> : <HubEmpty />}
                </TabsContent>
                <TabsContent value="css">
                  <HubSelectorList model={model} items={filterHubCandidates(model.candidates, 'css', false)} />
                </TabsContent>
                <TabsContent value="xpath">
                  <HubSelectorList model={model} items={filterHubCandidates(model.candidates, 'xpath', false)} />
                </TabsContent>
                <TabsContent value="relCss">
                  <HubSelectorList model={model} items={filterHubCandidates(model.candidates, 'css', true)} />
                </TabsContent>
                <TabsContent value="relXpath">
                  <HubSelectorList model={model} items={filterHubCandidates(model.candidates, 'xpath', true)} />
                </TabsContent>
                <TabsContent value="code">
                  <CodePanel model={model} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {section === 'history' && (
            <HistoryPanel model={model} name={name} setName={setName} />
          )}

          {section === 'code' && <CodePanel model={model} />}
        </div>

        <p className="sr-only" role="status">
          {!model.picking && (model.active ? model.active.expression : t('studio.noElement'))}
        </p>
      </main>
    </div>
  )
}
