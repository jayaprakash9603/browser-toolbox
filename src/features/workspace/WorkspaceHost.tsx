import { Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@/app/navigation'
import { toolRegistry } from '@/core/registry'
import { getSectionForTool } from '@/core/registry/sections'
import type { WorkspaceDefinition } from '@/core/registry/workspaces'
import { getToolName } from '@/i18n/toolLabels'
import { AppLoadingSkeleton } from '@/shared/components/AppLoadingSkeleton'
import { BackButton } from '@/shared/components/BackButton'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { WorkspaceContext } from './WorkspaceContext'

interface WorkspaceHostProps {
  workspace: WorkspaceDefinition
  activeToolId: string
  children: ReactNode
}

export function WorkspaceHost({ workspace, activeToolId, children }: WorkspaceHostProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const host = toolRegistry.get(workspace.id)
  if (!host) return <>{children}</>

  const HostIcon = host.icon
  const section = getSectionForTool(workspace.id)
  const activeView = workspace.views.find((view) => view.toolId === activeToolId)
  const hostName = getToolName(host, t)

  const openView = (key: string) => {
    const view = workspace.views.find((entry) => entry.key === key)
    const target = view && toolRegistry.get(view.toolId)
    if (target) navigate(target.route)
  }

  return (
    <WorkspaceContext.Provider value={workspace.id}>
      <div className="flex h-full flex-col" data-workspace={workspace.id}>
        <header className="flex shrink-0 items-center gap-2.5 px-3 pt-2 pb-1 @[360px]:px-4">
          <BackButton to={section ? `/categories/${section.id}` : '/'} />
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-sm">
            <HostIcon className="size-4 text-primary" aria-hidden />
          </div>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
            {hostName}
          </h1>
        </header>
        <nav
          aria-label={t('workspace.navigation', { defaultValue: '{{name}} sections', name: hostName })}
          className="shrink-0 border-b px-3 pb-2 @[360px]:px-4"
        >
          <Tabs value={activeView?.key ?? ''} onValueChange={openView} className="gap-0">
            <TabsList variant="chips">
              {workspace.views.map((view) => {
                const target = toolRegistry.get(view.toolId)
                const ViewIcon = view.icon ?? target?.icon
                return (
                  <TabsTrigger key={view.key} value={view.key}>
                    {ViewIcon && <ViewIcon aria-hidden />}
                    {t(`workspace.${workspace.id}.${view.key}`, { defaultValue: view.label })}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </nav>
        <div className="min-h-0 flex-1">
          <Suspense
            fallback={<AppLoadingSkeleton variant="tool" label={t('nav.loading')} />}
          >
            <div key={activeToolId} className="h-full">
              {children}
            </div>
          </Suspense>
        </div>
      </div>
    </WorkspaceContext.Provider>
  )
}
