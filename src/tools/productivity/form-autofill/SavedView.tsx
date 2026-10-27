import { useDeferredValue, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  AlignLeftIcon,
  BookmarkIcon,
  BookmarkPlusIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CircleDotIcon,
  ListChecksIcon,
  Loader2Icon,
  SearchIcon,
  SquareCheckIcon,
  SquareIcon,
  Trash2Icon,
  TypeIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import { Link } from '@/app/router'
import {
  groupMemoryByHost,
  memoryTotals,
  pageRefFor,
  removeMemoryField,
  removeMemoryHost,
  removeMemoryPage,
  restoreMemoryPages,
  setHostBlocked,
  updateMemoryField,
  type FormMemoryState,
  type MemoryField,
  type MemoryFieldKind,
  type MemoryHostGroup,
  type MemoryPage,
} from '@/core/form-memory/model'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

type Update = (mutate: (current: FormMemoryState) => FormMemoryState) => Promise<FormMemoryState>

const KIND_ICON: Record<MemoryFieldKind, LucideIcon> = {
  text: TypeIcon,
  textarea: AlignLeftIcon,
  select: ChevronsUpDownIcon,
  multi: ListChecksIcon,
  checkbox: SquareCheckIcon,
  radio: CircleDotIcon,
}

function valueText(field: MemoryField): string {
  if (Array.isArray(field.value)) return field.display || field.value.join(', ')
  if (typeof field.value === 'boolean') return ''
  return field.display || field.value
}

function matches(query: string, ...parts: (string | undefined)[]): boolean {
  return parts.some((part) => part?.toLowerCase().includes(query))
}

function filterGroups(groups: MemoryHostGroup[], query: string): MemoryHostGroup[] {
  if (!query) return groups
  return groups.flatMap((group) => {
    if (matches(query, group.host)) return [group]
    const pages = group.pages.flatMap((page) => {
      if (matches(query, page.title, page.path)) return [page]
      const fields = Object.fromEntries(
        Object.entries(page.fields).filter(([, field]) => matches(query, field.label, valueText(field))),
      )
      return Object.keys(fields).length > 0 ? [{ ...page, fields }] : []
    })
    return pages.length > 0 ? [{ ...group, pages }] : []
  })
}

interface SavedViewProps {
  state: FormMemoryState | null
  update: Update
  currentUrl: string | undefined
  canSave: boolean
  saving: boolean
  onSave: () => void
}

/** Everything form memory holds, grouped by site and page, where entries can be edited or forgotten. */
export function SavedView({ state, update, currentUrl, canSave, saving, onSave }: SavedViewProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim().toLowerCase())
  const currentId = pageRefFor(currentUrl)?.id
  const groups = useMemo(() => {
    if (!state) return []
    const all = groupMemoryByHost(state)
    const current = all.findIndex((group) => group.pages.some((page) => page.id === currentId))
    if (current > 0) all.unshift(...all.splice(current, 1))
    return all
  }, [state, currentId])
  const visible = useMemo(() => filterGroups(groups, deferred), [groups, deferred])
  const totals = state ? memoryTotals(state) : { sites: 0, pages: 0, fields: 0 }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('formMemory.saved.search')}
              aria-label={t('formMemory.saved.search')}
              className="h-8 pl-8 text-[13px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!canSave || saving}
            title={t('formMemory.saved.saveHint')}
          >
            {saving ? <Loader2Icon className="motion-safe:animate-spin" aria-hidden /> : <BookmarkPlusIcon aria-hidden />}
            <span className="hidden @[320px]:inline">{t('formMemory.saved.save')}</span>
            <span className="sr-only @[320px]:hidden">{t('formMemory.saved.save')}</span>
          </Button>
        </div>
        {totals.pages > 0 && (
          <p className="mt-1.5 px-0.5 text-xs text-muted-foreground">
            {t('formMemory.saved.sites', { count: totals.sites })} ·{' '}
            {t('formMemory.saved.values', { count: totals.fields })}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {!state ? null : groups.length === 0 ? (
          <SavedEmpty learn={state.settings.learn} />
        ) : visible.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            {t('formMemory.saved.noMatch', { query: query.trim() })}
          </p>
        ) : (
          visible.map((group, index) => (
            <HostCard
              key={group.host}
              group={group}
              update={update}
              currentId={currentId}
              defaultOpen={Boolean(deferred) || index === 0 || groups.length <= 3}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SavedEmpty({ learn }: { learn: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
        <BookmarkIcon className="size-5" />
      </span>
      <p className="text-sm font-semibold">{t('formMemory.saved.emptyTitle')}</p>
      <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">
        {learn ? t('formMemory.saved.emptyHint') : t('formMemory.saved.emptyOff')}
      </p>
      {!learn && (
        <Link to="/settings" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
          {t('formMemory.saved.openSettings')}
        </Link>
      )}
    </div>
  )
}

function HostCard({
  group,
  update,
  currentId,
  defaultOpen,
}: {
  group: MemoryHostGroup
  update: Update
  currentId: string | undefined
  defaultOpen: boolean
}) {
  const { t } = useTranslation()
  const { show } = useToast()
  const reduceMotion = useReducedMotion()
  const bodyId = useId()
  const [open, setOpen] = useState(defaultOpen)
  const current = group.pages.some((page) => page.id === currentId)

  const forget = () => {
    const removed = group.pages
    void update((state) => removeMemoryHost(state, group.host))
    show(t('formMemory.saved.forgotSite', { host: group.host }), {
      variant: 'info',
      undo: () => void update((state) => restoreMemoryPages(state, removed)),
    })
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-xs',
        current && 'border-primary/40 ring-1 ring-primary/15',
      )}
    >
      <div className="flex items-center gap-1.5 p-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
          className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold uppercase',
              group.blocked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            {group.host.replace(/^www\./, '').charAt(0) || '·'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cn('truncate text-[13px] font-semibold', group.blocked && 'text-muted-foreground')}>
                {group.host}
              </span>
              {current && (
                <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                  {t('formMemory.saved.thisTab')}
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {group.blocked
                ? t('formMemory.saved.paused')
                : `${t('formMemory.saved.pages', { count: group.pages.length })} · ${t('formMemory.saved.values', { count: group.fieldCount })}`}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </button>
        <Switch
          checked={!group.blocked}
          onCheckedChange={(on) => void update((state) => setHostBlocked(state, group.host, !on))}
          aria-label={t('formMemory.saved.remember', { host: group.host })}
          title={t('formMemory.saved.remember', { host: group.host })}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={forget}
          aria-label={t('formMemory.saved.forgetSite', { host: group.host })}
          title={t('formMemory.saved.forgetSite', { host: group.host })}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: reduceMotion ? 0 : 0.15, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t px-2 pt-2 pb-2.5">
              {group.pages.map((page) => (
                <PageBlock key={page.id} page={page} update={update} current={page.id === currentId} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function PageBlock({ page, update, current }: { page: MemoryPage; update: Update; current: boolean }) {
  const { t } = useTranslation()
  const { show } = useToast()
  const fields = Object.values(page.fields).sort((a, b) => a.label.localeCompare(b.label))

  const forget = () => {
    void update((state) => removeMemoryPage(state, page.id))
    show(t('formMemory.saved.forgotPage'), {
      variant: 'info',
      undo: () => void update((state) => restoreMemoryPages(state, [page])),
    })
  }

  const removeField = (field: MemoryField) => {
    void update((state) => removeMemoryField(state, page.id, field.key))
    show(t('formMemory.saved.forgotField', { label: field.label }), {
      variant: 'info',
      undo: () => void update((state) => restoreMemoryPages(state, [page])),
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
            {current && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
            <span className="truncate" title={page.title}>
              {page.title}
            </span>
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={page.url}>
            {page.path}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={forget}
          aria-label={t('formMemory.saved.forgetPage')}
          title={t('formMemory.saved.forgetPage')}
          className="text-muted-foreground hover:text-destructive"
        >
          <XIcon aria-hidden />
        </Button>
      </div>
      <ul className="mt-1.5 divide-y divide-border/70 overflow-hidden rounded-lg border bg-background/60">
        {fields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            onRemove={() => removeField(field)}
            onChange={(value) => void update((state) => updateMemoryField(state, page.id, field.key, value, Date.now()))}
          />
        ))}
      </ul>
      {page.fillCount > 0 && (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">
          {t('formMemory.saved.filledTimes', { count: page.fillCount })}
        </p>
      )}
    </div>
  )
}

function FieldRow({
  field,
  onRemove,
  onChange,
}: {
  field: MemoryField
  onRemove: () => void
  onChange: (value: string | boolean) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<string | null>(null)
  const Icon = KIND_ICON[field.kind]
  const editable = field.kind === 'text' || field.kind === 'textarea'
  const text = valueText(field)

  const commit = () => {
    if (draft !== null && draft !== field.value) onChange(draft)
    setDraft(null)
  }
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit()
    else if (event.key === 'Escape') setDraft(null)
  }

  return (
    <li className="group flex min-h-9 items-center gap-2 px-2.5 py-1">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
      <span className="w-[38%] min-w-0 shrink-0 truncate text-xs text-muted-foreground" title={field.label}>
        {field.label}
      </span>
      <div className="min-w-0 flex-1">
        {draft !== null ? (
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            aria-label={t('formMemory.saved.editValue', { label: field.label })}
            className="h-7 px-2 text-xs"
          />
        ) : field.kind === 'checkbox' ? (
          <button
            type="button"
            onClick={() => onChange(!field.value)}
            aria-pressed={field.value === true}
            aria-label={t('formMemory.saved.toggle', { label: field.label })}
            className={cn(
              'inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
              field.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground',
            )}
          >
            {field.value ? <SquareCheckIcon className="size-3.5" aria-hidden /> : <SquareIcon className="size-3.5" aria-hidden />}
            {field.value ? t('formMemory.saved.checked') : t('formMemory.saved.unchecked')}
          </button>
        ) : editable ? (
          <button
            type="button"
            onClick={() => setDraft(typeof field.value === 'string' ? field.value : '')}
            title={t('formMemory.saved.editValue', { label: field.label })}
            className="block min-h-7 w-full cursor-text truncate rounded-md px-1.5 text-left text-xs font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            {text}
          </button>
        ) : (
          <span className="block truncate px-1.5 text-xs font-medium" title={text}>
            {text}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('formMemory.saved.forgetField', { label: field.label })}
        title={t('formMemory.saved.forgetField', { label: field.label })}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="size-3.5" aria-hidden />
      </button>
    </li>
  )
}
