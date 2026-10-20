import type { InterceptorRule } from '@/core/interceptor'
import type { InterceptorTemplate } from '@/features/interceptor/templatesCatalog'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

import { RuleEditor } from './RuleEditor'

interface Props {
  template: InterceptorTemplate | null
  previewRules: InterceptorRule[]
  onClose: () => void
  onUse: () => void
}

export function TemplatePreviewDialog({ template, previewRules, onClose, onUse }: Props) {
  if (!template) return null
  const rule = previewRules[0]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name} (Preview Mode)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{template.description}</p>
        {previewRules.length > 1 && (
          <p className="text-xs text-muted-foreground">{previewRules.length} rules in this template</p>
        )}
        {rule && <RuleEditor rule={rule} onChange={() => undefined} readOnly />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" onClick={onUse}>Use this template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
