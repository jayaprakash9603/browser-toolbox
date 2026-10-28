import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCheckIcon, CheckIcon, GlobeIcon, InboxIcon, XIcon } from 'lucide-react'

import { pageRefFor, type FormMemoryState, type ReviewCandidate, type ReviewEntry } from '@/core/form-memory/model'
import {
  approveAllReview,
  approveReview,
  dismissReview,
  dismissReviewValue,
  groupReviewByHost,
  restoreReview,
  type ReviewHostGroup,
  type ReviewPageGroup,
  type ReviewScope,
} from '@/core/form-memory/review'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { KIND_ICON, valueKey, valueText } from './fieldDisplay'

type Update = (mutate: (current: FormMemoryState) => FormMemoryState) => Promise<FormMemoryState>

interface ReviewViewProps {
  state: FormMemoryState | null
  update: Update
  currentUrl: string | undefined
}

/** Values captured from forms wait here until the user keeps one for its page, makes it global or drops it. */
export function ReviewView({ state, update, currentUrl }: ReviewViewProps) {
  const { t } = useTranslation()
  const { show } = useToast()
  const currentId = pageRefFor(currentUrl)?.id
  const groups = useMemo(() => {
    if (!state) return []
    const all = groupReviewByHost(state)
    const current = all.findIndex((group) => group.pages.some((page) => page.pageId === currentId))
    if (current > 0) all.unshift(...all.splice(current, 1))
    return all
  }, [state, currentId])
  const total = groups.reduce((sum, group) => sum + group.count, 0)

  const saveAll = () => {
    void update((current) => approveAllReview(current, 'page', Date.now()))
    show(t('formMemory.review.savedAll', { count: total }), { variant: 'success' })
  }

  const dismissAll = () => {
    const removed = state ? Object.values(state.review) : []
    void update((current) => dismissReview(current, Object.keys(current.review)))
    show(t('formMemory.review.dismissedAll', { count: removed.length }), {
      variant: 'info',
      undo: () => void update((current) => restoreReview(current, removed)),
    })
  }

  if (!state) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-2">
        <p className="text-xs leading-snug text-muted-foreground">{t('formMemory.review.hint')}</p>
        {total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-medium">{t('formMemory.review.summary', { count: total })}</p>
            <Button variant="ghost" size="sm" onClick={dismissAll} className="text-muted-foreground">
              {t('formMemory.review.dismissAll')}
            </Button>
            <Button size="sm" onClick={saveAll} title={t('formMemory.review.saveAllHint')}>
              <CheckCheckIcon aria-hidden />
              {t('formMemory.review.saveAll')}
            </Button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {groups.length === 0 ? (
          <ReviewEmpty />
        ) : (
          groups.map((group) => <HostSection key={group.host} group={group} update={update} currentId={currentId} />)
        )}
      </div>
    </div>
  )
}

function ReviewEmpty() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
        <InboxIcon className="size-5" />
      </span>
      <p className="text-sm font-semibold">{t('formMemory.review.emptyTitle')}</p>
      <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">{t('formMemory.review.emptyHint')}</p>
    </div>
  )
}

function HostSection({
  group,
  update,
  currentId,
}: {
  group: ReviewHostGroup
  update: Update
  currentId: string | undefined
}) {
  const { t } = useTranslation()
  const current = group.pages.some((page) => page.pageId === currentId)
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-xs',
        current && 'border-primary/40 ring-1 ring-primary/15',
      )}
    >
      <header className="flex items-center gap-2.5 px-3 py-2">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary uppercase"
        >
          {group.host.replace(/^www\./, '').charAt(0) || '·'}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{group.host}</span>
        {current && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
            {t('formMemory.saved.thisTab')}
          </span>
        )}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{group.count}</span>
      </header>
      <div className="space-y-3 border-t px-2 pt-2 pb-2.5">
        {group.pages.map((page) => (
          <PageReview key={page.pageId} page={page} update={update} />
        ))}
      </div>
    </section>
  )
}

function PageReview({ page, update }: { page: ReviewPageGroup; update: Update }) {
  return (
    <div>
      <div className="px-1">
        <p className="truncate text-xs font-medium" title={page.title}>
          {page.title}
        </p>
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={page.url}>
          {page.path}
        </p>
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {page.entries.map((entry) => (
          <ReviewItem key={entry.id} entry={entry} update={update} />
        ))}
      </ul>
    </div>
  )
}

function candidateText(candidate: ReviewCandidate, checked: string, unchecked: string): string {
  if (typeof candidate.value === 'boolean') return candidate.value ? checked : unchecked
  return valueText(candidate)
}

function ReviewItem({ entry, update }: { entry: ReviewEntry; update: Update }) {
  const { t } = useTranslation()
  const { show } = useToast()
  const groupName = useId()
  const [picked, setPicked] = useState<string | null>(null)
  const found = entry.values.findIndex((candidate) => valueKey(candidate.value) === picked)
  const index = found === -1 ? 0 : found
  const Icon = KIND_ICON[entry.field.kind]
  const label = entry.field.label

  const approve = (scope: ReviewScope) => {
    void update((state) => approveReview(state, entry.id, index, scope, Date.now()))
    show(t(scope === 'global' ? 'formMemory.review.savedGlobal' : 'formMemory.review.savedPage', { label }), {
      variant: 'success',
    })
  }

  const dismiss = () => {
    void update((state) => dismissReview(state, [entry.id]))
    show(t('formMemory.review.dismissed', { label }), {
      variant: 'info',
      undo: () => void update((state) => restoreReview(state, [entry])),
    })
  }

  return (
    <li className="overflow-hidden rounded-lg border bg-background/60">
      <div className="flex items-center gap-2 px-2.5 pt-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs font-medium" title={label}>
          {label}
        </span>
        {entry.values.length > 1 && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {t('formMemory.review.values', { count: entry.values.length })}
          </span>
        )}
      </div>
      <div role="radiogroup" aria-label={t('formMemory.review.pick', { label })} className="space-y-0.5 px-1.5 py-1.5">
        {entry.values.map((candidate, position) => {
          const selected = position === index
          const text = candidateText(candidate, t('formMemory.saved.checked'), t('formMemory.saved.unchecked'))
          return (
            <div
              key={valueKey(candidate.value)}
              className={cn(
                'group flex min-h-8 items-center gap-1 rounded-md pr-1 transition-colors',
                selected ? 'bg-primary/8' : 'hover:bg-accent/60',
              )}
            >
              <label className="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 px-1.5">
                <input
                  type="radio"
                  name={groupName}
                  checked={selected}
                  onChange={() => setPicked(valueKey(candidate.value))}
                  className="size-3.5 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1 truncate text-xs" title={text}>
                  {text}
                </span>
                {candidate.count > 1 && (
                  <span
                    className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold text-muted-foreground tabular-nums"
                    title={t('formMemory.review.times', { count: candidate.count })}
                  >
                    ×{candidate.count}
                  </span>
                )}
              </label>
              {entry.values.length > 1 && (
                <button
                  type="button"
                  onClick={() => void update((state) => dismissReviewValue(state, entry.id, position))}
                  aria-label={t('formMemory.review.removeValue', { value: text })}
                  title={t('formMemory.review.removeValue', { value: text })}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <XIcon className="size-3" aria-hidden />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t bg-muted/30 px-2 py-1.5">
        <Button size="xs" onClick={() => approve('page')}>
          <CheckIcon aria-hidden />
          {t('formMemory.review.savePage')}
        </Button>
        <Button size="xs" variant="outline" onClick={() => approve('global')} title={t('formMemory.review.saveGlobalHint')}>
          <GlobeIcon aria-hidden />
          {t('formMemory.review.saveGlobal')}
        </Button>
        <Button size="xs" variant="ghost" onClick={dismiss} className="ml-auto text-muted-foreground">
          {t('formMemory.review.dismiss')}
        </Button>
      </div>
    </li>
  )
}
