import { MotionConfig } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { FolderOpenIcon, SearchIcon } from 'lucide-react'

import { canonicalizeBookmarkUrl } from '@/core/bookmarks'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'

import { BookmarkBreadcrumb } from './BookmarkBreadcrumb'
import { BookmarkFilters } from './BookmarkFilters'
import { BookmarkFormDialog, FolderFormDialog } from './BookmarkDialogs'
import { BookmarkGallery } from './BookmarkGallery'
import { BookmarkNav } from './BookmarkNav'
import { AddMenu, MoreMenu } from './BookmarkMenus'
import { BulkBar } from './BulkBar'
import { CollectionGrid, ProjectGrid } from './GroupGrid'
import { DuplicateReview } from './DuplicateReview'
import { ScopeHeader } from './ScopeHeader'
import { itemMeta } from '@/core/bookmarks'
import { HealthCenter } from './HealthCenter'
import { ImportPreviewPanel } from './ImportPreview'
import { NamedDialog } from './NamedDialog'
import { OrganizePreview } from './OrganizePreview'
import { OverviewStrip } from './OverviewStrip'
import { TagManager } from './TagManager'
import { ViewToolbar } from './ViewToolbar'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import type { useBookmarkWorkspace } from './useBookmarkWorkspace'
import type { BookmarkRow } from './service'

type Workspace = ReturnType<typeof useBookmarkWorkspace>

export function WorkspaceShell({ model, granted }: { model: Workspace; granted: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToolSearchLayout
        header={<WorkspaceHeader model={model} granted={granted} />}
        footer={<WorkspaceFooter model={model} />}
        bodyClassName="pb-3 pt-2"
      >
        <WorkspaceBody model={model} />
      </ToolSearchLayout>
      <WorkspaceDialogs model={model} />
    </MotionConfig>
  )
}

function WorkspaceHeader({ model, granted }: { model: Workspace; granted: boolean }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-center gap-1.5">
        <SearchInput
          value={model.query}
          onChange={model.setQuery}
          placeholder={t('bookmarks.search')}
          ariaLabel={t('bookmarks.search')}
          shortcut="/"
          className="min-w-0 flex-1"
        />
        <AddMenu
          disabled={!granted}
          onNewBookmark={() => model.startBookmarkDraft()}
          onBookmarkTab={() => void model.startTabDraft()}
          onNewFolder={() =>
            model.setFolderDraft({ key: crypto.randomUUID(), mode: 'create', name: '', parentId: model.defaultFolderId })
          }
          onNewCollection={() =>
            model.setNamedDraft({ key: crypto.randomUUID(), kind: 'collection', name: '', icon: 'folder', color: 'violet' })
          }
          onNewProject={() =>
            model.setNamedDraft({ key: crypto.randomUUID(), kind: 'project', name: '', icon: 'folder', color: 'indigo' })
          }
        />
        <MoreMenu
          rows={[...model.overlayRows]}
          loading={model.loading}
          onRefresh={() => void model.load()}
          onCopy={model.copyText}
          onDownload={model.download}
          onOpenBatch={model.openBatch}
          onImport={model.pickFile}
          onScan={() => void model.runScan(model.overlayRows)}
          onOrganize={() => model.setOrganizeOpen(true)}
          onExportNested={model.exportNested}
          onExportOverlay={model.exportOverlay}
        />
      </div>
      <OverviewStrip stats={model.stats} chips={model.chips} onToggle={model.toggleChip} />
      <BookmarkNav value={model.nav} onChange={model.setNav} />
      {model.nav === 'all' && (
        <BookmarkFilters
          folders={model.library.folders}
          folderId={model.folderId}
          onFolderChange={model.selectFolder}
          domains={model.domains}
          domain={model.domain}
          onDomainChange={model.setDomain}
          view={model.view}
          onViewChange={model.setView}
          duplicateCount={model.list.duplicates.size}
          sort={model.sort}
          onSortChange={model.setSort}
          canSortManually={Boolean(model.list.current)}
        />
      )}
      <ViewToolbar
        mode={model.mode}
        onMode={model.setMode}
        sort={model.sort}
        onSort={model.setSort}
        canSortManually={model.reorderable}
      />
      {model.list.current && model.nav === 'all' && (
        <BookmarkBreadcrumb
          trail={model.trail}
          onNavigate={model.selectFolder}
          onAddFolder={() =>
            model.setFolderDraft({
              key: crypto.randomUUID(),
              mode: 'create',
              name: '',
              parentId: model.list.current?.id ?? model.defaultFolderId,
            })
          }
        />
      )}
      <BulkBar
        count={model.selected.size}
        tags={Object.values(model.workspace.tags)}
        onTag={model.bulkTag}
        onClear={() => model.setSelected(new Set())}
      />
      {model.error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {model.error}
        </p>
      )}
    </>
  )
}

function WorkspaceFooter({ model }: { model: Workspace }) {
  const { t } = useTranslation()
  const status =
    model.overlayRows.length === model.library.rows.length
      ? t('bookmarks.summary', { count: model.overlayRows.length })
      : t('bookmarks.summaryFiltered', { visible: model.overlayRows.length, total: model.library.rows.length })
  return (
    <ProductivityStatusBar
      trailing={
        model.reorderable ? (
          <span className="hidden text-[10.5px] @[560px]:inline">{t('bookmarks.reorderHint')}</span>
        ) : model.filtersActive ? (
          <Button size="xs" variant="ghost" className="h-6 px-2 text-primary" onClick={model.resetFilters}>
            {t('bookmarks.clearFilters')}
          </Button>
        ) : undefined
      }
    >
      {status}
    </ProductivityStatusBar>
  )
}

function WorkspaceBody({ model }: { model: Workspace }) {
  const { t } = useTranslation()
  if (!model.loaded) {
    return (
      <ul className="space-y-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="h-14 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </ul>
    )
  }
  if (model.nav === 'collections' && model.collectionId === 'all') {
    return (
      <CollectionGrid
        collections={Object.values(model.workspace.collections)}
        onOpen={model.setCollectionId}
        onCreate={() =>
          model.setNamedDraft({ key: crypto.randomUUID(), kind: 'collection', name: '', icon: 'folder', color: 'violet' })
        }
      />
    )
  }
  if (model.nav === 'projects' && model.projectId === 'all') {
    return (
      <ProjectGrid
        projects={Object.values(model.workspace.projects)}
        onOpen={model.setProjectId}
        onCreate={() =>
          model.setNamedDraft({ key: crypto.randomUUID(), kind: 'project', name: '', icon: 'folder', color: 'indigo' })
        }
      />
    )
  }
  const collection = model.collectionId !== 'all' ? model.workspace.collections[model.collectionId] : undefined
  const project = model.projectId !== 'all' ? model.workspace.projects[model.projectId] : undefined
  if (model.nav === 'tags') {
    return (
      <TagManager
        workspace={model.workspace}
        onFilter={(id) => {
          model.setTagIds([id])
          model.setNav('all')
        }}
        onRename={model.renameTag}
        onMerge={model.mergeTags}
        onDelete={model.deleteTag}
        onCreate={model.createTagAndReturnId}
      />
    )
  }
  if (model.nav === 'health') {
    return (
      <div className="flex flex-col gap-4">
        <HealthCenter
          health={model.workspace.health}
          rows={model.library.rows}
          emptyFolders={model.emptyFolders}
          missingTitles={model.missingTitles}
          scanning={model.scanning}
          progress={model.scanProgress}
          schedule={model.workspace.prefs.healthSchedule}
          lastScanAt={model.workspace.prefs.lastHealthScanAt}
          onScanAll={() => void model.runScan(model.library.rows)}
          onScanFolder={() => void model.runScan(model.overlayRows)}
          onToggleSchedule={model.toggleSchedule}
          onOpen={model.openRow}
        />
        <DuplicateReview
          groups={model.groups}
          onKeep={model.keepDuplicate}
          onMerge={model.mergeDuplicate}
          onKeepBoth={model.keepBoth}
        />
      </div>
    )
  }
  if (model.overlayRows.length === 0 && model.list.subfolders.length === 0) {
    const browsing = model.list.browsing && !model.filtersActive
    const Icon = browsing ? FolderOpenIcon : SearchIcon
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="size-6 text-primary" aria-hidden />
        </span>
        <p className="text-sm font-semibold">{browsing ? t('bookmarks.folderEmpty') : t('bookmarks.emptyTitle')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {browsing ? t('bookmarks.folderEmptyHint') : t('bookmarks.emptyHint')}
        </p>
        {!browsing && (
          <Button size="sm" variant="outline" className="mt-1" onClick={model.resetFilters}>
            {t('bookmarks.clearFilters')}
          </Button>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      {collection && (
        <ScopeHeader
          title={collection.name}
          onBack={() => model.setCollectionId('all')}
          onEdit={() =>
            model.setNamedDraft({
              key: collection.id,
              kind: 'collection',
              id: collection.id,
              name: collection.name,
              icon: collection.icon,
              color: collection.color,
            })
          }
          onDelete={() => model.setEntityToDelete({ kind: 'collection', id: collection.id, name: collection.name })}
        />
      )}
      {project && (
        <ScopeHeader
          title={project.name}
          onBack={() => model.setProjectId('all')}
          onEdit={() =>
            model.setNamedDraft({
              key: project.id,
              kind: 'project',
              id: project.id,
              name: project.name,
              icon: 'folder',
              color: project.color,
            })
          }
          onDelete={() => model.setEntityToDelete({ kind: 'project', id: project.id, name: project.name })}
        />
      )}
    <BookmarkGallery
      rows={model.overlayRows}
      folders={model.nav === 'all' ? model.list.subfolders : []}
      mode={model.mode}
      reorderable={model.reorderable}
      workspace={model.workspace}
      highlightId={model.highlightId}
      browsing={model.list.browsing}
      onCommit={model.commitReorder}
      onOpenFolder={(folder) => model.selectFolder(folder.id)}
      onRenameFolder={(folder) =>
        model.setFolderDraft({
          key: folder.id,
          mode: 'rename',
          folder,
          name: folder.title,
          parentId: folder.parentId ?? model.defaultFolderId,
        })
      }
      onDeleteFolder={model.setFolderToDelete}
      onMoveFolder={(folder) =>
        model.setFolderDraft({
          key: folder.id,
          mode: 'move',
          folder,
          name: folder.title,
          parentId: folder.parentId ?? model.defaultFolderId,
          excludeIds: model.subtreeIds(folder.id),
        })
      }
      handlers={{
        selected: model.selected,
        duplicates: model.list.duplicates,
        onSelect: (id, selected) => {
          const next = new Set(model.selected)
          if (selected) next.add(id)
          else next.delete(id)
          model.setSelected(next)
        },
        onOpen: model.openRow,
        healthOf: (url) => healthOf(model, url),
        actionsFor: (row, index) => actionsFor(model, row, index),
      }}
    />
    </div>
  )
}

function healthOf(model: Workspace, url: string) {
  return model.workspace.health[canonicalizeBookmarkUrl(url)]?.kind
}

function actionsFor(model: Workspace, row: BookmarkRow, index: number) {
  return {
    onOpen: () => model.openRow(row),
    onCopyUrl: () => model.copyText(row.url, 'bookmarks.copied'),
    onCopyMarkdown: () => model.copyText(model.markdown(row), 'bookmarks.markdownCopied'),
    onEdit: () => model.editRow(row),
    onDelete: () => model.deleteRow(row),
    onFavorite: () => model.favorite(row),
    onReading: (status: 'unread' | 'reading' | 'completed' | 'archived') => model.setReadingStatusFor(row, status),
    onMoveUp: model.reorderable && index > 0 ? () => model.moveBy(row, -1) : undefined,
    onMoveDown: model.reorderable && index < model.overlayRows.length - 1 ? () => model.moveBy(row, 1) : undefined,
    collections: Object.values(model.workspace.collections)
      .slice(0, 8)
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        assigned: itemMeta(model.workspace, row.id).collectionIds.includes(collection.id),
      })),
    onToggleCollection: (id: string, assigned: boolean) => model.assignToCollection(row, id, assigned),
    onTogglePin: model.projectId !== 'all' ? () => model.toggleProjectPin(row) : undefined,
  }
}

function WorkspaceDialogs({ model }: { model: Workspace }) {
  const { t } = useTranslation()
  return (
    <>
      <BookmarkFormDialog
        draft={model.bookmarkDraft}
        folders={model.library.folders}
        workspace={model.workspace}
        onClose={() => model.setBookmarkDraft(null)}
        onSubmit={model.submitBookmark}
        onCreateTag={model.createTagAndReturnId}
      />
      <FolderFormDialog
        draft={model.folderDraft}
        folders={model.library.folders}
        onClose={() => model.setFolderDraft(null)}
        onSubmit={model.submitFolder}
      />
      <NamedDialog draft={model.namedDraft} onClose={() => model.setNamedDraft(null)} onSubmit={model.submitNamed} />
      <ConfirmDialog
        open={Boolean(model.folderToDelete)}
        onOpenChange={(open) => !open && model.setFolderToDelete(null)}
        title={t('bookmarks.deleteFolderTitle', { name: model.folderToDelete?.title ?? '' })}
        description={t('bookmarks.deleteFolderBody', { count: model.folderToDelete?.count ?? 0 })}
        confirmLabel={t('bookmarks.deleteFolderConfirm')}
        destructive
        onConfirm={model.confirmDeleteFolder}
      />
      <ConfirmDialog
        open={Boolean(model.entityToDelete)}
        onOpenChange={(open) => !open && model.setEntityToDelete(null)}
        title={t(
          model.entityToDelete?.kind === 'project' ? 'bookmarks.project.deleteTitle' : 'bookmarks.collection.deleteTitle',
          { name: model.entityToDelete?.name ?? '' },
        )}
        description={t('bookmarks.collection.deleteBody')}
        confirmLabel={t('bookmarks.delete')}
        destructive
        onConfirm={model.confirmDeleteEntity}
      />
      <Dialog open={Boolean(model.importPreview)} onOpenChange={(open) => !open && model.importPreviewSet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bookmarks.import.title')}</DialogTitle>
          </DialogHeader>
          {model.importPreview && (
            <ImportPreviewPanel
              preview={model.importPreview}
              folders={model.library.folders}
              destination={model.importDest}
              skipDupes={model.skipDupes}
              onDestination={model.setImportDest}
              onSkipDupes={model.setSkipDupes}
              onToggle={(index, selected) => {
                const next = { ...model.importPreview! }
                next.selected = [...next.selected]
                next.selected[index] = selected
                model.importPreviewSet(next)
              }}
              onConfirm={() => void model.confirmImport()}
              onClose={() => model.importPreviewSet(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={model.organizeOpen} onOpenChange={model.setOrganizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bookmarks.organize.title')}</DialogTitle>
          </DialogHeader>
          <OrganizePreview suggestions={model.suggestions} rows={model.library.rows} onApply={(items) => void model.applyOrganize(items)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
