import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppWindowIcon, ClipboardPasteIcon, GlobeIcon, LinkIcon, LoaderCircleIcon, SlidersHorizontalIcon } from 'lucide-react'

import { classifyTabUrl, getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { DEFAULT_DOCUMENT_SETTINGS, type DocumentSettings } from '@/core/engines/files/document'
import { htmlToBlocks } from '@/core/engines/files/htmlBlocks'
import { renderPdf } from '@/core/engines/files/pdfLayout'
import { layoutTextDocument } from '@/core/engines/files/pdfText'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { DocumentSettingsForm } from '../file-toolkit/controls'
import { ChoiceCards } from './ChoiceCards'
import { pdfArtifact, usePdfSession } from './session'
import { useTask } from './useTask'

type Source = 'tab' | 'url' | 'paste'

function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(/^[a-z][\w+.-]*:/i.test(value) ? value : `https://${value}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

const slug = (text: string) => text.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'page'

/** Web pages to clean, readable PDFs: the open tab, any URL, or pasted HTML. */
export function HtmlToPdfPanel() {
  const { t } = useTranslation()
  const { showResults } = usePdfSession()
  const hasTabs = typeof chrome !== 'undefined' && !!chrome.tabs && !!chrome.scripting
  const [source, setSource] = useState<Source>(hasTabs ? 'tab' : 'url')
  const [tab, setTab] = useState<{ id: number; title: string; url: string } | null>(null)
  const [url, setUrl] = useState('')
  const [html, setHtml] = useState('')
  const [keepChrome, setKeepChrome] = useState(false)
  const [settings, setSettings] = useState<DocumentSettings>({ ...DEFAULT_DOCUMENT_SETTINGS, pageNumbers: true })
  const { busy, error, run } = useTask()

  useEffect(() => {
    if (!hasTabs) return
    let cancelled = false
    void getActiveBrowserTab().then((active) => {
      if (cancelled || active?.id == null || classifyTabUrl(active.url)) return
      setTab({ id: active.id, title: active.title ?? active.url ?? '', url: active.url ?? '' })
    })
    return () => {
      cancelled = true
    }
  }, [hasTabs])

  const readSource = async (): Promise<{ html: string; base?: string }> => {
    if (source === 'paste') return { html }
    if (source === 'url') {
      const href = normalizeUrl(url)
      if (!href) throw new Error(t('pdf.html.badUrl'))
      const response = await fetch(href, { credentials: 'omit' }).catch((cause: unknown) => {
        throw new Error(t('pdf.html.fetchFailed'), { cause })
      })
      if (!response.ok) throw new Error(t('pdf.html.httpError', { status: response.status }))
      return { html: await response.text(), base: response.url || href }
    }
    if (!tab) throw new Error(t('pdf.html.noTab'))
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.documentElement.outerHTML })
    return { html: String(result?.result ?? ''), base: tab.url }
  }

  const convert = () =>
    run(async () => {
      const page = await readSource()
      const parsed = htmlToBlocks(page.html, page.base, { keepChrome })
      if (!parsed.blocks.length) throw new Error(t('pdf.html.empty'))
      const title = settings.title || parsed.title
      const layout = await layoutTextDocument(parsed.blocks, { ...settings, title })
      const bytes = new Uint8Array(await (await renderPdf(layout)).arrayBuffer())
      const notes = [parsed.images ? t('pdf.html.imagesSkipped', { count: parsed.images }) : '', layout.lossyGlyphs ? t('pdf.office.lossy') : ''].filter(Boolean)
      showResults({ artifacts: [pdfArtifact(`${slug(title || (page.base ? new URL(page.base).hostname : 'page'))}.pdf`, bytes, { note: notes.join(' ') || t('pdf.html.note') })] })
    })

  const ready = source === 'paste' ? html.trim().length > 0 : source === 'url' ? normalizeUrl(url) !== null : tab !== null
  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.html.source')} icon={<GlobeIcon />}>
        <ChoiceCards
          label={t('pdf.html.source')}
          value={source}
          onChange={setSource}
          choices={[
            { value: 'tab', icon: AppWindowIcon, label: t('pdf.html.tab'), hint: t('pdf.html.tabHint'), disabled: !hasTabs },
            { value: 'url', icon: LinkIcon, label: t('pdf.html.url'), hint: t('pdf.html.urlHint') },
            { value: 'paste', icon: ClipboardPasteIcon, label: t('pdf.html.paste'), hint: t('pdf.html.pasteHint') },
          ]}
        />
        {source === 'tab' &&
          (tab ? (
            <div className="flex items-center gap-2.5 rounded-xl border bg-background/70 px-3 py-2">
              <AppWindowIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">{tab.title}</span>
                <span className="truncate text-[11px] text-muted-foreground">{tab.url}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">{t('pdf.html.noTab')}</p>
          ))}
        {source === 'url' && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (ready) void convert()
            }}
          >
            <Input type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/article" aria-label={t('pdf.html.url')} autoFocus />
          </form>
        )}
        {source === 'paste' && (
          <Textarea value={html} onChange={(event) => setHtml(event.target.value)} placeholder="<article>…</article>" aria-label={t('pdf.html.paste')} className="min-h-40 font-mono text-xs" spellCheck={false} />
        )}
        <OptionSwitch label={t('pdf.html.keepChrome')} hint={t('pdf.html.keepChromeHint')} checked={keepChrome} onChange={setKeepChrome} />
      </PanelSection>
      <PanelSection title={t('pdf.html.layout')} icon={<SlidersHorizontalIcon />}>
        <DocumentSettingsForm value={settings} onChange={setSettings} compact />
      </PanelSection>
      {error && <PanelError message={error} />}
      <ActionBar>
        <Button onClick={() => void convert()} disabled={busy || !ready} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <GlobeIcon aria-hidden />}
          {t('pdf.html.run')}
        </Button>
      </ActionBar>
    </div>
  )
}
