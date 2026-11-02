import { useTranslation } from 'react-i18next'

import CategoryDemoPlayer from '@/app/pages/category/CategoryDemoPlayer'
import { DEMO_COMPONENTS } from '@/app/demos/loader'
import { toolRegistry, type ToolDefinition } from '@/core/registry'
import { getWorkspace } from '@/core/registry/workspaces'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

export default function ToolDemoDialog({
  tool,
  onOpenChange,
}: {
  tool: ToolDefinition
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { name } = useToolLabels(tool)
  const views = getWorkspace(tool.id)?.views ?? []
  const demos = DEMO_COMPONENTS[tool.id]
    ? [tool]
    : views
        .map((view) => toolRegistry.get(view.toolId))
        .filter((view): view is ToolDefinition => !!view && !!DEMO_COMPONENTS[view.id])
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="@container max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-3xl overflow-y-auto rounded-2xl">
        <DialogHeader className="pr-6">
          <DialogTitle>{t('tool.demoTitle', { name })}</DialogTitle>
          <DialogDescription>{t('tool.demoHint')}</DialogDescription>
        </DialogHeader>
        <CategoryDemoPlayer
          tools={demos.length ? demos : [tool]}
          onOpenTool={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
