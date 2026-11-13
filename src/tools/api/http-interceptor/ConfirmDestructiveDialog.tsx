import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

export function ConfirmDestructiveDialog({
  open,
  method,
  url,
  onCancel,
  onConfirm,
}: {
  open: boolean
  method: string
  url: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('interceptor.explorer.confirmTitle', { method })}</DialogTitle>
          <DialogDescription className="break-all">{t('interceptor.explorer.confirmBody', { url })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
            {t('interceptor.explorer.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
