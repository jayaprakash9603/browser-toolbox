import type { ReactNode } from 'react'
import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { toolRegistry } from '@/core/registry'
import { getWorkspace } from '@/core/registry/workspaces'
import { getToolDescription, getToolName } from '@/i18n/toolLabels'
import { ToolPage } from '@/shared/components/ToolPage'

interface WorkspaceLandingProps {
  workspaceId: string
  note?: ReactNode
  children?: ReactNode
}

export function WorkspaceLanding({ workspaceId, note, children }: WorkspaceLandingProps) {
  const { t } = useTranslation()
  const host = toolRegistry.get(workspaceId)
  const workspace = getWorkspace(workspaceId)
  if (!host || !workspace) return null

  const entries = workspace.views.filter((view) => view.toolId !== workspaceId)

  return (
    <ToolPage tool={host}>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {getToolDescription(host, t)}
      </p>
      {children}
      <ul className="grid grid-cols-1 gap-2 @[360px]:grid-cols-2">
        {entries.map((view) => {
          const target = toolRegistry.get(view.toolId)
          if (!target) return null
          const Icon = view.icon ?? target.icon
          return (
            <li key={view.key} className="min-w-0">
              <Link
                to={target.route}
                className="group flex h-full items-start gap-2.5 rounded-xl border bg-card p-3 outline-none transition-colors hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
                  <Icon aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold">
                    {t(`workspace.${workspaceId}.${view.key}`, { defaultValue: view.label })}
                  </span>
                  <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {getToolDescription(target, t)}
                  </span>
                  <span className="sr-only">{getToolName(target, t)}</span>
                </span>
                <ArrowUpRightIcon
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                />
              </Link>
            </li>
          )
        })}
      </ul>
      {note && <p className="mt-3 text-[11px] leading-4 text-muted-foreground">{note}</p>}
    </ToolPage>
  )
}
