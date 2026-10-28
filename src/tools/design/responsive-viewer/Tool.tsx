import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  FrameIcon,
  GalleryHorizontalIcon,
  GlobeIcon,
  LayoutGridIcon,
  LocateFixedIcon,
  LockIcon,
  Maximize2Icon,
  MonitorSmartphoneIcon,
  RefreshCwIcon,
  RotateCwSquareIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { OptionSwitch } from '@/shared/components/toolkit'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { useDesignTool } from '../_shared'
import { ControlsFoldToggle } from './ControlsFold'
import { DeviceCard } from './DeviceCard'
import { DeviceMenu, SelectedDevices } from './DevicePicker'
import { DeviceViewer } from './DeviceViewer'
import {
  DEVICES,
  loadSettings,
  normalizeUrl,
  storeSettings,
  type Device,
  type ViewerSettings,
} from './devices'
import { setFramingAllowed } from './framing'
import { EASE_OUT, useContentWidth, useWindowHeight } from './helpers'
import { IconAction, ZoomMenu } from './parts'
import { useControlsFold } from './useControlsFold'

const TOGGLE_CLASS =
  'size-8 aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary'

const toggleIn = (list: readonly string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

export default function ResponsiveViewerTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.responsive-viewer')
  const inputId = useId()
  const [settings, setSettings] = useState<ViewerSettings>(loadSettings)
  const [draft, setDraft] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [fullOpen, setFullOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [folded, setFolded] = useControlsFold()
  const controlsId = useId()
  const reduceMotion = useReducedMotion()
  /** The unblock setting whose network rules are in effect; frames wait for it so they load with the right headers. */
  const [appliedUnblock, setAppliedUnblock] = useState<boolean | null>(null)
  const windowHeight = useWindowHeight()
  const [stageRef, stageWidth] = useContentWidth<HTMLDivElement>()

  const update = (patch: Partial<ViewerSettings>) => setSettings((prev) => ({ ...prev, ...patch }))

  useEffect(() => storeSettings(settings), [settings])

  useEffect(() => {
    let active = true
    void setFramingAllowed(settings.unblock).then((ok) => {
      if (!active) return
      setAppliedUnblock(settings.unblock)
      if (ok) setReloadKey((k) => k + 1)
    })
    return () => {
      active = false
    }
  }, [settings.unblock])

  useEffect(() => () => void setFramingAllowed(false), [])

  const loadCurrentTab = async () => {
    const tab = await getActiveBrowserTab().catch(() => undefined)
    const next = normalizeUrl(tab?.url ?? '')
    if (!next) {
      setUrlError(t('rv.url.noTab'))
      return
    }
    setUrlError(null)
    setDraft(next)
    if (next === url) setReloadKey((k) => k + 1)
    else setUrl(next)
  }

  useEffect(() => {
    let active = true
    void getActiveBrowserTab()
      .catch(() => undefined)
      .then((tab) => {
        const next = normalizeUrl(tab?.url ?? '')
        if (!active || !next) return
        setDraft(next)
        setUrl(next)
      })
    return () => {
      active = false
    }
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = normalizeUrl(draft)
    if (!next) {
      setUrlError(t('rv.url.invalid'))
      return
    }
    setUrlError(null)
    setDraft(next)
    if (next === url) setReloadKey((k) => k + 1)
    else setUrl(next)
  }

  const allDevices = useMemo<Device[]>(() => [...DEVICES, ...settings.custom], [settings.custom])
  const shown = allDevices.filter((d) => settings.selected.includes(d.id))
  const rotatable = shown.filter((d) => d.kind === 'phone' || d.kind === 'tablet')
  const allRotated = rotatable.length > 0 && rotatable.every((d) => settings.rotated.includes(d.id))
  const maxHeight = Math.max(300, Math.round(windowHeight * 0.62))
  const framesReady = appliedUnblock === settings.unblock
  const previewActive = framesReady
  const embedEnabled = settings.unblock
  const secure = url?.startsWith('https:')
  const zoomLabel = settings.zoom === 'fit' ? t('rv.view.fit') : `${Number(settings.zoom) * 100}%`

  const openDeviceMenu = () => {
    if (folded) setFolded(false)
    setMenuOpen(true)
  }

  const rotateAll = () => {
    const ids = rotatable.map((d) => d.id)
    update({
      rotated: allRotated
        ? settings.rotated.filter((id) => !ids.includes(id))
        : [...new Set([...settings.rotated, ...ids])],
    })
  }

  const jumpTo = (id: string) => {
    const card = document.getElementById(`rv-card-${id}`)
    if (!card) return
    card.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
    if (!reduceMotion) {
      card.animate(
        [
          { boxShadow: '0 0 0 2px var(--primary)' },
          { boxShadow: '0 0 0 2px var(--primary)', offset: 0.6 },
          { boxShadow: '0 0 0 0 transparent' },
        ],
        { duration: 1100, easing: 'ease-out' },
      )
    }
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden gap-3">
      <MotionConfig reducedMotion="user">
        <div ref={stageRef} className="flex min-h-0 flex-1 flex-col gap-2 @container">
          <div className="flex shrink-0 flex-col rounded-2xl border bg-background p-1.5 shadow-xs">
            <form onSubmit={submit} className="flex items-center gap-1.5" noValidate>
              <label htmlFor={inputId} className="sr-only">
                {t('rv.url.label')}
              </label>
              <div className="relative min-w-0 flex-1">
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                >
                  {secure ? (
                    <LockIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <GlobeIcon className="size-3.5" />
                  )}
                </span>
                <input
                  id={inputId}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (urlError) setUrlError(null)
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                  placeholder={t('rv.url.placeholder')}
                  spellCheck={false}
                  autoComplete="url"
                  inputMode="url"
                  aria-invalid={!!urlError}
                  aria-describedby={urlError ? `${inputId}-error` : undefined}
                  className="h-9 w-full min-w-0 rounded-lg border border-input bg-background pl-8 pr-10 font-mono text-xs shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:font-sans placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
                />
                <Button
                  type="submit"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 -translate-y-1/2 active:-translate-y-1/2"
                  aria-label={t('rv.url.load')}
                  title={t('rv.url.load')}
                >
                  <ArrowRightIcon />
                </Button>
              </div>
              <IconAction
                type="button"
                label={t('rv.url.currentTab')}
                onClick={() => void loadCurrentTab()}
              >
                <LocateFixedIcon />
              </IconAction>
              <IconAction
                type="button"
                label={t('rv.url.reloadAll')}
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={!url}
              >
                <RefreshCwIcon />
              </IconAction>
              <IconAction
                type="button"
                label={t('rv.url.openTab')}
                disabled={!url}
                onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLinkIcon />
              </IconAction>
              <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
              <ControlsFoldToggle
                folded={folded}
                controlsId={controlsId}
                count={shown.length}
                zoomLabel={zoomLabel}
                onToggle={() => setFolded(!folded)}
              />
            </form>
            <AnimatePresence initial={false}>
              {urlError && (
                <motion.div
                  className="overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  <p
                    id={`${inputId}-error`}
                    role="alert"
                    className="px-1 pt-1.5 text-[11px] text-destructive"
                  >
                    {urlError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {!folded && (
                <motion.div
                  key="controls"
                  id={controlsId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
                  transition={{ duration: 0.24, ease: EASE_OUT }}
                  className="-mx-0.5 -mb-0.5 overflow-hidden px-0.5 pb-0.5"
                >
                  <div
                    className="flex min-w-0 items-center gap-1 pt-1.5"
                    role="toolbar"
                    aria-label={t('rv.view.label')}
                  >
                    <DeviceMenu
                      devices={allDevices}
                      selected={settings.selected}
                      open={menuOpen}
                      onOpenChange={setMenuOpen}
                      onToggle={(id) => update({ selected: toggleIn(settings.selected, id) })}
                      onSelect={(selected) => update({ selected })}
                      onAddCustom={(device) =>
                        update({
                          custom: [...settings.custom, device],
                          selected: [...settings.selected, device.id],
                        })
                      }
                      onRemoveCustom={(id) =>
                        update({
                          custom: settings.custom.filter((d) => d.id !== id),
                          selected: settings.selected.filter((x) => x !== id),
                          rotated: settings.rotated.filter((x) => x !== id),
                        })
                      }
                    />
                    <ZoomMenu value={settings.zoom} onChange={(zoom) => update({ zoom })} />
                    <IconAction
                      label={`${t('rv.view.layout')}: ${t(settings.layout === 'grid' ? 'rv.view.grid' : 'rv.view.row')}`}
                      onClick={() =>
                        update({ layout: settings.layout === 'grid' ? 'row' : 'grid' })
                      }
                      variant="outline"
                      className="size-8"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={settings.layout}
                          className="flex"
                          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                          animate={{ opacity: 1, rotate: 0, scale: 1 }}
                          exit={{
                            opacity: 0,
                            rotate: 90,
                            scale: 0.6,
                            transition: { duration: 0.1 },
                          }}
                          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        >
                          {settings.layout === 'grid' ? (
                            <LayoutGridIcon />
                          ) : (
                            <GalleryHorizontalIcon />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </IconAction>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <IconAction
                        label={t('rv.view.frame')}
                        variant="outline"
                        aria-pressed={settings.frame}
                        onClick={() => update({ frame: !settings.frame })}
                        className={TOGGLE_CLASS}
                      >
                        <FrameIcon />
                      </IconAction>
                      <IconAction
                        label={t('rv.view.rotateAll')}
                        variant="outline"
                        aria-pressed={allRotated}
                        disabled={rotatable.length === 0}
                        onClick={rotateAll}
                        className={TOGGLE_CLASS}
                      >
                        <motion.span
                          className="flex"
                          animate={{ rotate: allRotated ? 90 : 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        >
                          <RotateCwSquareIcon />
                        </motion.span>
                      </IconAction>
                      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
                      <IconAction
                        label={t('rv.full.open')}
                        variant="default"
                        disabled={!url || shown.length === 0 || !framesReady}
                        aria-haspopup="dialog"
                        aria-expanded={fullOpen}
                        onClick={() => setFullOpen(true)}
                        className="size-8"
                      >
                        <Maximize2Icon />
                      </IconAction>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {settings.selected.length > 0 && (
                      <motion.div
                        key="chips"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="-mx-0.5 overflow-hidden px-0.5"
                      >
                        <div className="pt-1.5">
                          <SelectedDevices
                            devices={allDevices}
                            selected={settings.selected}
                            onRemove={(id) =>
                              update({ selected: settings.selected.filter((x) => x !== id) })
                            }
                            onJump={jumpTo}
                            onOpenMenu={() => setMenuOpen(true)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="scrollbar-styled flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
            {!url ? (
              <EmptyState onUseTab={() => void loadCurrentTab()} />
            ) : shown.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center text-xs text-muted-foreground"
              >
                {t('rv.empty.noDevices')}
                <Button size="sm" variant="outline" onClick={openDeviceMenu}>
                  <MonitorSmartphoneIcon />
                  {t('rv.devices.open')}
                </Button>
              </motion.div>
            ) : (
              !fullOpen && (
                <div
                  className={cn(
                    settings.layout === 'grid'
                      ? 'grid items-start gap-3 @[760px]:grid-cols-2 @[1180px]:grid-cols-3'
                      : '-mx-1 flex snap-x items-start gap-3 overflow-x-auto px-1 pb-2',
                  )}
                >
                  <AnimatePresence>
                    {shown.map((device, index) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        url={url}
                        rotated={settings.rotated.includes(device.id)}
                        zoom={settings.zoom}
                        fitWidth={settings.layout === 'grid'}
                        stageWidth={stageWidth}
                        maxHeight={maxHeight}
                        frame={settings.frame}
                        reloadKey={reloadKey}
                        previewReady={previewActive}
                        embedEnabled={embedEnabled}
                        index={index}
                        onRotate={() => update({ rotated: toggleIn(settings.rotated, device.id) })}
                        onHide={() =>
                          update({ selected: settings.selected.filter((x) => x !== device.id) })
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )
            )}

            <OptionSwitch
              label={t('rv.unblock.title')}
              hint={t('rv.unblock.body')}
              checked={settings.unblock}
              onChange={(unblock) => update({ unblock })}
            />
          </div>
        </div>
        {url && (
          <DeviceViewer
            open={fullOpen}
            devices={shown}
            url={url}
            rotated={settings.rotated}
            frame={settings.frame}
            reloadKey={reloadKey}
            previewReady={previewActive}
            embedEnabled={embedEnabled}
            onRotate={(id) => update({ rotated: toggleIn(settings.rotated, id) })}
            onClose={() => setFullOpen(false)}
          />
        )}
      </MotionConfig>
    </ToolPage>
  )
}

function EmptyState({ onUseTab }: { onUseTab: () => void }) {
  const { t } = useTranslation()
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-10 text-center"
    >
      <motion.span
        className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        initial={{ scale: 0.8, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
        aria-hidden
      >
        <MonitorSmartphoneIcon className="size-6" />
      </motion.span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-sm font-semibold">{t('rv.empty.title')}</h2>
        <p className="text-xs leading-5 text-muted-foreground">{t('rv.empty.body')}</p>
      </div>
      <Button size="sm" onClick={onUseTab}>
        <LocateFixedIcon />
        {t('rv.url.currentTab')}
      </Button>
    </motion.section>
  )
}
