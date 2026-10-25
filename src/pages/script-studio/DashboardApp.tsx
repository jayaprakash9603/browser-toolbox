import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ThemeApplicator } from '@/app/providers/ThemeApplicator'
import { Button } from '@/shared/components/ui/button'

import { InstallReview } from '@/tools/sites/script-studio/components/InstallReview'
import { ScriptStudioLoadingSkeleton } from '@/tools/sites/script-studio/components/ScriptStudioLoadingSkeleton'
import { ScriptStudioWorkspace } from '@/tools/sites/script-studio/components/ScriptStudioWorkspace'
import { DASHBOARD_TABS, type StudioTab } from '@/tools/sites/script-studio/components/workspaceTabs'
import { useScriptStudio } from '@/tools/sites/script-studio/hooks/useScriptStudio'

type DashboardTab = (typeof DASHBOARD_TABS)[number]

type Route =
  | { kind: 'tab'; tab: DashboardTab }
  | { kind: 'edit'; id: string }
  | { kind: 'install'; url: string }

function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  if (h.startsWith('edit/')) return { kind: 'edit', id: decodeURIComponent(h.slice('edit/'.length)) }
  if (h.startsWith('install?')) {
    const params = new URLSearchParams(h.slice(h.indexOf('?') + 1))
    return { kind: 'install', url: params.get('ssInstallUrl') ?? params.get('url') ?? '' }
  }
  const tab = (DASHBOARD_TABS as readonly string[]).includes(h) ? (h as DashboardTab) : 'library'
  return { kind: 'tab', tab }
}

/** The side panel must always start on One Panel's home, never on this full-tab page. */
function useLeaveSidePanel() {
  const [checked, setChecked] = useState(() => !chrome.tabs?.getCurrent)
  useEffect(() => {
    if (!chrome.tabs?.getCurrent) return
    void chrome.tabs.getCurrent().then((current) => {
      if (!current) window.location.replace(chrome.runtime.getURL('index.html#/'))
      else setChecked(true)
    })
  }, [])
  return checked
}

export function DashboardApp() {
  const { t } = useTranslation()
  const ss = useScriptStudio()
  const inTab = useLeaveSidePanel()
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [lastEditId, setLastEditId] = useState<string | null>(route.kind === 'edit' ? route.id : null)

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.title = `${t('scriptStudio.title')} · One Panel`
  }, [t])

  const go = (path: string) => {
    window.location.hash = path
  }

  const edit = (id: string) => {
    setLastEditId(id)
    go(`/edit/${encodeURIComponent(id)}`)
  }

  const changeTab = (tab: StudioTab) => {
    if (tab === 'editor') {
      if (lastEditId) edit(lastEditId)
      else go('editor')
      return
    }
    go(tab === 'library' ? '' : tab)
  }

  if (!inTab || ss.loading || !ss.index || !ss.settings) {
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
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {route.kind === 'install' ? (
            <div className="flex flex-col gap-4">
              <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => go('')}>
                <ArrowLeftIcon className="size-4" aria-hidden />
                {t('scriptStudio.tabs.library')}
              </Button>
              {route.url ? <InstallReview url={route.url} onDone={edit} onCancel={() => go('')} /> : null}
            </div>
          ) : (
            <ScriptStudioWorkspace
              studio={ss}
              surface="tab"
              tab={route.kind === 'edit' ? 'editor' : route.tab}
              onTabChange={changeTab}
              editId={route.kind === 'edit' ? route.id : null}
              onEdit={edit}
            />
          )}
        </main>
      </div>
    </>
  )
}
