import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
  Trash2Icon,
  WrapTextIcon,
} from 'lucide-react'

import {
  asTimestamp,
  decodeJwt,
  formatBytes,
  minifyJson,
  parseJson,
  prettyValue,
  type StorageEntry,
  type ValueKind,
} from '@/core/storage-inspector/model'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

const KIND_STYLE: Record<ValueKind, string> = {
  json: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  jwt: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  url: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  number: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  boolean: 'bg-pink-500/12 text-pink-600 dark:text-pink-400',
  timestamp: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  empty: 'bg-muted text-muted-foreground',
  text: 'bg-muted text-muted-foreground',
}

const PREVIEW_CHARS = 160

interface EntryRowProps {
  entry: StorageEntry
  expanded: boolean
  editing: boolean
  onToggle: (key: string) => void
  onEdit: (key: string | null) => void
  onSave: (key: string, value: string) => void
  onDelete: (entry: StorageEntry) => void
  onCopy: (text: string) => void
}

function relative(ms: number): string {
  const diff = ms - Date.now()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ]
  for (const [unit, size] of units) {
    if (abs >= size) return rtf.format(Math.round(diff / size), unit)
  }
  return rtf.format(Math.round(diff / 1000), 'second')
}

function KindBadge({ kind }: { kind: ValueKind }) {
  const { t } = useTranslation()
  return (
    <span className={cn('shrink-0 rounded px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase', KIND_STYLE[kind])}>
      {t(`storage.kind.${kind}`)}
    </span>
  )
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="scrollbar-styled max-h-52 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Details({ entry }: { entry: StorageEntry }) {
  const { t } = useTranslation()
  const jwt = entry.kind === 'jwt' ? decodeJwt(entry.value) : null
  const stamp = entry.kind === 'timestamp' ? asTimestamp(entry.value) : null

  if (jwt) {
    const expired = jwt.expiresAt != null && jwt.expiresAt < Date.now()
    return (
      <div className="flex flex-col gap-2">
        {jwt.expiresAt != null && (
          <p className={cn('text-[11px] font-medium', expired ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
            {t(expired ? 'storage.jwt.expired' : 'storage.jwt.expires', { when: relative(jwt.expiresAt) })}
            <span className="ml-1.5 font-normal text-muted-foreground">{new Date(jwt.expiresAt).toLocaleString()}</span>
          </p>
        )}
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{t('storage.jwt.header')}</p>
          <Json value={jwt.header} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{t('storage.jwt.payload')}</p>
          <Json value={jwt.payload} />
        </div>
      </div>
    )
  }
  if (stamp != null) {
    return (
      <p className="text-xs">
        <span className="font-medium">{new Date(stamp).toLocaleString()}</span>
        <span className="ml-2 text-muted-foreground">{relative(stamp)}</span>
      </p>
    )
  }
  if (entry.kind === 'url') {
    return (
      <div className="flex flex-col gap-1.5">
        <code className="font-mono text-[11px] break-all">{entry.value}</code>
        <a
          href={entry.value}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ExternalLinkIcon className="size-3" /> {entry.value.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      </div>
    )
  }
  if (entry.kind === 'json') return <Json value={parseJson(entry.value)} />
  return (
    <pre className="scrollbar-styled max-h-52 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
      {entry.value || '—'}
    </pre>
  )
}

function Editor({
  entry,
  onSave,
  onCancel,
}: {
  entry: StorageEntry
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => prettyValue(entry.value))
  const ref = useRef<HTMLTextAreaElement>(null)
  const looksJson = /^\s*[[{]/.test(draft)
  const validJson = parseJson(draft) !== undefined
  const invalid = looksJson && !validJson
  const minified = minifyJson(draft)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => onSave(validJson && entry.kind === 'json' ? (minifyJson(draft) ?? draft) : draft)

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      commit()
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        ref={ref}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        rows={Math.min(10, Math.max(3, draft.split('\n').length))}
        aria-label={t('storage.editValue')}
        aria-invalid={invalid}
        className={cn(
          'scrollbar-styled w-full resize-y rounded-md border bg-background p-2 font-mono text-[11px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring',
          invalid && 'border-red-500/60',
        )}
      />
      {invalid && <p className="text-[11px] text-red-500">{t('storage.invalidJson')}</p>}
      <div className="flex items-center gap-1.5">
        <Button size="xs" onClick={commit}>
          {t('storage.save')}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          {t('storage.cancel')}
        </Button>
        <span className="flex-1" />
        {validJson && (
          <>
            <Button size="xs" variant="outline" onClick={() => setDraft(prettyValue(draft))}>
              <WrapTextIcon /> {t('storage.format')}
            </Button>
            {minified != null && minified !== draft && (
              <Button size="xs" variant="outline" onClick={() => setDraft(minified)}>
                {t('storage.minify')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export const EntryRow = memo(function EntryRow({
  entry,
  expanded,
  editing,
  onToggle,
  onEdit,
  onSave,
  onDelete,
  onCopy,
}: EntryRowProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const open = expanded || editing
  const preview = entry.value.length > PREVIEW_CHARS ? `${entry.value.slice(0, PREVIEW_CHARS)}…` : entry.value

  const copyValue = () => {
    onCopy(entry.value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const iconButton =
    'size-7 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100'

  return (
    <motion.li
      layout={reduce ? false : 'position'}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group rounded-xl border bg-card transition-colors',
        open ? 'border-primary/40 shadow-sm' : 'hover:border-foreground/20',
      )}
    >
      <div className="flex items-start gap-1 p-1.5 pl-1">
        <button
          type="button"
          onClick={() => onToggle(entry.key)}
          aria-expanded={open}
          aria-label={t(open ? 'storage.collapse' : 'storage.expand', { key: entry.key })}
          className="flex min-w-0 flex-1 items-start gap-1.5 rounded-lg p-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronRightIcon
            className={cn('mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-90')}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <code className="min-w-0 truncate font-mono text-[12px] font-semibold text-primary" title={entry.key}>
                {entry.key}
              </code>
              <KindBadge kind={entry.kind} />
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">{formatBytes(entry.bytes)}</span>
            </span>
            {!open && (
              <code className="mt-0.5 line-clamp-2 font-mono text-[11px] break-all text-muted-foreground">
                {preview || '—'}
              </code>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon-xs" className={iconButton} onClick={copyValue} aria-label={t('storage.copyValue')} title={t('storage.copyValue')}>
            {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className={iconButton}
            onClick={() => onEdit(editing ? null : entry.key)}
            aria-label={t('storage.edit')}
            title={t('storage.edit')}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(iconButton, 'hover:text-red-500')}
            onClick={() => onDelete(entry)}
            aria-label={t('storage.deleteEntry', { key: entry.key })}
            title={t('storage.delete')}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="border-t px-3 py-2.5"
        >
          {editing ? (
            <Editor entry={entry} onSave={(value) => onSave(entry.key, value)} onCancel={() => onEdit(null)} />
          ) : (
            <Details entry={entry} />
          )}
        </motion.div>
      )}
    </motion.li>
  )
})
