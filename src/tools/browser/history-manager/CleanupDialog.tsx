import { useTranslation } from 'react-i18next'

import { rangeBounds, type HistoryRangePreset } from '@/core/history-manager'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

interface CleanupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleteRange: (preset: HistoryRangePreset) => void
  onDeleteAll: () => void
}

export function CleanupDialog({ open, onOpenChange, onDeleteRange, onDeleteAll }: CleanupDialogProps) {
  const { t } = useTranslation()
  const presets: HistoryRangePreset[] = ['today', '7d', '30d']
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('historyManager.cleanup.title')}</DialogTitle>
          <DialogDescription>
            {t('historyManager.cleanup.body')}
            <span className="mt-2 block text-xs">{t('historyManager.cleanup.rangeNote')}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {presets.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => {
                onDeleteRange(preset)
                onOpenChange(false)
              }}
            >
              {preset === 'today' && t('historyManager.cleanup.today')}
              {preset === '7d' && t('historyManager.cleanup.7d')}
              {preset === '30d' && t('historyManager.cleanup.30d')}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => {
              onDeleteAll()
              onOpenChange(false)
            }}
          >
            {t('historyManager.cleanup.all')}
          </Button>
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}

interface DeleteConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
}

export function DeleteConfirmDialog({ open, onOpenChange, title, description, onConfirm }: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      destructive
      onConfirm={onConfirm}
    />
  )
}

export function deleteRangeFromPreset(preset: HistoryRangePreset): { startTime: number; endTime: number } {
  return rangeBounds(preset)
}
