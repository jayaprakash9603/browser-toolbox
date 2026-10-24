import { memo, useId, type ReactElement } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  CrosshairIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  FileDownIcon,
  HashIcon,
  LockOpenIcon,
  ShieldOffIcon,
  SquareArrowOutUpRightIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { splitUrl, type LinkEntry, type LinkStatusInfo, type PageLink } from '@/core/engines/links/pageLinks'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

import { SectionGlyph, SiteAvatar, StatusPill, Tag } from './LinkVisuals'

interface LinkRowProps {
  entry: LinkEntry
  status: LinkStatusInfo | undefined
  expanded: boolean
  onToggle: (key: string) => void
  onLocate: (link: PageLink) => void
  showSection?: boolean
}

function canOpen(link: PageLink): boolean {
  return link.kind === 'internal' || link.kind === 'external' || link.kind === 'email' || link.kind === 'phone' || link.kind === 'other'
}

function IconAction({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export const LinkRow = memo(function LinkRow({ entry, status, expanded, onToggle, onLocate, showSection = true }: LinkRowProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const detailsId = useId()
  const { link, occurrences } = entry
  const { host, path } = splitUrl(link)
  const count = occurrences.length
  const sections = [...new Set(occurrences.map((item) => item.section))]
  const allHidden = occurrences.every((item) => !item.visible)
  const noText = link.textSource === 'none'
  const locateTarget = occurrences.find((item) => item.visible) ?? link

  return (
    <li
      className={cn(
        'rounded-lg border bg-card transition-colors hover:border-primary/30',
        expanded && 'border-primary/30 shadow-sm',
        status && !status.checking && !status.ok && 'border-destructive/30',
      )}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <SiteAvatar host={link.host} kind={link.kind} download={link.download} />
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggle(entry.key)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {noText ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-[13px] text-amber-700 italic dark:text-amber-400">
                <AlertTriangleIcon className="size-3 shrink-0" aria-hidden />
                {t('web.links.noTextLabel')}
              </span>
            ) : (
              <span className="truncate text-[13px] font-medium text-foreground">{link.text}</span>
            )}
            {count > 1 && (
              <span
                className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums"
                aria-label={t('web.links.timesFoundLabel', { count })}
              >
                ×{count}
              </span>
            )}
            <ChevronDownIcon
              className={cn(
                'ml-auto size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 motion-reduce:transition-none',
                expanded && 'rotate-180',
              )}
              aria-hidden
            />
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] leading-4">
            <span className="text-muted-foreground/70">{host}</span>
            <span className="text-muted-foreground">{path}</span>
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1 empty:hidden">
            <StatusPill info={status} />
            {showSection && (
              <Tag>
                <SectionGlyph section={sections[0]} className="h-3 w-2.5 rounded-[2px] p-px" />
                {t(`web.links.section.${sections[0]}`)}
                {sections.length > 1 && <span className="tabular-nums">+{sections.length - 1}</span>}
              </Tag>
            )}
            {link.anchorMissing && (
              <Tag tone="warning">
                <HashIcon aria-hidden />
                {t('web.links.flag.brokenAnchor')}
              </Tag>
            )}
            {link.insecure && (
              <Tag tone="warning">
                <LockOpenIcon aria-hidden />
                {t('web.links.flag.insecure')}
              </Tag>
            )}
            {allHidden && (
              <Tag>
                <EyeOffIcon aria-hidden />
                {t('web.links.flag.hidden')}
              </Tag>
            )}
            {occurrences.some((item) => item.newTab) && (
              <Tag>
                <SquareArrowOutUpRightIcon aria-hidden />
                {t('web.links.flag.newTab')}
              </Tag>
            )}
            {occurrences.some((item) => item.nofollow) && (
              <Tag>
                <ShieldOffIcon aria-hidden />
                {t('web.links.flag.nofollow')}
              </Tag>
            )}
            {link.download && (
              <Tag tone="info">
                <FileDownIcon aria-hidden />
                {t('web.links.file')}
              </Tag>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label={t('web.links.locate')}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('web.links.locate')}
              onClick={() => onLocate(locateTarget)}
            >
              <CrosshairIcon />
            </Button>
          </IconAction>
          {canOpen(link) && (
            <IconAction label={t('web.links.open')}>
              <Button variant="ghost" size="icon-xs" asChild>
                <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={t('web.links.open')}>
                  <ExternalLinkIcon />
                </a>
              </Button>
            </IconAction>
          )}
          <CopyButton text={link.href} label={t('web.links.copy')} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={detailsId}
            key="details"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
          >
            <LinkDetails entry={entry} status={status} onLocate={onLocate} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
})

function LinkDetails({
  entry,
  status,
  onLocate,
}: {
  entry: LinkEntry
  status: LinkStatusInfo | undefined
  onLocate: (link: PageLink) => void
}) {
  const { t } = useTranslation()
  const { link, occurrences } = entry
  return (
    <div className="space-y-3 border-t bg-muted/30 px-3 py-2.5 text-[11px]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-muted-foreground">{t('web.links.detailUrl')}</dt>
        <dd className="font-mono break-all select-text">{link.href}</dd>
        {link.rawHref && link.rawHref !== link.href && (
          <>
            <dt className="text-muted-foreground">{t('web.links.detailRaw')}</dt>
            <dd className="font-mono break-all select-text">{link.rawHref}</dd>
          </>
        )}
        {link.textSource !== 'text' && link.textSource !== 'none' && (
          <>
            <dt className="text-muted-foreground">{t('web.links.detailText')}</dt>
            <dd>
              {link.text}{' '}
              <span className="text-muted-foreground">({t(`web.links.textSource.${link.textSource}`)})</span>
            </dd>
          </>
        )}
        {link.rel.length > 0 && (
          <>
            <dt className="text-muted-foreground">rel</dt>
            <dd className="font-mono">{link.rel.join(' ')}</dd>
          </>
        )}
        {status && !status.checking && (
          <>
            <dt className="text-muted-foreground">{t('web.links.detailStatus')}</dt>
            <dd className={status.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}>
              {status.status ?? '—'}
              {status.error ? ` · ${status.error}` : ''}
            </dd>
          </>
        )}
      </dl>
      <div>
        <p className="mb-1 font-medium text-muted-foreground">
          {t('web.links.foundIn', { count: occurrences.length })}
        </p>
        <ul className="space-y-0.5">
          {occurrences.map((item, index) => (
            <li key={item.index} className="flex items-center gap-2 rounded-md py-0.5 pr-0.5 pl-1.5 hover:bg-background">
              <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
              <SectionGlyph section={item.section} />
              <span className="shrink-0 text-muted-foreground">{t(`web.links.section.${item.section}`)}</span>
              <span className={cn('min-w-0 flex-1 truncate', item.textSource === 'none' && 'text-muted-foreground italic')}>
                {item.textSource === 'none' ? t('web.links.noTextLabel') : item.text}
              </span>
              {!item.visible && <EyeOffIcon className="size-3 shrink-0 text-muted-foreground" aria-label={t('web.links.flag.hidden')} />}
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6"
                aria-label={`${t('web.links.locate')} ${index + 1}`}
                onClick={() => onLocate(item)}
              >
                <CrosshairIcon />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
