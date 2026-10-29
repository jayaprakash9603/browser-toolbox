import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  LayersIcon,
  LayoutPanelTopIcon,
  MoreVerticalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { countDuplicateTabs, hostOf, type TabWorkspace } from './model'

const PREVIEW_TABS = 3

export interface WorkspaceCardActions {
  onRestore: (workspace: TabWorkspace, mode: 'window' | 'current') => void
  onAddActiveTab: (workspace: TabWorkspace) => void
  onDedupe: (workspace: TabWorkspace) => void
  onTogglePin: (workspace: TabWorkspace) => void
  onEdit: (workspace: TabWorkspace) => void
  onDuplicate: (workspace: TabWorkspace) => void
  onCopyMarkdown: (workspace: TabWorkspace) => void
  onExport: (workspace: TabWorkspace) => void
  onDelete: (workspace: TabWorkspace) => void
  onOpenTab: (url: string) => void
  onCopyTabUrl: (url: string) => void
  onRemoveTab: (workspace: TabWorkspace, index: number) => void
  onTagClick: (tag: string) => void
}

export function WorkspaceCard({ workspace, ...actions }: { workspace: TabWorkspace } & WorkspaceCardActions) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const duplicates = countDuplicateTabs(workspace.tabs)
  const shown = expanded ? workspace.tabs : workspace.tabs.slice(0, PREVIEW_TABS)
  const hidden = workspace.tabs.length - PREVIEW_TABS

  return (
    <motion.article
      layout={!reduce}
      className={cn(
        'rounded-xl border bg-card p-3 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-sm',
        workspace.pinned && 'border-primary/25 bg-primary/[0.03]',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LayersIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {workspace.pinned && <PinIcon className="size-3.5 shrink-0 text-primary" aria-hidden />}
            <h3 className="truncate text-sm font-semibold tracking-tight">{workspace.name}</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {t('workspaces.tabCount', { count: workspace.tabs.length })} ·{' '}
            {new Date(workspace.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          {workspace.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{workspace.note}</p>}
          {!!workspace.tags?.length && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {workspace.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => actions.onTagClick(tag)}
                  className="cursor-pointer rounded-full border bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
        <CardMenu workspace={workspace} {...actions} />
      </div>

      <ul className="mt-2.5 space-y-0.5 rounded-lg bg-muted/40 p-1.5">
        <AnimatePresence initial={false}>
          {shown.map((tab, index) => (
            <motion.li
              key={`${tab.url}-${index}`}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="group/tab flex items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-1 hover:bg-background/70"
            >
              <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
              <button
                type="button"
                onClick={() => actions.onOpenTab(tab.url)}
                title={tab.url}
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-[11px] text-foreground/85 hover:text-primary"
              >
                {tab.title || tab.url}
              </button>
              <span className="hidden shrink-0 font-mono text-[9px] text-muted-foreground @[420px]:inline">
                {hostOf(tab.url)}
              </span>
              <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-focus-within/tab:opacity-100 sm:group-hover/tab:opacity-100">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-6"
                  aria-label={t('workspaces.copyUrl')}
                  title={t('workspaces.copyUrl')}
                  onClick={() => actions.onCopyTabUrl(tab.url)}
                >
                  <CopyIcon className="size-3" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-6 hover:text-destructive"
                  aria-label={t('workspaces.removeSingleTab')}
                  title={t('workspaces.removeSingleTab')}
                  onClick={() => actions.onRemoveTab(workspace, index)}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {hidden > 0 && (
          <li>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md py-1 text-[10.5px] font-medium text-primary transition-colors hover:bg-background/70"
            >
              <ChevronDownIcon className={cn('size-3 transition-transform duration-200', expanded && 'rotate-180')} />
              {expanded ? t('workspaces.hideTabs') : t('workspaces.showAllTabs', { count: workspace.tabs.length })}
            </button>
          </li>
        )}
      </ul>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button size="xs" onClick={() => actions.onRestore(workspace, 'window')}>
          <PlayIcon />
          {t('workspaces.restore')}
        </Button>
        <Button size="xs" variant="outline" onClick={() => actions.onRestore(workspace, 'current')}>
          <LayoutPanelTopIcon />
          {t('workspaces.openCurrent')}
        </Button>
        <Button size="xs" variant="outline" onClick={() => actions.onAddActiveTab(workspace)}>
          <PlusIcon />
          {t('workspaces.addActiveTab')}
        </Button>
        {duplicates > 0 && (
          <Button size="xs" variant="ghost" className="text-amber-600 dark:text-amber-400" onClick={() => actions.onDedupe(workspace)}>
            {t('workspaces.dedupeTabs', { count: duplicates })}
          </Button>
        )}
      </div>
    </motion.article>
  )
}

function CardMenu({ workspace, ...actions }: { workspace: TabWorkspace } & WorkspaceCardActions) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-xs" variant="ghost" className="shrink-0" aria-label={t('nav.moreOptions')}>
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => actions.onEdit(workspace)}>
          <PencilIcon className="size-4" />
          {t('workspaces.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onTogglePin(workspace)}>
          {workspace.pinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
          {workspace.pinned ? t('workspaces.unpin') : t('workspaces.pin')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onDuplicate(workspace)}>
          <CopyIcon className="size-4" />
          {t('workspaces.duplicate')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => actions.onCopyMarkdown(workspace)}>
          <FileTextIcon className="size-4" />
          {t('workspaces.copyMarkdown')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onExport(workspace)}>
          <DownloadIcon className="size-4" />
          {t('workspaces.export')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onRestore(workspace, 'window')}>
          <ExternalLinkIcon className="size-4" />
          {t('workspaces.restore')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => actions.onDelete(workspace)}>
          <Trash2Icon className="size-4" />
          {t('workspaces.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
