import { BookmarkIcon, DownloadIcon, FolderOpenIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { downloadBlob } from '@/features/netmon/download'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { GENERATOR_BY_ID } from './catalog'
import { toSelector } from './generators'
import { buildStylesheet, savedCss, type SavedStyle } from './library'

interface LibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: SavedStyle[]
  onLoad: (item: SavedStyle) => void
  onEdit: (id: string, patch: Partial<Pick<SavedStyle, 'name' | 'className'>>) => void
  onRemove: (id: string) => void
}

export function LibraryDialog({ open, onOpenChange, items, onLoad, onEdit, onRemove }: LibraryDialogProps) {
  const { t, i18n } = useTranslation()
  const stylesheet = open && items.length ? buildStylesheet(items) : ''
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(40rem,calc(100vh-2rem))] max-w-[min(32rem,calc(100vw-2rem))] flex-col outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('css.library.title')}
            <Badge variant="secondary" className="tabular-nums">
              {items.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>{t('css.library.description')}</DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BookmarkIcon className="size-5" />
            </span>
            <p className="text-sm font-medium">{t('css.library.emptyTitle')}</p>
            <p className="max-w-64 text-xs text-muted-foreground">{t('css.library.emptyText')}</p>
          </div>
        ) : (
          <ul className="-mx-1 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 py-0.5">
            {items.map((item) => {
              const def = GENERATOR_BY_ID[item.generator]
              const Icon = def.icon
              return (
                <li key={item.id} className="flex flex-col gap-2 rounded-lg border bg-card p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary" title={t(`css.gen.${item.generator}`)}>
                      <Icon className="size-4" />
                    </span>
                    <Input
                      aria-label={t('css.library.name')}
                      value={item.name}
                      maxLength={60}
                      onChange={(event) => onEdit(item.id, { name: event.target.value })}
                      className="h-8 min-w-0 flex-1 text-sm font-medium"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => onRemove(item.id)} aria-label={t('css.library.delete', { name: item.name })}>
                      <Trash2Icon />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-32 flex-1">
                      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center font-mono text-xs text-muted-foreground">.</span>
                      <Input
                        aria-label={t('css.library.className')}
                        value={item.className}
                        maxLength={48}
                        spellCheck={false}
                        onChange={(event) => onEdit(item.id, { className: event.target.value })}
                        onBlur={() => onEdit(item.id, { className: toSelector(item.className).slice(1) })}
                        className="h-7 pl-3.5 font-mono text-xs"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t(`css.gen.${item.generator}`)} · {date.format(item.savedAt)}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <CopyButton text={savedCss(item)} size="xs" />
                      <Button variant="outline" size="xs" onClick={() => onLoad(item)}>
                        <FolderOpenIcon /> {t('css.library.open')}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {items.length > 0 && (
          <DialogFooter className="flex-row flex-wrap justify-end gap-2 border-t pt-3">
            <CopyButton text={stylesheet} size="sm" label={t('css.library.copyAll')} />
            <Button size="sm" onClick={() => downloadBlob(new Blob([stylesheet], { type: 'text/css' }), 'styles.css')}>
              <DownloadIcon /> {t('css.library.download')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
