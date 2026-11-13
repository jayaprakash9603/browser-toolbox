import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence } from 'motion/react'

import type { BookmarkDisplayMode, BookmarkWorkspace, HealthKind } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

import { BookmarkCard } from './BookmarkCard'
import { BookmarkFolderRow } from './BookmarkFolderRow'
import { BookmarkResultRow, type BookmarkRowActions } from './BookmarkResultRow'
import { ReorderableRows } from './ReorderableRows'
import { StatusBadges } from './StatusBadges'
import { itemMeta } from '@/core/bookmarks'
import { BookmarkFavicon } from './BookmarkFavicon'
import { CardMenu, type CardMenuActions } from './CardMenu'
import { bookmarkDomain, type BookmarkFolder, type BookmarkRow } from './service'

const VIRTUALIZE_AFTER = 80

export interface GalleryHandlers {
  selected: ReadonlySet<string>
  duplicates: ReadonlySet<string>
  onSelect: (id: string, selected: boolean) => void
  onOpen: (row: BookmarkRow) => void
  actionsFor: (row: BookmarkRow, index: number) => BookmarkRowActions & CardMenuActions
  healthOf: (url: string) => HealthKind | undefined
}

export function BookmarkGallery({
  rows,
  folders,
  mode,
  reorderable,
  workspace,
  highlightId,
  browsing,
  onCommit,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  handlers,
}: {
  rows: readonly BookmarkRow[]
  folders: readonly BookmarkFolder[]
  mode: BookmarkDisplayMode
  reorderable: boolean
  workspace: BookmarkWorkspace
  highlightId: string | null
  browsing: boolean
  onCommit: (movedId: string, orderedIds: string[]) => void
  onOpenFolder: (folder: BookmarkFolder) => void
  onRenameFolder: (folder: BookmarkFolder) => void
  onDeleteFolder: (folder: BookmarkFolder) => void
  onMoveFolder: (folder: BookmarkFolder) => void
  handlers: GalleryHandlers
}) {
  const folderList = (
    <AnimatePresence initial={false}>
      {folders.map((folder) => (
        <BookmarkFolderRow
          key={folder.id}
          folder={folder}
          onOpen={onOpenFolder}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
          onMove={onMoveFolder}
        />
      ))}
    </AnimatePresence>
  )
  if (reorderable) {
    return (
      <div className="flex flex-col gap-1.5">
        {folderList}
        <ReorderableRows
          rows={rows}
          onCommit={onCommit}
          renderRow={(row, index, commit) => (
            <BookmarkResultRow
              key={row.id}
              row={row}
              reorderable
              onDragEnd={commit}
              highlighted={highlightId === row.id}
              duplicate={handlers.duplicates.has(row.id)}
              {...handlers.actionsFor(row, index)}
            />
          )}
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      {folderList}
      <RowList rows={rows} mode={mode} workspace={workspace} browsing={browsing} highlightId={highlightId} handlers={handlers} />
    </div>
  )
}

function RowList({
  rows,
  mode,
  workspace,
  browsing,
  highlightId,
  handlers,
}: {
  rows: readonly BookmarkRow[]
  mode: BookmarkDisplayMode
  workspace: BookmarkWorkspace
  browsing: boolean
  highlightId: string | null
  handlers: GalleryHandlers
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const grid = mode === 'visual' || mode === 'compact'
  const estimate = mode === 'visual' ? 196 : mode === 'compact' ? 108 : mode === 'minimal' ? 40 : 58
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimate,
    overscan: 8,
  })
  if (rows.length < VIRTUALIZE_AFTER) {
    return (
      <div className={gridClass(mode)}>
        {rows.map((row, index) => renderItem(row, index, mode, workspace, browsing, highlightId, handlers))}
      </div>
    )
  }
  return (
    <div ref={parentRef} className="max-h-[70vh] overflow-auto" style={{ contain: 'strict' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]
          return (
            <div
              key={row.id}
              className={cn(grid && 'px-0')}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
            >
              {renderItem(row, item.index, mode, workspace, browsing, highlightId, handlers)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function gridClass(mode: BookmarkDisplayMode): string {
  if (mode === 'visual') return 'grid grid-cols-1 gap-[var(--density-grid-gap)] @[420px]:grid-cols-2'
  if (mode === 'compact') return 'grid grid-cols-1 gap-[var(--density-grid-gap)] @[420px]:grid-cols-2'
  return 'flex flex-col gap-1.5'
}

function renderItem(
  row: BookmarkRow,
  index: number,
  mode: BookmarkDisplayMode,
  workspace: BookmarkWorkspace,
  browsing: boolean,
  highlightId: string | null,
  handlers: GalleryHandlers,
): ReactNode {
  const actions = handlers.actionsFor(row, index)
  if (mode === 'visual' || mode === 'compact') {
    return (
      <BookmarkCard
        row={row}
        workspace={workspace}
        mode={mode}
        selected={handlers.selected.has(row.id)}
        duplicate={handlers.duplicates.has(row.id)}
        health={handlers.healthOf(row.url)}
        onSelect={handlers.onSelect}
        onOpen={() => handlers.onOpen(row)}
        actions={actions}
      />
    )
  }
  if (mode === 'minimal') {
    return <MinimalRow row={row} workspace={workspace} onOpen={() => handlers.onOpen(row)} actions={actions} />
  }
  return (
    <BookmarkResultRow
      row={row}
      showFolder={!browsing}
      highlighted={highlightId === row.id}
      duplicate={handlers.duplicates.has(row.id)}
      badges={
        <StatusBadges
          meta={itemMeta(workspace, row.id)}
          health={handlers.healthOf(row.url)}
          duplicate={handlers.duplicates.has(row.id)}
        />
      }
      {...actions}
    />
  )
}

function MinimalRow({
  row,
  workspace,
  onOpen,
  actions,
}: {
  row: BookmarkRow
  workspace: BookmarkWorkspace
  onOpen: () => void
  actions: CardMenuActions
}) {
  const meta = itemMeta(workspace, row.id)
  return (
    <div className="flex min-h-10 items-center gap-2 rounded-lg px-1.5 hover:bg-muted/40">
      <BookmarkFavicon url={row.url} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px]">
        {row.title}
        <span className="ml-2 text-[11px] text-muted-foreground">{bookmarkDomain(row.url)}</span>
      </button>
      <StatusBadges meta={meta} />
      <CardMenu actions={actions} trigger={<span className="text-muted-foreground">···</span>} />
    </div>
  )
}
