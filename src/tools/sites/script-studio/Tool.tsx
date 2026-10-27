import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { parseSearchParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import { useSitesTool } from '../_shared'
import { InstallReview } from './components/InstallReview'
import { ScriptStudioLoadingSkeleton } from './components/ScriptStudioLoadingSkeleton'
import { ScriptStudioWorkspace } from './components/ScriptStudioWorkspace'
import { ALL_TABS, type StudioTab } from './components/workspaceTabs'
import { useActiveTab } from './hooks/useActiveTabUrl'
import { useScriptStudio } from './hooks/useScriptStudio'

/** `null` until known; the same route renders in the side panel and in a full browser tab. */
function useIsFullTab(): boolean | null {
  const [inTab, setInTab] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    void Promise.resolve()
      .then(() => chrome.tabs.getCurrent())
      .then((current) => !cancelled && setInTab(Boolean(current)))
      .catch(() => !cancelled && setInTab(false))
    return () => {
      cancelled = true
    }
  }, [])
  return inTab
}

export default function ScriptStudioTool() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.script-studio')
  const { search, navigate } = useRouter()
  const { id: activeTabId, url } = useActiveTab()
  const ss = useScriptStudio()
  const inTab = useIsFullTab()
  const [requestedTab, setTab] = useDeepLinkTab('tab', ALL_TABS, 'thisPage')
  const [editId, setEditId] = useState<string | null>(() => parseSearchParam(search, 'edit'))
  const installUrl = parseSearchParam(search, 'install')

  const surface = inTab ? 'tab' : 'panel'
  const tab: StudioTab = surface === 'tab' && requestedTab === 'thisPage' ? 'library' : surface === 'panel' && requestedTab === 'api' ? 'library' : requestedTab

  const edit = (id: string) => {
    setEditId(id)
    setTab('editor')
  }

  const openInTab = () => {
    const query = tab === 'editor' && editId ? `?tab=editor&edit=${encodeURIComponent(editId)}` : tab === 'thisPage' ? '' : `?tab=${tab}`
    void chrome.tabs.create({ url: chrome.runtime.getURL(`index.html#${tool.route}${query}`) })
  }

  const actions =
    inTab === false ? (
      <Button variant="ghost" size="icon-sm" onClick={openInTab} aria-label={t('scriptStudio.openInTab')} title={t('scriptStudio.openInTab')}>
        <ExternalLinkIcon className="size-4" />
      </Button>
    ) : null

  const ready = inTab !== null && !ss.loading && ss.index && ss.settings

  return (
    <ToolPage tool={tool} actions={actions}>
      <div className={cn('flex flex-col gap-3', inTab && 'mx-auto w-full max-w-5xl py-2')}>
        <PermissionNotice
          active={ss.probe?.step === 'ready'}
          message={t('siteAccess.scriptStudioNeeded')}
        />
        {!ready ? (
          <ScriptStudioLoadingSkeleton variant={installUrl ? 'install' : 'panel'} />
        ) : installUrl ? (
          <>
            <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => navigate(tool.route)}>
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t('scriptStudio.tabs.library')}
            </Button>
            <InstallReview
              url={installUrl}
              onDone={(id) => {
                setEditId(id)
                navigate(`${tool.route}?tab=editor`)
              }}
              onCancel={() => navigate(tool.route)}
            />
          </>
        ) : (
          <ScriptStudioWorkspace
            studio={ss}
            surface={surface}
            tab={tab}
            onTabChange={setTab}
            editId={editId}
            onEdit={edit}
            url={url}
            tabId={activeTabId}
          />
        )}
      </div>
    </ToolPage>
  )
}
