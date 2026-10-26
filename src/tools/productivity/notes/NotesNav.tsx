import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  ArchiveIcon,
  CheckIcon,
  HashIcon,
  ListChecksIcon,
  NotebookTextIcon,
  PinIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { ColorSwatch } from './ColorMenu'
import { NOTE_VIEWS, type NotesCounts, type NotesFilter, type NotesView } from './notesLogic'
import { NOTE_COLORS, type NoteColor } from './notesService'

const VIEW_ICONS: Record<NotesView, LucideIcon> = {
  all: NotebookTextIcon,
  pinned: PinIcon,
  checklists: ListChecksIcon,
  archive: ArchiveIcon,
  trash: Trash2Icon,
}

interface NotesNavProps {
  filter: NotesFilter
  counts: NotesCounts
  layout: 'sidebar' | 'rail'
  onView: (view: NotesView) => void
  onTag: (tag: string | null) => void
  onColor: (color: NoteColor | null) => void
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      className={cn(
        'relative min-w-4 rounded-full px-1 text-center text-[10.5px] leading-4 tabular-nums',
        active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {count}
    </motion.span>
  )
}

function NavButton({
  active,
  layout,
  onClick,
  icon,
  label,
  count,
  pillId,
}: {
  active: boolean
  layout: 'sidebar' | 'rail'
  onClick: () => void
  icon: ReactNode
  label: string
  count: number
  pillId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'relative flex shrink-0 cursor-pointer items-center gap-1.5 text-[12.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
        layout === 'rail' ? 'h-7 rounded-full px-2.5' : 'h-8 w-full rounded-lg px-2.5',
        active ? 'text-primary' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId={pillId}
          aria-hidden
          className={cn(
            'absolute inset-0 bg-primary/10 ring-1 ring-primary/20 ring-inset',
            layout === 'rail' ? 'rounded-full' : 'rounded-lg',
          )}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative flex items-center">{icon}</span>
      <span className={cn('relative truncate', layout === 'sidebar' && 'flex-1 text-left')}>{label}</span>
      <CountBadge count={count} active={active} />
    </button>
  )
}

export function NotesNav({ filter, counts, layout, onView, onTag, onColor }: NotesNavProps) {
  const { t } = useTranslation()
  const usedColors = NOTE_COLORS.filter((color) => (counts.colors[color] ?? 0) > 0)

  const views = NOTE_VIEWS.map((view) => {
    const Icon = VIEW_ICONS[view]
    return (
      <NavButton
        key={view}
        active={filter.view === view}
        layout={layout}
        onClick={() => onView(view)}
        icon={<Icon className="size-4" aria-hidden />}
        label={t(`notes.views.${view}`)}
        count={view === 'archive' || view === 'trash' ? 0 : counts.views[view]}
        pillId={`notes-nav-${layout}`}
      />
    )
  })

  if (layout === 'rail') {
    const activeFilters = Number(filter.tag != null) + Number(filter.color != null)
    return (
      <nav aria-label={t('notes.views.label')} className="flex flex-wrap items-center gap-1">
        {views}
        {(counts.tags.length > 0 || usedColors.length > 1) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="xs"
                variant="ghost"
                className={cn('h-7 gap-1 rounded-full px-2.5 text-muted-foreground', activeFilters && 'text-primary')}
                aria-label={t('notes.filters.label')}
              >
                <SlidersHorizontalIcon />
                {t('notes.filters.short')}
                {activeFilters > 0 && (
                  <span className="rounded-full bg-primary/15 px-1 text-[10.5px] leading-4 tabular-nums">{activeFilters}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))] w-52">
              {counts.tags.length > 0 && (
                <>
                  <DropdownMenuLabel>{t('notes.filters.tags')}</DropdownMenuLabel>
                  {counts.tags.map(({ tag, count }) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={filter.tag === tag}
                      onCheckedChange={(checked) => onTag(checked ? tag : null)}
                    >
                      <span className="min-w-0 flex-1 truncate">#{tag}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
              {usedColors.length > 1 && (
                <>
                  {counts.tags.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{t('notes.filters.colors')}</DropdownMenuLabel>
                  {usedColors.map((color) => (
                    <DropdownMenuCheckboxItem
                      key={color}
                      checked={filter.color === color}
                      onCheckedChange={(checked) => onColor(checked ? color : null)}
                    >
                      <ColorSwatch color={color} className="size-3.5" />
                      <span className="flex-1">{t(`notes.colors.${color}`)}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    )
  }

  return (
    <nav aria-label={t('notes.views.label')} className="scrollbar-styled flex w-full flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-0.5">{views}</div>

      <div className="flex flex-col gap-0.5">
        <span className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t('notes.filters.tags')}
        </span>
        {counts.tags.length ? (
          counts.tags.map(({ tag, count }) => (
            <NavButton
              key={tag}
              active={filter.tag === tag}
              layout="sidebar"
              onClick={() => onTag(filter.tag === tag ? null : tag)}
              icon={<HashIcon className="size-3.5 text-violet-500" aria-hidden />}
              label={tag}
              count={count}
              pillId="notes-nav-tags"
            />
          ))
        ) : (
          <p className="px-2.5 text-[11.5px] leading-relaxed text-muted-foreground">{t('notes.filters.noTags')}</p>
        )}
      </div>

      {usedColors.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('notes.filters.colors')}
          </span>
          <div className="flex flex-wrap gap-1.5 px-2.5">
            {usedColors.map((color) => {
              const active = filter.color === color
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={active}
                  aria-label={t(`notes.colors.${color}`)}
                  title={t(`notes.colors.${color}`)}
                  onClick={() => onColor(active ? null : color)}
                  className={cn(
                    'flex size-6 cursor-pointer items-center justify-center rounded-full outline-none transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                >
                  <ColorSwatch color={color} className="size-5">
                    {active && <CheckIcon className={cn('size-3', color === 'charcoal' ? 'text-white' : 'text-foreground')} />}
                  </ColorSwatch>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
