import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import { ToolPage } from '@/shared/components/ToolPage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { useSitesTool } from '../_shared'
import { LibraryView } from './components/LibraryView'
import { ScriptEditor } from './components/ScriptEditor'
import { SetupWizard } from './components/SetupWizard'
import { StudioGuide } from './components/StudioGuide'
import { ScriptStudioLoadingSkeleton } from './components/ScriptStudioLoadingSkeleton'
import { ThisPagePanel } from './components/ThisPagePanel'
import { useActiveTabUrl } from './hooks/useActiveTabUrl'
import { useScriptStudio } from './hooks/useScriptStudio'

export default function ScriptStudioTool() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.script-studio')
  const url = useActiveTabUrl()
  const ss = useScriptStudio()
  const [tab, setTab] = useState('thisPage')
  const [quickId, setQuickId] = useState<string | null>(null)
  const [quickCode, setQuickCode] = useState('')
  const [quickValues, setQuickValues] = useState<Record<string, unknown>>({})
  const [guideDismissed, setGuideDismissed] = useState(false)

  const openDashboard = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('script-studio.html') })
  }

  const openQuick = async (id: string) => {
    setQuickId(id)
    setQuickCode((await ss.loadCode(id)) ?? '')
    setQuickValues(await ss.loadValues(id))
    setTab('quickEdit')
  }

  if (ss.loading || !ss.index || !ss.settings) {
    return (
      <ToolPage tool={tool}>
        <ScriptStudioLoadingSkeleton variant="panel" />
      </ToolPage>
    )
  }

  const record = ss.index.scripts.find((s) => s.id === quickId)

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">

        <SetupWizard probe={ss.probe} onEnable={() => void ss.requestPermission()} />

        <StudioGuide
          tip="Use the Library tab to manage all scripts, or open the dashboard for the full editor."
          show={ss.settings.showGuideTips && !guideDismissed}
          onDismiss={() => setGuideDismissed(true)}
          onDisableAll={() => void ss.updateSettings({ showGuideTips: false })}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="pill" fullWidth className="w-full">
            <TabsTrigger value="thisPage" className="min-h-11">
              {t('scriptStudio.tabs.thisPage')}
            </TabsTrigger>
            <TabsTrigger value="library" className="min-h-11">
              {t('scriptStudio.tabs.library')}
            </TabsTrigger>
            <TabsTrigger value="quickEdit" className="min-h-11">
              {t('scriptStudio.tabs.quickEdit')}
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="mt-3"
            >
              <TabsContent value="thisPage" forceMount={tab === 'thisPage' ? true : undefined}>
                <ThisPagePanel
                  url={url}
                  scripts={ss.index.scripts}
                  settings={ss.settings}
                  globalEnabled={ss.index.globalEnabled}
                  onGlobalChange={(on) => void ss.setGlobalEnabled(on)}
                  onToggle={(r, on) => void ss.toggleScript(r, on)}
                  onCreate={async () => {
                    const id = await ss.createScript()
                    await openQuick(id)
                  }}
                  onOpenDashboard={openDashboard}
                  loadCode={ss.loadCode}
                />
              </TabsContent>

              <TabsContent value="library" forceMount={tab === 'library' ? true : undefined}>
                <LibraryView
                  scripts={ss.index.scripts}
                  onToggle={(r, on) => void ss.toggleScript(r, on)}
                  onSelect={(id) => void openQuick(id)}
                  onTrash={(ids) => ids.forEach((id) => void ss.trashScript(id))}
                  onBulkEnable={(ids, on) => {
                    for (const id of ids) {
                      const r = ss.index!.scripts.find((s) => s.id === id)
                      if (r) void ss.toggleScript(r, on)
                    }
                  }}
                  onCheckUpdates={(ids) => void sendMessage({ type: 'SCRIPT_STUDIO_CHECK_UPDATES', scriptIds: ids })}
                  loadCode={ss.loadCode}
                />
              </TabsContent>

              <TabsContent value="quickEdit" forceMount={tab === 'quickEdit' ? true : undefined}>
                {record ? (
                  <ScriptEditor
                    record={record}
                    settings={ss.settings}
                    code={quickCode}
                    values={quickValues}
                    onSave={(code, rec) => void ss.saveScript(rec, code)}
                    onValuesSave={(v) => void ss.saveValues(record.id, v)}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Select a script from the library.</p>
                )}
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </ToolPage>
  )
}
