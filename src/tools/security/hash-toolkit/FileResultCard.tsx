import { motion, useReducedMotion } from 'motion/react'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  HistoryIcon,
  LoaderCircleIcon,
  PinIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { checkExtension, extensionOf } from '@/core/engines/hash/signature'
import { formatBytes } from '@/core/engines/image'
import { CopyButton } from '@/shared/components/CopyButton'
import { FileGlyph } from '@/shared/components/files'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { DigestList } from './DigestList'
import type { HashQueueItem } from './types'

function BaselineBadge({ verdict }: { verdict: HashQueueItem['baseline'] }) {
  const { t } = useTranslation()
  if (!verdict || verdict === 'none') return null
  const tone =
    verdict === 'match'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : verdict === 'metadata-changed'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
        : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
  const label =
    verdict === 'match'
      ? t('hashToolkit.baseline.unchanged')
      : verdict === 'metadata-changed'
        ? t('hashToolkit.baseline.resized')
        : t('hashToolkit.baseline.modified')
  return (
    <Badge variant="outline" className={cn('gap-1 font-normal', tone)}>
      {verdict === 'match' ? (
        <CircleCheckIcon className="size-3" aria-hidden />
      ) : (
        <CircleAlertIcon className="size-3" aria-hidden />
      )}
      {label}
    </Badge>
  )
}

export function FileResultCard({
  item,
  onRemove,
  onPinBaseline,
  verifyHex,
}: {
  item: HashQueueItem
  onRemove: () => void
  onPinBaseline: () => void
  verifyHex?: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const result = item.result
  const extCheck = result?.signature
    ? checkExtension(item.path, result.signature)
    : ('unknown' as const)

  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl border bg-card p-3 shadow-xs"
    >
      <div className="flex items-start gap-2.5">
        <FileGlyph extension={extensionOf(item.path)} className="h-10 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="min-w-0 truncate text-[13px] font-medium">{item.path}</p>
            <BaselineBadge verdict={item.baseline} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatBytes(item.file.size)}
            {' · '}
            {new Date(item.file.lastModified).toLocaleString()}
            {result ? ` · ${Math.round(result.durationMs)} ms` : null}
          </p>
          {item.status === 'hashing' && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(item.progress * 100)}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          )}
          {item.status === 'error' && (
            <p className="mt-1 text-[11px] text-destructive">{item.error}</p>
          )}
          {result && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {result.signature && (
                <Badge variant="secondary" className="font-normal">
                  {result.signature.label}
                  {result.signature.risky ? ` · ${t('hashToolkit.risky')}` : ''}
                </Badge>
              )}
              {extCheck === 'mismatch' && (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 text-amber-700 dark:text-amber-300"
                >
                  {t('hashToolkit.extensionMismatch')}
                </Badge>
              )}
              <Badge variant="outline" className="font-mono tabular-nums">
                H {result.entropy.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {item.status === 'done' && (
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              aria-label={t('hashToolkit.baseline.save')}
              title={t('hashToolkit.baseline.save')}
              onClick={onPinBaseline}
            >
              <PinIcon />
            </Button>
          )}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={t('hashToolkit.removeFile')}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-3 border-t pt-3">
          <DigestList digests={result.digests} highlight={verifyHex} />
          <div className="mt-2 flex justify-end">
            <CopyButton
              text={Object.entries(result.digests)
                .map(([alg, hex]) => `${alg}: ${hex}`)
                .join('\n')}
              label={t('hashToolkit.copyAll')}
            />
          </div>
        </div>
      )}

      {item.status === 'hashing' && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <LoaderCircleIcon
            className="size-3 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          {t('hashToolkit.hashing')}
        </p>
      )}
      {item.status === 'done' && item.baseline === 'none' && (
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <HistoryIcon className="size-3" aria-hidden />
          {t('hashToolkit.baseline.hint')}
        </p>
      )}
    </motion.article>
  )
}
