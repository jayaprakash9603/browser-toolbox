import { Code2Icon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import { ThemeApplicator } from '@/app/providers/ThemeApplicator'
import { Button } from '@/shared/components/ui/button'

import { ApiReferencePanel, ScriptEditor } from '@/tools/sites/script-studio/components/ScriptEditor'
import { BackupView } from '@/tools/sites/script-studio/components/BackupView'
import { InstallReview } from '@/tools/sites/script-studio/components/InstallReview'
import { LibraryView } from '@/tools/sites/script-studio/components/LibraryView'
import { SettingsView } from '@/tools/sites/script-studio/components/SettingsView'
import { SetupWizard } from '@/tools/sites/script-studio/components/SetupWizard'
import { ScriptStudioLoadingSkeleton } from '@/tools/sites/script-studio/components/ScriptStudioLoadingSkeleton'
import { useScriptStudio } from '@/tools/sites/script-studio/hooks/useScriptStudio'

type Route =
  | { kind: 'library' }
  | { kind: 'trash' }
  | { kind: 'settings' }
  | { kind: 'backup' }
  | { kind: 'api' }
  | { kind: 'edit'; id: string }
  | { kind: 'install'; url: string }

function parseRoute(hash: string): Route {
  const h = hash.replace(/^#/, '')
  if (h.startsWith('/edit/')) return { kind: 'edit', id: h.slice('/edit/'.length) }
  if (h.startsWith('install?') || h.startsWith('/install?')) {
    const q = h.includes('?') ? h.slice(h.indexOf('?') + 1) : ''
    const params = new URLSearchParams(q)
    const url = params.get('ssInstallUrl') ?? params.get('url') ?? ''
    return { kind: 'install', url: decodeURIComponent(url) }
  }
  if (h === 'trash') return { kind: 'trash' }
  if (h === 'settings') return { kind: 'settings' }
  if (h === 'backup') return { kind: 'backup' }
  if (h === 'api') return { kind: 'api' }
  return { kind: 'library' }
}

export function DashboardApp() {
  const { t } = useTranslation()
  const ss = useScriptStudio()
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [editorCode, setEditorCode] = useState('')
  const [editorValues, setEditorValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const nav = (path: string) => {
    window.location.hash = path
  }

  const editRecord = useMemo(
    () => (route.kind === 'edit' ? ss.index?.scripts.find((s) => s.id === route.id) : undefined),
    [route, ss.index],
  )

  useEffect(() => {
    if (route.kind !== 'edit') return
    void (async () => {
      setEditorCode((await ss.loadCode(route.id)) ?? '')
      setEditorValues(await ss.loadValues(route.id))
    })()
  }, [route, ss])

  if (ss.loading || !ss.index || !ss.settings) {
    return (
      <>
        <ThemeApplicator />
        <ScriptStudioLoadingSkeleton variant="dashboard" />
      </>
    )
  }

  return (
    <>
      <ThemeApplicator />
      <div className="flex min-h-screen bg-background text-foreground">
        <nav className="flex w-52 shrink-0 flex-col gap-1 border-r p-3">
          <div className="mb-4 flex items-center gap-2 px-2">
            <Code2Icon className="size-5" />
            <span className="font-semibold">{t('scriptStudio.title')}</span>
          </div>
          {(
            [
              ['library', t('scriptStudio.nav.library')],
              ['trash', t('scriptStudio.nav.trash')],
              ['settings', t('scriptStudio.nav.settings')],
              ['backup', t('scriptStudio.nav.backup')],
              ['api', t('scriptStudio.nav.api')],
            ] as const
          ).map(([path, label]) => (
            <Button
              key={path}
              variant={route.kind === path ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => nav(path === 'library' ? '' : path)}
            >
              {label}
            </Button>
          ))}
          <Button className="mt-4" onClick={() => void ss.createScript().then((id) => nav(`/edit/${id}`))}>
            {t('scriptStudio.create')}
          </Button>
        </nav>

        <main className="min-w-0 flex-1 p-6">
          <SetupWizard probe={ss.probe} onEnable={() => void ss.requestPermission()} />

          <AnimatePresence mode="wait">
            <motion.div
              key={route.kind + ('id' in route ? route.id : '')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
            >
              {route.kind === 'library' ? (
                <LibraryView
                  scripts={ss.index.scripts}
                  onToggle={(r, on) => void ss.toggleScript(r, on)}
                  onSelect={(id) => nav(`/edit/${id}`)}
                  onTrash={(ids) => ids.forEach((id) => void ss.trashScript(id))}
                  onRestore={(id) => void ss.restoreScriptById(id)}
                  onBulkEnable={(ids, on) => {
                    for (const id of ids) {
                      const r = ss.index!.scripts.find((s) => s.id === id)
                      if (r) void ss.toggleScript(r, on)
                    }
                  }}
                  onCheckUpdates={(ids) => void sendMessage({ type: 'SCRIPT_STUDIO_CHECK_UPDATES', scriptIds: ids })}
                  loadCode={ss.loadCode}
                />
              ) : null}

              {route.kind === 'trash' ? (
                <LibraryView
                  scripts={ss.index.scripts}
                  trashed
                  onToggle={() => {}}
                  onSelect={(id) => nav(`/edit/${id}`)}
                  onTrash={() => {}}
                  onRestore={(id) => void ss.restoreScriptById(id)}
                  onBulkEnable={() => {}}
                  onCheckUpdates={() => {}}
                  loadCode={ss.loadCode}
                />
              ) : null}

              {route.kind === 'edit' && editRecord ? (
                <ScriptEditor
                  record={editRecord}
                  settings={ss.settings}
                  code={editorCode}
                  values={editorValues}
                  onSave={(code, rec) => void ss.saveScript(rec, code)}
                  onValuesSave={(v) => void ss.saveValues(editRecord.id, v)}
                />
              ) : null}

              {route.kind === 'settings' ? (
                <SettingsView settings={ss.settings} onChange={(p) => void ss.updateSettings(p)} />
              ) : null}

              {route.kind === 'backup' ? <BackupView /> : null}
              {route.kind === 'api' ? <ApiReferencePanel /> : null}

              {route.kind === 'install' && route.url ? (
                <InstallReview url={route.url} onDone={(id) => nav(`/edit/${id}`)} onCancel={() => nav('')} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  )
}
