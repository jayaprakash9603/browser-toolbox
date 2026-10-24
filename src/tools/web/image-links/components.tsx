import { useState, type ComponentType, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  ImageOffIcon,
  TriangleAlertIcon,
  TypeIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  imageToHtml,
  imageToMarkdown,
  type ImageLinkItem,
} from '@/core/engines/imageLinks'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/utils/cn'

import { CHECKERBOARD, EASE, displayUrl, formatDims, typeLabel, type ImageItemActions } from './utils'

export function Thumb({
  url,
  alt,
  className,
  eager,
  onMeasure,
}: {
  url: string
  alt: string
  className?: string
  eager?: boolean
  onMeasure?: (width: number, height: number) => void
}) {
  const { t } = useTranslation()
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <span className={cn('relative block overflow-hidden', CHECKERBOARD, className)}>
      {state === 'loading' && <Skeleton className="absolute inset-0 rounded-none opacity-70" />}
      {state === 'error' ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOffIcon className="size-5" aria-hidden />
          <span className="text-[10px] font-medium">{t('imageLinks.previewFailed')}</span>
        </span>
      ) : (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            setState('loaded')
            onMeasure?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
          }}
          onError={() => setState('error')}
          className={cn(
            'absolute inset-0 size-full object-contain transition-opacity duration-300 motion-reduce:transition-none',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  )
}

export function AltInfo({ item, className }: { item: ImageLinkItem; className?: string }) {
  const { t } = useTranslation()
  if (item.altStatus === 'present') {
    return (
      <p className={cn('truncate text-[11px] text-muted-foreground', className)} title={item.alt ?? ''}>
        <TypeIcon className="mr-1 inline size-3 -translate-y-px" aria-hidden />
        {item.alt}
      </p>
    )
  }
  if (item.altStatus === 'missing') {
    return (
      <p
        className={cn(
          'flex items-center gap-1 truncate text-[11px] font-medium text-amber-700 dark:text-amber-400',
          className,
        )}
      >
        <TriangleAlertIcon className="size-3 shrink-0" aria-hidden />
        {t('imageLinks.altStatus.missing')}
      </p>
    )
  }
  return (
    <p className={cn('truncate text-[11px] text-muted-foreground/80 italic', className)}>
      {t(item.altStatus === 'decorative' ? 'imageLinks.altStatus.decorative' : `imageLinks.source.${item.source}`)}
    </p>
  )
}

function ItemMenu({ item, actions }: { item: ImageLinkItem; actions: ImageItemActions }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
          aria-label={t('imageLinks.moreActions', { name: item.name })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => actions.onPreview(item)}>
          <EyeIcon />
          {t('imageLinks.preview')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onDownload(item)}>
          <DownloadIcon />
          {t('imageLinks.download')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
          <ExternalLinkIcon />
          {t('imageLinks.openImage')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => actions.onCopy(item.url)}>
          <CopyIcon />
          {t('imageLinks.copyUrl')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!item.alt?.trim()} onSelect={() => actions.onCopy(item.alt ?? '')}>
          <TypeIcon />
          {t('imageLinks.copyAlt')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onCopy(imageToHtml(item))}>
          <CodeIcon />
          {t('imageLinks.copyHtml')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onCopy(imageToMarkdown(item))}>
          <FileTextIcon />
          {t('imageLinks.copyMarkdown')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SelectBox({
  item,
  selected,
  onToggle,
  className,
}: {
  item: ImageLinkItem
  selected: boolean
  onToggle: ImageItemActions['onToggle']
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Checkbox
      checked={selected}
      aria-label={t('imageLinks.selectImage', { name: item.name })}
      className={cn('size-[18px]', className)}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle(item, event.shiftKey)
      }}
    />
  )
}

function useItemMotion(index: number) {
  const reduce = useReducedMotion()
  if (reduce) return {}
  return {
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.32, ease: EASE, delay: Math.min(index % 60, 16) * 0.02 },
  }
}

export function ImageCard({
  item,
  index,
  selected,
  actions,
}: {
  item: ImageLinkItem
  index: number
  selected: boolean
  actions: ImageItemActions
}) {
  const { t } = useTranslation()
  const dims = formatDims(item.width, item.height)
  const motionProps = useItemMotion(index)

  return (
    <motion.li {...motionProps} className="min-w-0">
      <div
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          selected && 'ring-2 ring-primary/50',
        )}
      >
        <button
          type="button"
          onClick={() => actions.onPreview(item)}
          aria-label={t('imageLinks.previewOf', { name: item.name })}
          className="relative block aspect-[4/3] w-full shrink-0 cursor-zoom-in overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <Thumb
            url={item.url}
            alt=""
            className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            eager={index < 12}
            onMeasure={(w, h) => actions.onMeasure(item.url, w, h)}
          />
          <span className="absolute top-1.5 right-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-foreground shadow-xs backdrop-blur-sm">
            {typeLabel(item.type, t('imageLinks.typeOther'))}
          </span>
          <span
            className={cn(
              'absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums shadow-xs backdrop-blur-sm',
              dims ? 'bg-black/65 text-white' : 'bg-background/90 text-muted-foreground',
            )}
          >
            {dims ?? t('imageLinks.unknownSize')}
          </span>
          {item.altStatus === 'missing' && (
            <span
              className="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs"
              title={t('imageLinks.altStatus.missing')}
            >
              <TriangleAlertIcon className="size-3" aria-hidden />
            </span>
          )}
        </button>
        <span className="absolute top-1.5 left-1.5 flex rounded-md bg-background/90 p-1 shadow-xs backdrop-blur-sm">
          <SelectBox item={item} selected={selected} onToggle={actions.onToggle} />
        </span>
        <div className="flex min-w-0 items-start gap-1 px-2 pt-1.5 pb-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs leading-5 font-medium" title={item.url}>
              {item.name}
            </p>
            <AltInfo item={item} />
          </div>
          <ItemMenu item={item} actions={actions} />
        </div>
      </div>
    </motion.li>
  )
}

export function ImageRow({
  item,
  index,
  selected,
  actions,
}: {
  item: ImageLinkItem
  index: number
  selected: boolean
  actions: ImageItemActions
}) {
  const { t } = useTranslation()
  const dims = formatDims(item.width, item.height)
  const motionProps = useItemMotion(index)

  return (
    <motion.li
      {...motionProps}
      className={cn(
        'group flex min-w-0 items-center gap-2.5 rounded-xl border bg-card py-1.5 pr-1 pl-2 transition-[background-color,box-shadow] duration-150 hover:bg-accent/30',
        selected && 'bg-primary/5 ring-2 ring-primary/40 hover:bg-primary/10',
      )}
    >
      <SelectBox item={item} selected={selected} onToggle={actions.onToggle} />
      <button
        type="button"
        onClick={() => actions.onPreview(item)}
        aria-label={t('imageLinks.previewOf', { name: item.name })}
        className="relative size-14 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Thumb
          url={item.url}
          alt=""
          className="size-full"
          eager={index < 16}
          onMeasure={(w, h) => actions.onMeasure(item.url, w, h)}
        />
      </button>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-[13px] leading-5 font-medium" title={item.url}>
          {item.name}
        </p>
        <p className="truncate font-mono text-[11px] leading-4 text-muted-foreground" title={item.url}>
          {displayUrl(item.url)}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          <MetaChip>{typeLabel(item.type, t('imageLinks.typeOther'))}</MetaChip>
          <MetaChip mono muted={!dims}>
            {dims ?? t('imageLinks.unknownSize')}
          </MetaChip>
          <AltInfo item={item} className="min-w-0 flex-1" />
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <CopyButton text={item.url} label={t('imageLinks.copyUrl')} />
        <ItemMenu item={item} actions={actions} />
      </div>
    </motion.li>
  )
}

export function MetaChip({
  children,
  mono,
  muted,
}: {
  children: ReactNode
  mono?: boolean
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md border bg-muted/50 px-1.5 py-px text-[10px] leading-4 font-semibold tracking-wide whitespace-nowrap',
        mono && 'font-mono font-medium tracking-normal tabular-nums',
        muted ? 'text-muted-foreground' : 'text-foreground/80',
      )}
    >
      {children}
    </span>
  )
}

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={cn('relative inline-flex overflow-hidden tabular-nums', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? false : { y: '60%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: '-60%', opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export type StatTone = 'default' | 'warn' | 'ok' | 'muted'

const STAT_TONES: Record<StatTone, string> = {
  default: 'text-primary bg-primary/10',
  warn: 'text-amber-700 bg-amber-500/15 dark:text-amber-400',
  ok: 'text-emerald-700 bg-emerald-500/15 dark:text-emerald-400',
  muted: 'text-muted-foreground bg-muted',
}

export function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
  hint,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  tone: StatTone
  active: boolean
  onClick: () => void
  hint: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={hint}
      onClick={onClick}
      className={cn(
        'flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border bg-card px-2.5 py-2 text-left shadow-xs outline-none transition-[background-color,box-shadow] duration-150 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-primary/5 ring-2 ring-primary/40 hover:bg-primary/10',
      )}
    >
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', STAT_TONES[tone])}>
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <AnimatedNumber value={value} className="text-[15px] leading-5 font-semibold" />
        <span className="truncate text-[11px] leading-4 text-muted-foreground">{label}</span>
      </span>
    </button>
  )
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
          : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
      {count != null && (
        <span
          className={cn(
            'rounded-full px-1.5 text-[10px] leading-4 tabular-nums',
            active ? 'bg-primary/15' : 'bg-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  body?: string
  action?: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground ring-8 ring-muted/40">
        <Icon className="size-5" />
      </span>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      {body && <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  )
}

export function GridSkeleton({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border p-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-14 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-4/5" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 @[440px]:grid-cols-3 @[680px]:grid-cols-4 @[920px]:grid-cols-5" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-1.5 p-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
