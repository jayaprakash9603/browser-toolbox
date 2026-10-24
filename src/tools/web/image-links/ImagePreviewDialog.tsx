import { useState, type ReactNode, type Ref } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImageOffIcon,
  TypeIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { imageToHtml, type ImageLinkItem } from '@/core/engines/imageLinks'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

import { AltInfo } from './components'
import { CHECKERBOARD, EASE, formatDims, typeLabel, type ImageItemActions } from './utils'

type Zoom = 'fit' | 'actual'

function PreviewImage({
  ref,
  item,
  zoom,
  direction,
  onMeasure,
}: {
  ref?: Ref<HTMLDivElement>
  item: ImageLinkItem
  zoom: Zoom
  direction: number
  onMeasure: ImageItemActions['onMeasure']
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const offset = reduce ? 0 : direction * 28

  return (
    <motion.div
      ref={ref}
      className={cn('flex size-full', zoom === 'fit' ? 'items-center justify-center p-3' : 'items-start justify-start')}
      initial={{ opacity: 0, x: offset }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -offset }}
      transition={{ duration: 0.22, ease: EASE }}
    >
      {failed ? (
        <span className="m-auto flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOffIcon className="size-8" aria-hidden />
          <span className="text-xs font-medium">{t('imageLinks.previewFailed')}</span>
        </span>
      ) : (
        <img
          src={item.url}
          alt={item.alt ?? ''}
          draggable={false}
          onLoad={(event) => onMeasure(item.url, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
          onError={() => setFailed(true)}
          className={cn(
            'select-none',
            zoom === 'fit' ? 'max-h-full max-w-full object-contain drop-shadow-sm' : 'max-w-none',
          )}
        />
      )}
    </motion.div>
  )
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

export function ImagePreviewDialog({
  items,
  index,
  onIndexChange,
  onClose,
  isSelected,
  actions,
}: {
  items: ImageLinkItem[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  isSelected: (url: string) => boolean
  actions: ImageItemActions
}) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState<Zoom>('fit')
  const [direction, setDirection] = useState(0)
  const item = index != null ? items[index] : undefined
  const many = items.length > 1

  const go = (delta: number) => {
    if (index == null || !many) return
    setDirection(delta)
    onIndexChange((index + delta + items.length) % items.length)
  }

  const dims = item ? formatDims(item.width, item.height) : null
  const selected = item ? isSelected(item.url) : false

  return (
    <Dialog open={item != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-3 overflow-y-auto p-3 sm:p-4"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            go(1)
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault()
            go(-1)
          }
        }}
      >
        {item && (
          <>
            <DialogHeader className="min-w-0 pr-8">
              <DialogTitle className="truncate text-sm" title={item.url}>
                {item.name}
              </DialogTitle>
              <DialogDescription className="text-xs tabular-nums">
                {t('imageLinks.position', { current: (index ?? 0) + 1, total: items.length })}
                {' · '}
                {typeLabel(item.type, t('imageLinks.typeOther'))}
                {dims ? ` · ${dims}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className={cn('relative overflow-hidden rounded-lg border', CHECKERBOARD)}>
              <div className={cn('h-[min(52vh,440px)]', zoom === 'actual' && 'overflow-auto overscroll-contain')}>
                <AnimatePresence initial={false} mode="popLayout">
                  <PreviewImage
                    key={item.url}
                    item={item}
                    zoom={zoom}
                    direction={direction}
                    onMeasure={actions.onMeasure}
                  />
                </AnimatePresence>
              </div>
              {many && (
                <>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur-sm"
                    onClick={() => go(-1)}
                    aria-label={t('imageLinks.previous')}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur-sm"
                    onClick={() => go(1)}
                    aria-label={t('imageLinks.next')}
                  >
                    <ChevronRightIcon />
                  </Button>
                </>
              )}
              <Segmented
                size="sm"
                value={zoom}
                onValueChange={setZoom}
                ariaLabel={t('imageLinks.preview')}
                className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm"
                options={[
                  { value: 'fit', label: t('imageLinks.fit') },
                  { value: 'actual', label: t('imageLinks.actualSize') },
                ]}
              />
            </div>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
              <MetaRow label={t('imageLinks.metaSize')}>
                <span className="font-mono tabular-nums">{dims ?? t('imageLinks.unknownSize')}</span>
              </MetaRow>
              <MetaRow label={t('imageLinks.metaSource')}>{t(`imageLinks.source.${item.source}`)}</MetaRow>
              <MetaRow label={t('imageLinks.metaAlt')}>
                {item.altStatus === 'present' ? (
                  <span className="break-words">{item.alt}</span>
                ) : (
                  <AltInfo item={item} />
                )}
              </MetaRow>
              <MetaRow label={t('imageLinks.metaUrl')}>
                <span className="line-clamp-2 font-mono text-[11px] break-all text-muted-foreground" title={item.url}>
                  {item.url}
                </span>
              </MetaRow>
            </dl>

            <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
              <Button
                variant={selected ? 'secondary' : 'outline'}
                size="xs"
                aria-pressed={selected}
                onClick={() => actions.onToggle(item, false)}
              >
                {selected && <CheckIcon />}
                {selected ? t('imageLinks.selected') : t('imageLinks.select')}
              </Button>
              <span className="flex-1" />
              <Button variant="ghost" size="xs" onClick={() => actions.onCopy(item.url)}>
                <CopyIcon />
                {t('imageLinks.copyUrl')}
              </Button>
              {item.alt?.trim() && (
                <Button variant="ghost" size="xs" onClick={() => actions.onCopy(item.alt ?? '')}>
                  <TypeIcon />
                  {t('imageLinks.copyAlt')}
                </Button>
              )}
              <Button variant="ghost" size="xs" onClick={() => actions.onCopy(imageToHtml(item))}>
                <CodeIcon />
                <span className="sr-only sm:not-sr-only">{t('imageLinks.copyHtml')}</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                aria-label={t('imageLinks.openImage')}
              >
                <ExternalLinkIcon />
              </Button>
              <Button size="xs" onClick={() => actions.onDownload(item)}>
                <DownloadIcon />
                {t('imageLinks.download')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
