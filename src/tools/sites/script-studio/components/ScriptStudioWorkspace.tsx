import {
  ArchiveRestoreIcon,
  BookOpenIcon,
  Code2Icon,
  ExternalLinkIcon,
  FileCode2Icon,
  GlobeIcon,
  LibraryIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'

import type { useScriptStudio } from '../hooks/useScriptStudio'
import { BackupView } from './BackupView'
import { LibraryView } from './LibraryView'
import { ApiReferencePanel, ScriptEditor } from './ScriptEditor'
import { SettingsView } from './SettingsView'
import { SetupWizard } from './SetupWizard'
import { StudioGuide } from './StudioGuide'
import { ThisPagePanel } from './ThisPagePanel'

import { DASHBOARD_TABS, PANEL_TABS, type StudioTab } from './workspaceTabs'

const TAB_ICONS: Record<StudioTab, LucideIcon> = {
  thisPage: GlobeIcon,
  library: LibraryIcon,
  editor: FileCode2Icon,
  trash: Trash2Icon,
  settings: SettingsIcon,
  backup: ArchiveRestoreIcon,
  api: BookOpenIcon,
}

type Studio = ReturnType<typeof useScriptStudio>

type Props = {
  studio: Studio
  surface: 'panel' | 'tab'
  tab: StudioTab
  onTabChange: (tab: StudioTab) => void
  editId: string | null
  onEdit: (id: string) => void
  url?: string | null
  onOpenDashboard?: () => void
}

export function ScriptStudioWorkspace({ studio: ss, surface, tab, onTabChange, editId, onEdit, url, onOpenDashboard }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [guideDismissed, setGuideDismissed] = useState(false)
  const [editor, setEditor] = useState<{ id: string; code: string; values: Record<string, unknown> } | null>(null)

  const { loadCode, loadValues } = ss
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    void Promise.all([loadCode(editId), loadValues(editId)]).then(([code, values]) => {
      if (!cancelled) setEditor({ id: editId, code: code ?? '', values })
    })
    return () => {
      cancelled = true
    }
  }, [editId, loadCode, loadValues])

  if (!ss.index || !ss.settings) return null
  const index = ss.index
  const settings = ss.settings

  const tabs = surface === 'panel' ? PANEL_TABS : DASHBOARD_TABS
  const live = index.scripts.filter((s) => !s.trashed)
  const trashed = index.scripts.length - live.length
  const enabledCount = live.filter((s) => s.enabled).length
  const record = editId ? index.scripts.find((s) => s.id === editId) : undefined
  const ready = ss.probe?.operational === true

  const create = async () => {
    const id = await ss.createScript()
    onEdit(id)
  }

  const bulkEnable = (ids: string[], on: boolean) => {
    for (const id of ids) {
      const r = index.scripts.find((s) => s.id === id)
      if (r) void ss.toggleScript(r, on)
    }
  }

  const counts: Partial<Record<StudioTab, number>> = { library: live.length, trash: trashed || undefined }

  const renderTab = (id: StudioTab) => {
    switch (id) {
      case 'thisPage':
        return (
          <ThisPagePanel
            url={url ?? null}
            scripts={index.scripts}
            settings={settings}
            onToggle={(r, on) => void ss.toggleScript(r, on)}
            loadCode={ss.loadCode}
          />
        )
      case 'library':
        return (
          <LibraryView
            scripts={index.scripts}
            onToggle={(r, on) => void ss.toggleScript(r, on)}
            onSelect={onEdit}
            onTrash={(ids) => ids.forEach((sid) => void ss.trashScript(sid))}
            onRestore={(sid) => void ss.restoreScriptById(sid)}
            onBulkEnable={bulkEnable}
            onCheckUpdates={(ids) => void sendMessage({ type: 'SCRIPT_STUDIO_CHECK_UPDATES', scriptIds: ids })}
            loadCode={ss.loadCode}
          />
        )
      case 'trash':
        return trashed === 0 ? (
          <EmptyState icon={Trash2Icon} title={t('scriptStudio.trash.empty')} description={t('scriptStudio.trash.emptyHint')} />
        ) : (
          <LibraryView
            scripts={index.scripts}
            trashed
            onToggle={() => {}}
            onSelect={onEdit}
            onTrash={() => {}}
            onRestore={(sid) => void ss.restoreScriptById(sid)}
            onBulkEnable={() => {}}
            onCheckUpdates={() => {}}
            loadCode={ss.loadCode}
          />
        )
      case 'editor':
        if (record && editor?.id === record.id) {
          return (
            <ScriptEditor
              key={record.id}
              record={record}
              settings={settings}
              code={editor.code}
              values={editor.values}
              onSave={(code, rec) => void ss.saveScript(rec, code)}
              onValuesSave={(v) => void ss.saveValues(record.id, v)}
            />
          )
        }
        return <EditorPicker studio={ss} onEdit={onEdit} onCreate={() => void create()} />
      case 'settings':
        return <SettingsView settings={settings} onChange={(p) => void ss.updateSettings(p)} />
      case 'backup':
        return <BackupView onInstalled={onEdit} />
      case 'api':
        return <ApiReferencePanel />
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <Code2Icon className="size-4.5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{t('scriptStudio.title')}</h2>
              <p className="truncate text-xs text-muted-foreground">{t('scriptStudio.tagline')}</p>
            </div>
          </div>
          <Switch
            checked={index.globalEnabled}
            onCheckedChange={(on) => void ss.setGlobalEnabled(on)}
            aria-label={t('scriptStudio.globalEnabled')}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
              ready ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
            )}
          >
            <span className={cn('size-1.5 rounded-full', ready ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden />
            {ss.probe === null ? t('scriptStudio.status.checking') : ready ? t('scriptStudio.status.ready') : t('scriptStudio.status.setup')}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('scriptStudio.status.counts', { enabled: enabledCount, total: live.length })}
          </span>
          <div className="ms-auto flex flex-wrap gap-2">
            <Button size="sm" className="min-h-9 gap-1.5" onClick={() => void create()}>
              <PlusIcon className="size-4" aria-hidden />
              {t('scriptStudio.create')}
            </Button>
            {onOpenDashboard ? (
              <Button size="sm" variant="outline" className="min-h-9 gap-1.5" onClick={onOpenDashboard}>
                <ExternalLinkIcon className="size-4" aria-hidden />
                {t('scriptStudio.openDashboard')}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <SetupWizard
        probe={ss.probe}
        onEnable={ss.requestPermission}
        onOpenSettings={ss.openExtensionSettings}
        onRecheck={ss.refreshProbe}
      />

      {surface === 'panel' ? (
        <StudioGuide
          tip={t('scriptStudio.guide.panelTip')}
          show={settings.showGuideTips && !guideDismissed}
          onDismiss={() => setGuideDismissed(true)}
          onDisableAll={() => void ss.updateSettings({ showGuideTips: false })}
        />
      ) : null}

      <Tabs value={tab} onValueChange={(v) => onTabChange(v as StudioTab)}>
        <TabsList className={cn(surface === 'tab' && 'w-full')}>
          {tabs.map((id) => {
            const Icon = TAB_ICONS[id]
            return (
              <TabsTrigger key={id} value={id} count={counts[id]}>
                <Icon aria-hidden />
                {t(`scriptStudio.tabs.${id}`)}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <TabsContent value={tab} forceMount>
              {renderTab(tab)}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

function EditorPicker({ studio: ss, onEdit, onCreate }: { studio: Studio; onEdit: (id: string) => void; onCreate: () => void }) {
  const { t } = useTranslation()
  const recent = (ss.index?.scripts ?? [])
    .filter((s) => !s.trashed)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6)

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-6 text-center">
      <EmptyState className="py-2" icon={FileCode2Icon} title={t('scriptStudio.editor.emptyTitle')} description={t('scriptStudio.editor.emptyHint')} />
      <Button size="sm" className="min-h-9 gap-1.5" onClick={onCreate}>
        <PlusIcon className="size-4" aria-hidden />
        {t('scriptStudio.create')}
      </Button>
      {recent.length > 0 ? (
        <div className="w-full max-w-md text-left">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('scriptStudio.editor.recent')}
          </p>
          <ul className="flex flex-col gap-1.5">
            {recent.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onEdit(s.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">v{s.version}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
