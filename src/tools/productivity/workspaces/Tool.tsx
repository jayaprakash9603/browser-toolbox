import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  CopyIcon,
  DownloadIcon,
  LayersIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'

import { readTabs } from '../tab-manager/tabActions'
import { toTabInfo, type TabInfo } from '../tab-manager/tabModel'
import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import { ProductivityToolActions } from '../_shared/ProductivityToolActions'
import { filterWorkspaces, loadWorkspaces, newWorkspace, saveWorkspaces, type TabWorkspace } from './model'

export default function WorkspacesTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.workspaces')
  const reduce = useReducedMotion()
  const [workspaces, setWorkspaces] = useState<TabWorkspace[]>([])
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [pendingTabs, setPendingTabs] = useState<TabInfo[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    void loadWorkspaces().then((list) => {
      setWorkspaces(list)
      setLoaded(true)
    })
  }, [])

  const persist = async (next: TabWorkspace[]) => {
    setWorkspaces(next)
    await saveWorkspaces(next)
  }

  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 3200)
  }

  const captureCurrent = useCallback(async () => {
    setSaving(true)
    try {
      const raw = await readTabs()
      const tabs = raw.map(toTabInfo).filter((tab): tab is TabInfo => tab !== null && Boolean(tab.url))
      setPendingTabs(tabs)
      setName(t('workspaces.defaultName', { date: new Date().toLocaleDateString() }))
      setNote('')
      setDialogOpen(true)
    } catch {
      notify(t('workspaces.captureError'))
    } finally {
      setSaving(false)
    }
  }, [t])

  const confirmSave = async () => {
    if (!pendingTabs.length) return
    const workspace = newWorkspace(
      name,
      pendingTabs.map((tab) => ({ url: tab.url, title: tab.title })),
      note,
    )
    await persist([workspace, ...workspaces])
    setDialogOpen(false)
    notify(t('workspaces.saved', { count: pendingTabs.length }))
  }

  const restore = async (workspace: TabWorkspace) => {
    const [first, ...rest] = workspace.tabs.filter((tab) => tab.url)
    if (!first?.url) return
    const win = await chrome.windows.create({ url: first.url, focused: true })
    if (win?.id == null) return
    for (const tab of rest) {
      await chrome.tabs.create({ url: tab.url, windowId: win.id, active: false })
    }
    notify(t('workspaces.restored', { count: workspace.tabs.length }))
  }

  const remove = async (id: string) => {
    await persist(workspaces.filter((w) => w.id !== id))
    notify(t('workspaces.deleted'))
  }

  const duplicate = async (workspace: TabWorkspace) => {
    const copy = newWorkspace(`${workspace.name} (${t('workspaces.copySuffix')})`, workspace.tabs, workspace.note)
    await persist([copy, ...workspaces])
    notify(t('workspaces.duplicated'))
  }

  const exportOne = (workspace: TabWorkspace) => {
    downloadBlob(
      new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' }),
      `${workspace.name.replace(/[^\w-]+/g, '-').slice(0, 40) || 'session'}.json`,
    )
  }

  const sorted = useMemo(() => [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt), [workspaces])
  const visible = useMemo(() => filterWorkspaces(sorted, query), [sorted, query])

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <ToolSearchLayout
        header={
          <>
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('workspaces.search')}
                ariaLabel={t('workspaces.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <Button size="sm" className="shrink-0" onClick={() => void captureCurrent()} disabled={saving}>
                <PlusIcon />
                {t('workspaces.saveCurrent')}
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={t('workspaces.exportAll')}
                title={t('workspaces.exportAll')}
                disabled={!workspaces.length}
                onClick={() =>
                  downloadBlob(
                    new Blob([JSON.stringify(workspaces, null, 2)], { type: 'application/json' }),
                    `tab-sessions-${new Date().toISOString().slice(0, 10)}.json`,
                  )
                }
              >
                <DownloadIcon />
              </Button>
            </div>
          </>
        }
        footer={
          <ProductivityStatusBar>
            {toast ? (
              <p role="status" className="text-center text-xs font-medium text-foreground">
                {toast}
              </p>
            ) : loaded ? (
              t('workspaces.summary', { count: visible.length })
            ) : null}
          </ProductivityStatusBar>
        }
        bodyClassName="pb-3 pt-2.5"
      >
        {!loaded ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <ArchiveIcon className="size-9 text-primary/70" aria-hidden />
            <p className="text-sm font-medium">{query.trim() ? t('workspaces.noMatch') : t('workspaces.emptyTitle')}</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query.trim() ? t('workspaces.noMatchHint') : t('workspaces.emptyHint')}
            </p>
            {query.trim() ? (
              <Button size="sm" variant="outline" onClick={() => setQuery('')}>
                {t('workspaces.clearSearch')}
              </Button>
            ) : null}
          </div>
        ) : (
          <StaggerChildren className="space-y-2" stagger={0.05}>
            {visible.map((workspace) => (
              <StaggerItem key={workspace.id}>
                <motion.div
                  layout={!reduce}
                  className="rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LayersIcon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{workspace.name}</h3>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {t('workspaces.tabCount', { count: workspace.tabs.length })} ·{' '}
                        {new Date(workspace.updatedAt).toLocaleString()}
                      </p>
                      {workspace.note && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{workspace.note}</p>
                      )}
                    </div>
                  </div>
                  <ul className="mb-2 max-h-20 space-y-0.5 overflow-hidden rounded-lg bg-muted/40 p-2 text-[10px]">
                    {workspace.tabs.slice(0, 4).map((tab, i) => (
                      <li key={`${workspace.id}-${i}`} className="truncate font-mono text-muted-foreground">
                        {tab.title || tab.url}
                      </li>
                    ))}
                    {workspace.tabs.length > 4 && (
                      <li className="text-muted-foreground/80">
                        {t('workspaces.moreTabs', { count: workspace.tabs.length - 4 })}
                      </li>
                    )}
                  </ul>
                  <ProductivityToolActions>
                    <Button size="xs" onClick={() => void restore(workspace)}>
                      <PlayIcon />
                      {t('workspaces.restore')}
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => exportOne(workspace)}>
                      <DownloadIcon />
                      {t('workspaces.export')}
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => void duplicate(workspace)}>
                      <CopyIcon />
                      {t('workspaces.duplicate')}
                    </Button>
                    <Button size="xs" variant="ghost" className="text-destructive" onClick={() => void remove(workspace.id)}>
                      <Trash2Icon />
                      {t('workspaces.delete')}
                    </Button>
                  </ProductivityToolActions>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspaces.saveDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="workspace-name">{t('workspaces.fieldName')}</Label>
              <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="workspace-note">{t('workspaces.fieldNote')}</Label>
              <Textarea id="workspace-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 text-xs" />
            </div>
            <p className="text-xs text-muted-foreground">{t('workspaces.saveDialogHint', { count: pendingTabs.length })}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={() => void confirmSave()} disabled={!pendingTabs.length}>
              {t('workspaces.confirmSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolPage>
  )
}
