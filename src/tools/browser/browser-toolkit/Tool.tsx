import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppWindowIcon,
  ArrowDownToLineIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpToLineIcon,
  AudioLinesIcon,
  CameraIcon,
  ClipboardListIcon,
  CodeXmlIcon,
  CopyPlusIcon,
  DownloadIcon,
  EraserIcon,
  GlobeIcon,
  HashIcon,
  InfoIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  LockOpenIcon,
  PencilLineIcon,
  PinIcon,
  PinOffIcon,
  PrinterIcon,
  QrCodeIcon,
  RotateCwIcon,
  TypeIcon,
  VenetianMaskIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
  ZapIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import QRCode from 'qrcode'

import { ToolPage } from '@/shared/components/ToolPage'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { useBrowserTool } from '../_shared'
import { cleanUrl, htmlLink, markdownLink, nextZoom, pageInfo, screenshotFilename, urlPath } from './formats'
import { ActionTile, Chip, Section } from './ui'
import { useActionFeedback, type FeedbackStatus } from './useActionFeedback'
import { useActiveTab, type ActiveTab } from './useActiveTab'

const ZOOM_PRESETS = [0.75, 1, 1.25, 1.5]

async function inPage<T>(tabId: number, func: () => T): Promise<T> {
  const [result] = await chrome.scripting.executeScript({ target: { tabId }, func })
  return result?.result as T
}

export default function BrowserToolkitTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.toolkit')
  const { tab, zoom, ready } = useActiveTab()
  const feedback = useActionFeedback(t('browserkit.error'))
  const info = useMemo(() => pageInfo(tab?.url ?? ''), [tab?.url])
  const clean = useMemo(() => cleanUrl(tab?.url ?? ''), [tab?.url])
  const pageKey = tab ? `${tab.id}|${tab.url}` : ''
  const [editState, setEditState] = useState<{ key: string; on: boolean }>({ key: '', on: false })
  const editing = editState.key === pageKey && editState.on
  const tabId = tab?.id
  const tabLoading = tab?.loading

  useEffect(() => {
    if (tabId == null || !info.scriptable || tabLoading) return
    let live = true
    inPage(tabId, () => document.designMode === 'on')
      .then((on) => live && setEditState({ key: pageKey, on: Boolean(on) }))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [tabId, pageKey, tabLoading, info.scriptable])

  const copy = (key: string, text: string, what: string) =>
    void feedback.run(key, () => navigator.clipboard.writeText(text), t('browserkit.copied', { what }))

  const act = (key: string, action: (tab: ActiveTab) => unknown, success?: string) => {
    if (tab) void feedback.run(key, () => action(tab), success)
  }

  const noTab = !tab
  const noPage = noTab || !info.scriptable
  const web = info.protocol === 'http' || info.protocol === 'https'

  const copyItems = tab
    ? [
        { key: 'url', icon: LinkIcon, label: t('browser.copyUrl'), text: tab.url },
        { key: 'title', icon: TypeIcon, label: t('browser.copyTitle'), text: tab.title },
        { key: 'both', icon: ClipboardListIcon, label: t('browserkit.copy.both'), text: `${tab.title}\n${tab.url}` },
        { key: 'md', icon: HashIcon, label: t('browserkit.copy.markdown'), text: markdownLink(tab.title, tab.url) },
        { key: 'html', icon: CodeXmlIcon, label: t('browserkit.copy.html'), text: htmlLink(tab.title, tab.url) },
        { key: 'domain', icon: GlobeIcon, label: t('browserkit.copy.domain'), text: info.host },
        {
          key: 'clean',
          icon: EraserIcon,
          label: t('browserkit.copy.clean'),
          text: clean.url,
          hint: clean.removed
            ? t('browserkit.copy.cleanHint', { count: clean.removed })
            : t('browserkit.copy.cleanNone'),
          badge: clean.removed ? (
            <span className="rounded-full bg-emerald-500/12 px-1.5 text-[10px] font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
              −{clean.removed}
            </span>
          ) : undefined,
        },
      ]
    : []

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-5 pb-2">
        <PageHero tab={tab} ready={ready} zoom={zoom} editing={editing} />

        <Section title={t('browserkit.section.copy')}>
          <div className="grid grid-cols-2 gap-1.5 @[520px]:grid-cols-4">
            {copyItems.map((item) => (
              <ActionTile
                key={item.key}
                icon={item.icon}
                label={item.label}
                hint={item.hint ?? item.text}
                badge={item.badge}
                status={feedback.status(item.key)}
                disabled={!item.text}
                onClick={() => copy(item.key, item.text, item.label)}
              />
            ))}
            <ActionTile
              icon={ListIcon}
              label={t('browserkit.copy.allTabs')}
              hint={t('browserkit.copy.allTabsHint')}
              status={feedback.status('all')}
              disabled={noTab}
              onClick={() =>
                act(
                  'all',
                  async () => {
                    const tabs = await chrome.tabs.query({ currentWindow: true })
                    const lines = tabs.filter((x) => x.url).map((x) => x.url)
                    await navigator.clipboard.writeText(lines.join('\n'))
                  },
                  t('browserkit.copied', { what: t('browserkit.copy.allTabs') }),
                )
              }
            />
            {!tab &&
              Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl border bg-muted/40 motion-reduce:animate-none" />
              ))}
          </div>
        </Section>

        <Section title={t('browserkit.section.tab')}>
          <div
            role="group"
            aria-label={t('browserkit.nav.label')}
            className="grid grid-cols-4 divide-x overflow-hidden rounded-xl border bg-card shadow-xs"
          >
            <NavButton
              icon={ArrowLeftIcon}
              label={t('browserkit.nav.back')}
              status={feedback.status('back')}
              disabled={noTab}
              onClick={() => act('back', (x) => chrome.tabs.goBack(x.id))}
            />
            <NavButton
              icon={ArrowRightIcon}
              label={t('browserkit.nav.forward')}
              status={feedback.status('forward')}
              disabled={noTab}
              onClick={() => act('forward', (x) => chrome.tabs.goForward(x.id))}
            />
            <NavButton
              icon={RotateCwIcon}
              label={t('browser.reload')}
              status={feedback.status('reload')}
              disabled={noTab}
              onClick={() => act('reload', (x) => chrome.tabs.reload(x.id))}
            />
            <NavButton
              icon={ZapIcon}
              label={t('browser.hardReload')}
              title={t('browserkit.nav.hardHint')}
              status={feedback.status('hard')}
              disabled={noTab}
              onClick={() => act('hard', (x) => chrome.tabs.reload(x.id, { bypassCache: true }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <ActionTile
              layout="tile"
              accent="sky"
              icon={CopyPlusIcon}
              label={t('browserkit.tab.duplicate')}
              hint={t('browserkit.tab.duplicateHint')}
              status={feedback.status('dup')}
              disabled={noTab}
              onClick={() => act('dup', (x) => chrome.tabs.duplicate(x.id))}
            />
            <ActionTile
              layout="tile"
              accent="sky"
              icon={tab?.pinned ? PinOffIcon : PinIcon}
              label={tab?.pinned ? t('browserkit.tab.unpin') : t('browserkit.tab.pin')}
              hint={tab?.pinned ? t('browserkit.state.on') : t('browserkit.state.off')}
              pressed={Boolean(tab?.pinned)}
              status={feedback.status('pin')}
              disabled={noTab}
              onClick={() => act('pin', (x) => chrome.tabs.update(x.id, { pinned: !x.pinned }))}
            />
            <ActionTile
              layout="tile"
              accent="sky"
              icon={tab?.muted ? VolumeXIcon : Volume2Icon}
              label={tab?.muted ? t('browserkit.tab.unmute') : t('browserkit.tab.mute')}
              hint={
                tab?.muted
                  ? t('browserkit.state.muted')
                  : tab?.audible
                    ? t('browserkit.state.playing')
                    : t('browserkit.state.silent')
              }
              pressed={Boolean(tab?.muted)}
              status={feedback.status('mute')}
              disabled={noTab}
              onClick={() => act('mute', (x) => chrome.tabs.update(x.id, { muted: !x.muted }))}
            />
            <ActionTile
              layout="tile"
              accent="emerald"
              icon={AppWindowIcon}
              label={t('browserkit.tab.window')}
              hint={t('browserkit.tab.windowHint')}
              status={feedback.status('window')}
              disabled={noTab}
              onClick={() => act('window', (x) => chrome.windows.create({ tabId: x.id, focused: true }))}
            />
            <ActionTile
              layout="tile"
              accent="violet"
              icon={VenetianMaskIcon}
              label={t('browserkit.tab.incognito')}
              hint={t('browserkit.tab.incognitoHint')}
              status={feedback.status('incognito')}
              disabled={noTab || !web || Boolean(tab?.incognito)}
              onClick={() => act('incognito', (x) => chrome.windows.create({ url: x.url, incognito: true }))}
            />
            <ActionTile
              layout="tile"
              accent="rose"
              icon={CameraIcon}
              label={t('browserkit.tab.screenshot')}
              hint={t('browserkit.tab.screenshotHint')}
              status={feedback.status('shot')}
              disabled={noPage}
              onClick={() =>
                act(
                  'shot',
                  async (x) => {
                    const dataUrl = await chrome.tabs.captureVisibleTab(x.windowId, { format: 'png' })
                    await chrome.downloads.download({ url: dataUrl, filename: screenshotFilename(info.host) })
                  },
                  t('browserkit.tab.screenshotSaved'),
                )
              }
            />
          </div>
        </Section>

        <Section
          title={t('browserkit.section.page')}
          meta={
            tab && !info.scriptable ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <InfoIcon className="size-3" aria-hidden />
                {t('browserkit.page.restricted')}
              </span>
            ) : undefined
          }
        >
          <ZoomControl
            zoom={zoom}
            disabled={noTab}
            onZoom={(factor) => act('zoom', (x) => chrome.tabs.setZoom(x.id, factor))}
          />

          <label
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-2.5 py-2 shadow-xs transition-colors hover:bg-accent/40',
              editing && 'border-amber-500/40 bg-amber-500/[0.06]',
              noPage && 'pointer-events-none opacity-45',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
              <PencilLineIcon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-tight font-medium">{t('browserkit.page.edit')}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {editing ? t('browserkit.page.editOn') : t('browserkit.page.editHint')}
              </span>
            </span>
            <Switch
              checked={editing}
              disabled={noPage}
              aria-label={t('browserkit.page.edit')}
              onCheckedChange={(on) =>
                act('edit', async (x) => {
                  const next = await inPage(x.id, () => {
                    document.designMode = document.designMode === 'on' ? 'off' : 'on'
                    return document.designMode === 'on'
                  })
                  setEditState({ key: pageKey, on: next ?? on })
                })
              }
            />
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <ActionTile
              accent="violet"
              icon={PrinterIcon}
              label={t('browserkit.page.print')}
              status={feedback.status('print')}
              disabled={noPage}
              onClick={() =>
                act('print', (x) =>
                  inPage(x.id, () => {
                    setTimeout(() => window.print(), 0)
                  }),
                )
              }
            />
            <ActionTile
              accent="violet"
              icon={ArrowUpToLineIcon}
              label={t('browserkit.page.top')}
              status={feedback.status('top')}
              disabled={noPage}
              onClick={() => act('top', (x) => inPage(x.id, () => window.scrollTo({ top: 0, behavior: 'smooth' })))}
            />
            <ActionTile
              accent="violet"
              icon={ArrowDownToLineIcon}
              label={t('browserkit.page.bottom')}
              status={feedback.status('bottom')}
              disabled={noPage}
              onClick={() =>
                act('bottom', (x) =>
                  inPage(x.id, () =>
                    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }),
                  ),
                )
              }
            />
          </div>
        </Section>

        <p
          role="status"
          aria-live="polite"
          className={cn(
            'min-h-4 px-0.5 text-center text-[11px]',
            feedback.message?.tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {feedback.message?.text}
        </p>
      </div>
    </ToolPage>
  )
}

function PageHero({ tab, ready, zoom, editing }: { tab: ActiveTab | null; ready: boolean; zoom: number; editing: boolean }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const info = pageInfo(tab?.url ?? '')
  const [qrState, setQrState] = useState<{ url: string; data: string } | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [failedIcon, setFailedIcon] = useState<string | null>(null)
  const url = tab?.url ?? ''
  const qr = qrState?.url === url ? qrState.data : null

  useEffect(() => {
    if (!qrOpen || !url || qr) return
    let live = true
    QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((data) => live && setQrState({ url, data }))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [qrOpen, url, qr])

  if (!ready) return <div className="h-[104px] animate-pulse rounded-2xl border bg-muted/40 motion-reduce:animate-none" />

  if (!tab) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">
        <InfoIcon className="size-4 shrink-0" aria-hidden />
        {t('browserkit.noTab')}
      </div>
    )
  }

  const path = urlPath(tab.url)

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_60%)]"
      />
      <div className="relative flex items-start gap-3 p-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background shadow-xs">
          {tab.favIconUrl && failedIcon !== tab.favIconUrl ? (
            <img
              src={tab.favIconUrl}
              alt=""
              className="size-6 rounded-sm"
              onError={() => setFailedIcon(tab.favIconUrl ?? null)}
            />
          ) : (
            <GlobeIcon className="size-5 text-muted-foreground" aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold" title={tab.title}>
            {tab.title || info.host || '—'}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs" title={tab.url}>
            {info.secure ? (
              <LockIcon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            ) : info.protocol === 'http' ? (
              <LockOpenIcon className="size-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            ) : null}
            <span className="shrink-0 font-medium text-foreground/90">{info.host}</span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">{path}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {info.secure ? (
              <Chip tone="ok">{t('browserkit.chip.secure')}</Chip>
            ) : info.protocol === 'http' ? (
              <Chip tone="warn">{t('browserkit.chip.insecure')}</Chip>
            ) : (
              <Chip>{info.protocol || t('browserkit.chip.internal')}</Chip>
            )}
            {tab.pinned && (
              <Chip icon={PinIcon} tone="info">
                {t('browserkit.chip.pinned')}
              </Chip>
            )}
            {tab.muted ? (
              <Chip icon={VolumeXIcon}>{t('browserkit.chip.muted')}</Chip>
            ) : tab.audible ? (
              <Chip icon={AudioLinesIcon} tone="info">
                {t('browserkit.chip.playing')}
              </Chip>
            ) : null}
            {tab.incognito && (
              <Chip icon={VenetianMaskIcon} tone="violet">
                {t('browserkit.chip.incognito')}
              </Chip>
            )}
            {Math.abs(zoom - 1) > 0.001 && <Chip icon={ZoomInIcon}>{Math.round(zoom * 100)}%</Chip>}
            {editing && (
              <Chip icon={PencilLineIcon} tone="warn">
                {t('browserkit.chip.editing')}
              </Chip>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-0.5">
          <CopyButton text={tab.url} size="icon-sm" label={t('browser.copyUrl')} />
          <Button
            variant={qrOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label={t('browserkit.qr.toggle')}
            aria-expanded={qrOpen}
            title={t('browserkit.qr.toggle')}
            disabled={!tab.url}
            onClick={() => setQrOpen((v) => !v)}
          >
            {qrOpen ? <XIcon /> : <QrCodeIcon />}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {qrOpen && (
          <motion.div
            key="qr"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden"
          >
            <div className="flex items-center gap-3 border-t border-dashed px-3.5 py-3">
              <div className="flex size-[132px] shrink-0 items-center justify-center rounded-xl border bg-white p-1.5 shadow-xs">
                {qr ? (
                  <img src={qr} alt={t('browserkit.qr.alt')} className="size-full [image-rendering:pixelated]" />
                ) : (
                  <span className="size-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-xs text-muted-foreground">{t('browserkit.qr.hint')}</p>
                <Button
                  variant="outline"
                  size="xs"
                  className="w-fit gap-1"
                  disabled={!qr}
                  onClick={() =>
                    qr &&
                    void chrome.downloads.download({ url: qr, filename: `${info.host || 'page'}-qr.png` })
                  }
                >
                  <DownloadIcon aria-hidden />
                  {t('browserkit.qr.download')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function NavButton({
  icon: Icon,
  label,
  title,
  status,
  disabled,
  onClick,
}: {
  icon: typeof ArrowLeftIcon
  label: string
  title?: string
  status?: FeedbackStatus
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled || status === 'busy'}
      onClick={onClick}
      className={cn(
        'flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-accent disabled:pointer-events-none disabled:opacity-45',
        status === 'error' && 'text-destructive',
        status === 'done' && 'text-emerald-600 dark:text-emerald-400',
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  )
}

function ZoomControl({
  zoom,
  disabled,
  onZoom,
}: {
  zoom: number
  disabled: boolean
  onZoom: (factor: number) => void
}) {
  const { t } = useTranslation()
  const pct = Math.round(zoom * 100)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border bg-card p-1.5 shadow-xs',
        disabled && 'pointer-events-none opacity-45',
      )}
      role="group"
      aria-label={t('browserkit.zoom.label')}
    >
      <div className="flex items-center rounded-lg bg-muted/60 p-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('browserkit.zoom.out')}
          disabled={disabled || zoom <= 0.25}
          onClick={() => onZoom(nextZoom(zoom, -1))}
        >
          <ZoomOutIcon />
        </Button>
        <button
          type="button"
          className="h-8 min-w-14 rounded-md px-1.5 font-mono text-[13px] font-semibold tabular-nums outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onZoom(0)}
          title={t('browserkit.zoom.reset')}
          aria-label={t('browserkit.zoom.current', { value: pct })}
        >
          {pct}%
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('browserkit.zoom.in')}
          disabled={disabled || zoom >= 5}
          onClick={() => onZoom(nextZoom(zoom, 1))}
        >
          <ZoomInIcon />
        </Button>
      </div>
      <div className="ml-auto flex gap-1">
        {ZOOM_PRESETS.map((preset) => {
          const active = Math.abs(zoom - preset) < 0.001
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={active}
              onClick={() => onZoom(preset)}
              className={cn(
                'h-7 rounded-full border px-2 text-[11px] font-medium tabular-nums outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                active && 'border-primary/40 bg-primary/10 text-primary',
              )}
            >
              {Math.round(preset * 100)}%
            </button>
          )
        })}
      </div>
    </div>
  )
}
