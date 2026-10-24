import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ChevronDownIcon,
  CircleCheckIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileDownIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImagesIcon,
  LinkIcon,
  Settings2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { applyFilenameTemplate } from '@/core/engines/imageDownloader'
import type { ImageLinksExportFormat } from '@/core/engines/imageLinks'
import type { ImageDownloadJob } from '@/core/imageDownloadJob'
import type { ImageLinksSettings } from '@/core/imageLinks/settings'
import { LongTaskProgress } from '@/shared/components/LongTaskProgress'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { EASE } from './utils'

export interface ActionNotice {
  id: number
  text: string
  tone: 'ok' | 'warn'
}

const EXPORT_FORMATS: { format: ImageLinksExportFormat; icon: typeof FileTextIcon }[] = [
  { format: 'csv', icon: FileSpreadsheetIcon },
  { format: 'json', icon: FileJsonIcon },
  { format: 'txt', icon: LinkIcon },
  { format: 'markdown', icon: FileTextIcon },
  { format: 'html', icon: CodeIcon },
]

function DownloadOptions({
  settings,
  onChange,
  pageUrl,
  zipName,
}: {
  settings: ImageLinksSettings
  onChange: (patch: Partial<ImageLinksSettings>) => void
  pageUrl: string
  zipName: string
}) {
  const { t } = useTranslation()
  const example = applyFilenameTemplate(settings.filenameTemplate || '{name}-{index}', {
    index: 1,
    url: 'https://example.com/images/hero-banner.jpg',
    pageUrl,
    pageTitle: '',
    ext: 'jpg',
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('imageLinks.downloadOptions')}
          title={t('imageLinks.downloadOptions')}
          className="shrink-0 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
        >
          <Settings2Icon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 max-w-[calc(100vw-1.5rem)] space-y-3 p-3">
        <p className="text-sm font-semibold">{t('imageLinks.downloadOptions')}</p>
        <div className="space-y-1.5">
          <Label htmlFor="image-links-folder" className="text-xs">
            {t('imageLinks.folder')}
          </Label>
          <Input
            id="image-links-folder"
            className="h-8 font-mono text-xs"
            value={settings.subfolderTemplate}
            onChange={(event) => onChange({ subfolderTemplate: event.target.value })}
            placeholder="Images/{host}"
            spellCheck={false}
          />
          <p className="text-[11px] leading-snug text-muted-foreground">{t('imageLinks.folderHint')}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="image-links-filename" className="text-xs">
            {t('imageLinks.fileName')}
          </Label>
          <Input
            id="image-links-filename"
            className="h-8 font-mono text-xs"
            value={settings.filenameTemplate}
            onChange={(event) => onChange({ filenameTemplate: event.target.value })}
            placeholder="{name}-{index}"
            spellCheck={false}
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            {t('imageLinks.fileNameHint')}{' '}
            <span className="font-mono text-foreground/80">{t('imageLinks.fileNamePreview', { name: example })}</span>
          </p>
        </div>
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-2.5">
          <Label htmlFor="image-links-manifest" className="text-xs leading-snug font-normal">
            {t('imageLinks.includeManifest')}
          </Label>
          <Switch
            id="image-links-manifest"
            checked={settings.includeManifest}
            onCheckedChange={(checked) => onChange({ includeManifest: checked })}
          />
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={zipName}>
          {t('imageLinks.zipName', { name: zipName })}
        </p>
      </PopoverContent>
    </Popover>
  )
}

export function ActionBar({
  scopeCount,
  scopeIsSelection,
  disabled,
  notice,
  job,
  jobIsOurs,
  jobError,
  onDismissJob,
  onCancelJob,
  onCopyUrls,
  onExport,
  onDownload,
  settings,
  onSettingsChange,
  pageUrl,
  zipName,
}: {
  scopeCount: number
  scopeIsSelection: boolean
  disabled: boolean
  notice: ActionNotice | null
  job: ImageDownloadJob | null
  jobIsOurs: boolean
  jobError: string | null
  onDismissJob: () => void
  onCancelJob: () => void
  onCopyUrls: () => void
  onExport: (format: ImageLinksExportFormat) => void
  onDownload: (mode: 'zip' | 'files') => void
  settings: ImageLinksSettings
  onSettingsChange: (patch: Partial<ImageLinksSettings>) => void
  pageUrl: string
  zipName: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const running = job?.status === 'running'
  const progress = job?.progress
  const finished = jobIsOurs && job && job.status !== 'running' && job.status !== 'cancelled'
  const slide = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } }

  const caption = scopeIsSelection
    ? t('imageLinks.scopeSelected', { count: scopeCount })
    : t('imageLinks.scopeShown', { count: scopeCount })

  return (
    <div className="sticky bottom-0 z-20 mt-auto border-t bg-background/90 px-[var(--density-page-pad)] py-2 shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.25)] backdrop-blur-md">
      <AnimatePresence initial={false}>
        {(finished || jobError) && !running && (
          <motion.div
            key="job-result"
            {...slide}
            transition={{ duration: 0.2, ease: EASE }}
            className={cn(
              'mb-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs',
              jobError || job?.status === 'error'
                ? 'bg-destructive/10 text-destructive'
                : job && job.failedUrls.length > 0
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            )}
            role="status"
          >
            {jobError || job?.status === 'error' ? (
              <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <CircleCheckIcon className="size-3.5 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate">
              {jobError || job?.status === 'error'
                ? t('imageLinks.jobError', { error: jobError ?? job?.error ?? '' })
                : [
                    t('imageLinks.jobDone', { count: job?.progress.done ?? 0 }),
                    job && job.failedUrls.length > 0 ? t('imageLinks.jobFailed', { count: job.failedUrls.length }) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="-my-1 size-6 shrink-0 text-current hover:bg-transparent hover:opacity-80"
              onClick={onDismissJob}
              aria-label={t('imageLinks.dismiss')}
            >
              <XIcon />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {running && progress ? (
          <motion.div key="progress" {...slide} transition={{ duration: 0.2, ease: EASE }}>
            <LongTaskProgress
              active
              title={job.mode === 'zip' ? t('imageLinks.zipping') : t('imageLinks.downloading')}
              percent={progress.total ? Math.round((progress.done / progress.total) * 100) : null}
              detail={t('imageLinks.progress', {
                done: progress.done,
                total: progress.total,
                failed: progress.failed,
              })}
              detailKey={`${progress.done}-${progress.total}`}
              startedAt={job.startedAt}
              centerIcon={job.mode === 'zip' ? FileArchiveIcon : DownloadIcon}
              flyingIcons={[ImagesIcon]}
              layout="compact"
              onCancel={onCancelJob}
            />
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            {...slide}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex items-center gap-1.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold tabular-nums">{caption}</p>
              <div className="relative h-4 overflow-hidden" role="status" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={notice?.id ?? 'idle'}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className={cn(
                      'flex items-center gap-1 truncate text-[11px] leading-4',
                      notice?.tone === 'warn'
                        ? 'text-amber-700 dark:text-amber-400'
                        : notice
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {notice && <CircleCheckIcon className="size-3 shrink-0" aria-hidden />}
                    <span className="truncate">{notice?.text ?? zipName}</span>
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0 px-2.5"
              disabled={disabled}
              onClick={onCopyUrls}
              aria-label={t('imageLinks.copyUrls')}
              title={t('imageLinks.copyUrls')}
            >
              <CopyIcon />
              <span className="hidden @[520px]:inline">{t('imageLinks.copyUrls')}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 px-2.5"
                  disabled={disabled}
                  aria-label={t('imageLinks.export')}
                >
                  <FileDownIcon />
                  <span className="hidden @[420px]:inline">{t('imageLinks.export')}</span>
                  <ChevronDownIcon className="-mr-0.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t('imageLinks.exportAs')}</DropdownMenuLabel>
                {EXPORT_FORMATS.map(({ format, icon: Icon }) => (
                  <DropdownMenuItem key={format} onSelect={() => onExport(format)}>
                    <Icon />
                    {t(`imageLinks.format.${format}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex shrink-0 items-center">
              <Button
                size="sm"
                className="rounded-r-none px-2.5"
                disabled={disabled || running}
                onClick={() => onDownload('zip')}
                title={t('imageLinks.downloadZipLong')}
              >
                <FileArchiveIcon />
                {t('imageLinks.downloadZip')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-l-none px-1.5 shadow-[inset_1px_0_0_rgb(255_255_255/0.28)]"
                    disabled={disabled || running}
                    aria-label={t('imageLinks.download')}
                  >
                    <ChevronDownIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56">
                  <DropdownMenuItem onSelect={() => onDownload('zip')}>
                    <FileArchiveIcon />
                    {t('imageLinks.downloadZipLong')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onDownload('files')}>
                    <DownloadIcon />
                    {t('imageLinks.downloadFiles')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DownloadOptions
              settings={settings}
              onChange={onSettingsChange}
              pageUrl={pageUrl}
              zipName={zipName}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
