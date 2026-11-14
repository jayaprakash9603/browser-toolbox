import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderPlusIcon, Trash2Icon } from 'lucide-react'

import {
  createCollection,
  deleteCollection,
  deleteSavedRequest,
  duplicateRequest,
  exportWorkspace,
  getApiWorkspace,
  importWorkspace,
  renameCollection,
  saveRequestToCollection,
  type ApiCollection,
  type ApiWorkspaceState,
  type SavedApiRequest,
} from '@/core/interceptor'
import { clearApiHistory, deleteApiHistoryEntry, getApiHistory } from '@/core/interceptor/apiHistory'
import type { ApiExecutionHistory } from '@/core/interceptor/apiFinderTypes'
import { STORAGE_KEYS } from '@/core/constants'
import { formatRelativeTime } from '@/app/pages/home/formatRelativeTime'
import { useApiWorkspace } from '@/features/interceptor/ApiWorkspaceContext'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { useToast } from '@/shared/components/toast/useToast'

import { MethodBadge, statusBadgeClass } from './MethodBadge'

export function CollectionsTab() {
  const { t } = useTranslation()
  const { draft, openExplorerDraft, includeSecrets } = useApiWorkspace()
  const { show } = useToast()
  const [workspace, setWorkspace] = useState<ApiWorkspaceState>({ collections: [], requests: [] })
  const [history, setHistory] = useState<ApiExecutionHistory[]>([])
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')

  const reload = async () => {
    setWorkspace(await getApiWorkspace())
    setHistory(await getApiHistory())
  }

  useEffect(() => {
    queueMicrotask(() => {
      void reload()
    })
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (STORAGE_KEYS.interceptorApiCollections in changes || STORAGE_KEYS.interceptorApiHistory in changes) {
        void reload()
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workspace
    return {
      collections: workspace.collections.filter((collection) => collection.name.toLowerCase().includes(q)),
      requests: workspace.requests.filter(
        (request) =>
          request.name.toLowerCase().includes(q) ||
          request.draft.url.toLowerCase().includes(q) ||
          request.tags.some((tag) => tag.toLowerCase().includes(q)),
      ),
    }
  }, [query, workspace])

  const requestsByCollection = (collection: ApiCollection) =>
    collection.requestIds
      .map((id) => filtered.requests.find((request) => request.id === id) ?? workspace.requests.find((request) => request.id === id))
      .filter((item): item is SavedApiRequest => Boolean(item))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t('interceptor.collections.newName')}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="xs"
            onClick={async () => {
              await createCollection(newName || t('interceptor.collections.untitled'))
              setNewName('')
              await reload()
            }}
          >
            <FolderPlusIcon />
            {t('interceptor.collections.create')}
          </Button>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('interceptor.collections.search')}
          className="h-8 text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!draft}
            onClick={async () => {
              if (!draft) return
              let collection = workspace.collections[0]
              if (!collection) collection = await createCollection(t('interceptor.collections.untitled'))
              await saveRequestToCollection(collection.id, `${draft.method} ${draft.url}`, draft, {
                includeSecrets,
              })
              show(t('interceptor.collections.saved'))
              await reload()
            }}
          >
            {t('interceptor.collections.saveCurrent')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => {
              const blob = new Blob([exportWorkspace(workspace)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = 'one-panel-api-collections.json'
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            {t('interceptor.collections.export')}
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border px-2 py-1 text-xs">
            {t('interceptor.collections.import')}
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                try {
                  await importWorkspace(await file.text())
                  show(t('interceptor.collections.imported'))
                  await reload()
                } catch (error) {
                  show(error instanceof Error ? error.message : t('interceptor.collections.importFailed'), {
                    variant: 'error',
                  })
                }
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>

      {workspace.collections.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t('interceptor.collections.empty')}
        </p>
      ) : (
        filtered.collections.map((collection) => (
          <section key={collection.id} className="rounded-lg border p-[var(--density-card-pad)] shadow-xs">
            <div className="mb-3 flex items-center gap-2">
              <Input
                defaultValue={collection.name}
                className="h-7 text-xs font-medium"
                onBlur={(event) => {
                  const name = event.target.value.trim()
                  if (name && name !== collection.name) void renameCollection(collection.id, name).then(setWorkspace)
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('interceptor.collections.delete')}
                onClick={() => void deleteCollection(collection.id).then(setWorkspace)}
              >
                <Trash2Icon />
              </Button>
            </div>
            <ul className="space-y-1.5">
              {requestsByCollection(collection).map((request) => (
                <li key={request.id} className="flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-muted/50">
                  <MethodBadge method={request.draft.method} />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-xs"
                    onClick={() => openExplorerDraft(request.draft)}
                  >
                    {request.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => void duplicateRequest(request.id).then(() => reload())}
                  >
                    {t('interceptor.collections.duplicate')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void deleteSavedRequest(request.id).then(setWorkspace)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold">{t('interceptor.history.title')}</h3>
          <Button type="button" variant="ghost" size="xs" onClick={() => void clearApiHistory().then(() => setHistory([]))}>
            {t('interceptor.history.clear')}
          </Button>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('interceptor.history.empty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <MethodBadge method={entry.method} />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left font-mono text-[11px]"
                  onClick={() => openExplorerDraft(entry.draft)}
                >
                  {entry.url}
                </button>
                <span className={`font-mono text-[11px] ${statusBadgeClass(entry.status)}`}>{entry.status ?? entry.result}</span>
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(entry.at)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void deleteApiHistoryEntry(entry.id).then(setHistory)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
