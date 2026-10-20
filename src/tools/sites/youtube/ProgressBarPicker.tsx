import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, PaletteIcon, RotateCcwIcon } from 'lucide-react'

import {
  PROGRESS_COLLECTIONS,
  SCRUBBER_ASSETS,
  activePresetLabelKey,
  bundleToValuePatch,
  getProgressTheme,
  resolveGalleryScrubber,
  resolveGalleryTheme,
  searchPresets,
  type ProgressCollectionId,
  type ProgressGalleryItem,
  type ProgressThemeDef,
  type YoutubeEnhancerState,
  isGalleryItemSelected,
  type YoutubeFeatureValue,
} from '@/core/sites/youtube'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'

const PREVIEW_PLAYED = 0.58
const SCRUBBER_EMOJIS = ['🔥', '⭐', '🎮', '💎', '🚀', '🎯', '✨', '🎵', '🍕', '⚡']

const PREVIEW_STYLES = `
  @keyframes tbx-yt-preview-shimmer { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4)} }
  @keyframes tbx-yt-preview-glow { 0%,100%{box-shadow:0 0 0 transparent} 50%{box-shadow:0 0 8px rgba(255,255,255,.45)} }
  @keyframes tbx-yt-preview-flow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
  @keyframes tbx-yt-preview-matrix { 0%,100%{opacity:.9} 50%{opacity:1;filter:hue-rotate(12deg)} }
  .tbx-yt-preview-shimmer .tbx-yt-preview-played { animation: tbx-yt-preview-shimmer 1.8s ease-in-out infinite; }
  .tbx-yt-preview-glow .tbx-yt-preview-played { animation: tbx-yt-preview-glow 2s ease-in-out infinite; }
  .tbx-yt-preview-flow .tbx-yt-preview-track,
  .tbx-yt-preview-flow .tbx-yt-preview-played { background-size: 200% 100%; animation: tbx-yt-preview-flow 3.5s linear infinite; }
  .tbx-yt-preview-matrix .tbx-yt-preview-played { animation: tbx-yt-preview-matrix 1.1s steps(3,end) infinite; }
`

function previewEffectClass(th: ProgressThemeDef | undefined): string {
  if (!th?.animated) return ''
  return th.effect ? `tbx-yt-preview-${th.effect}` : 'tbx-yt-preview-shimmer'
}

function ProgressTrackPreview({
  theme,
  scrubberEmoji,
  scrubberImage,
  heightPx,
  className = '',
}: {
  theme: ProgressThemeDef | undefined
  scrubberEmoji: string
  scrubberImage: string
  heightPx: number
  className?: string
}) {
  const bar = theme?.bar ?? '#ff0000'
  const played = theme?.played ?? '#cc0000'
  const fx = previewEffectClass(theme)
  const h = Math.max(2, Math.min(12, heightPx))

  return (
    <div className={`relative w-full ${className}`} style={{ height: `${h + 14}px` }}>
      <div
        className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full ${fx}`}
        style={{ height: `${h}px` }}
        aria-hidden
      >
        <div className="tbx-yt-preview-track absolute inset-0 rounded-full" style={{ background: bar }} />
        <div
          className="tbx-yt-preview-played absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${PREVIEW_PLAYED * 100}%`, background: played }}
        />
      </div>
      <div
        className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center"
        style={{ left: `calc(${PREVIEW_PLAYED * 100}% - 10px)` }}
        aria-hidden
      >
        {scrubberImage ? (
          <img src={scrubberImage} alt="" className="size-5 object-contain drop-shadow" />
        ) : scrubberEmoji ? (
          <span className="text-base leading-none drop-shadow">{scrubberEmoji}</span>
        ) : (
          <span className="size-2.5 rounded-full border border-white/80 bg-white shadow" />
        )}
      </div>
    </div>
  )
}

function galleryItemKey(item: ProgressGalleryItem): string {
  return item.kind === 'bundle' ? item.bundle.id : `gradient-${item.theme.id}`
}

export function ProgressBarPicker({
  state,
  onPatch,
}: {
  state: YoutubeEnhancerState
  onPatch: (values: Record<string, YoutubeFeatureValue>) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [collection, setCollection] = useState<ProgressCollectionId>('all')
  const [filter, setFilter] = useState('')
  const [fineOpen, setFineOpen] = useState(false)

  const themeId = String(state.values.progressTheme ?? 'default')
  const scrubberEmoji = String(state.values.progressScrubberEmoji ?? '').trim()
  const scrubberImage = String(state.values.progressScrubberImage ?? '').trim()
  const barColor = String(state.values.progressBarColor ?? '#ff0000')
  const playedColor = String(state.values.progressPlayedColor ?? '#cc0000')
  const height = Number(state.values.progressHeight ?? 3)

  const activeTheme = getProgressTheme(themeId)
  const activeLabelKey = activePresetLabelKey(state.values)

  const items = useMemo(() => searchPresets(filter, collection), [filter, collection])

  const collectionTabs: { id: ProgressCollectionId; labelKey: string }[] = [
    { id: 'all', labelKey: 'sites.youtube.progress.collection.all' },
    ...PROGRESS_COLLECTIONS.map((c) => ({ id: c.id, labelKey: c.labelKey })),
  ]

  const resetProgress = () => {
    onPatch({
      progressTheme: 'default',
      progressBarColor: '#ff0000',
      progressPlayedColor: '#cc0000',
      progressHeight: 3,
      progressScrubberEmoji: '',
      progressScrubberImage: '',
    })
  }

  const applyItem = (item: ProgressGalleryItem) => {
    if (item.kind === 'bundle') {
      onPatch(bundleToValuePatch(item.bundle))
      return
    }
    onPatch({
      progressTheme: item.theme.id,
      progressScrubberEmoji: '',
      progressScrubberImage: '',
    })
  }

  return (
    <div className="rounded-xl border bg-card">
      <style>{PREVIEW_STYLES}</style>
      <div className="flex w-full items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <PaletteIcon className="size-4 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{t('sites.youtube.progress.accordionTitle')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="max-w-full truncate text-[10px]">
                {t(activeLabelKey)}
              </Badge>
              <div className="hidden min-w-[88px] flex-1 sm:block">
                <ProgressTrackPreview
                  theme={activeTheme}
                  scrubberEmoji={scrubberEmoji}
                  scrubberImage={scrubberImage}
                  heightPx={height}
                />
              </div>
            </div>
          </div>
          <ChevronDownIcon className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          disabled={!state.enabled}
          onClick={() => resetProgress()}
          aria-label={t('sites.youtube.progress.resetDefault')}
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>
      </div>

      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          <div className="rounded-lg border bg-muted/30 p-2.5">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">{t('sites.youtube.progress.livePreview')}</p>
            <ProgressTrackPreview
              theme={activeTheme}
              scrubberEmoji={scrubberEmoji}
              scrubberImage={scrubberImage}
              heightPx={height}
              className="px-1"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {collectionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={!state.enabled}
                className={`cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:cursor-not-allowed ${
                  collection === tab.id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setCollection(tab.id)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          <Input
            className="text-xs"
            placeholder={t('sites.youtube.progress.searchPresets')}
            value={filter}
            disabled={!state.enabled}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div className="grid max-h-[min(52vh,420px)] grid-cols-2 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const th = resolveGalleryTheme(item)
              const scrub = resolveGalleryScrubber(item)
              const selected = isGalleryItemSelected(item, state.values)
              const labelKey =
                item.kind === 'bundle' ? item.bundle.labelKey : (th?.labelKey ?? 'sites.youtube.progress.default')
              const fx = previewEffectClass(th)
              return (
                <button
                  key={galleryItemKey(item)}
                  type="button"
                  disabled={!state.enabled}
                  className={`cursor-pointer rounded-lg border p-2 text-left transition-shadow disabled:cursor-not-allowed ${
                    selected ? 'ring-2 ring-primary shadow-sm' : 'hover:bg-muted/40'
                  }`}
                  onClick={() => applyItem(item)}
                >
                  <div className={`relative mb-1.5 h-6 w-full ${fx}`} aria-hidden>
                    <div
                      className="tbx-yt-preview-track absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full"
                      style={{ background: th?.bar }}
                    />
                    <div
                      className="tbx-yt-preview-played absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                      style={{ width: `${PREVIEW_PLAYED * 100}%`, background: th?.played }}
                    />
                    <div
                      className="absolute top-1/2 flex -translate-y-1/2"
                      style={{ left: `calc(${PREVIEW_PLAYED * 100}% - 8px)` }}
                    >
                      {scrub.image ? (
                        <img src={scrub.image} alt="" className="size-4 object-contain" />
                      ) : scrub.emoji ? (
                        <span className="text-xs">{scrub.emoji}</span>
                      ) : (
                        <span className="size-2 rounded-full bg-white shadow" />
                      )}
                    </div>
                  </div>
                  <span className="line-clamp-2 text-[10px] font-medium leading-tight">{t(labelKey)}</span>
                </button>
              )
            })}
          </div>

          {items.length === 0 && (
            <p className="text-center text-[11px] text-muted-foreground">{t('sites.youtube.progress.noResults')}</p>
          )}

          <div className="border-t pt-3">
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">{t('sites.youtube.progress.scrubberSprites')}</p>
            <div className="grid max-h-28 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8">
              {SCRUBBER_ASSETS.map((asset) => {
                const active = scrubberImage === asset.dataUri
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={!state.enabled}
                    title={t(asset.labelKey)}
                    className={`flex size-9 cursor-pointer items-center justify-center rounded-md border p-1 disabled:cursor-not-allowed ${
                      active ? 'ring-2 ring-primary bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onPatch({ progressScrubberImage: asset.dataUri, progressScrubberEmoji: '' })}
                  >
                    <img src={asset.dataUri} alt="" className="size-6 object-contain" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">{t('sites.youtube.progress.scrubberEmojis')}</p>
            <div className="flex flex-wrap gap-1">
              {SCRUBBER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={!state.enabled}
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-md border text-base disabled:cursor-not-allowed ${
                    scrubberEmoji === emoji ? 'ring-2 ring-primary bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onPatch({ progressScrubberEmoji: emoji, progressScrubberImage: '' })}
                  aria-label={t('sites.youtube.progress.scrubberPick', { emoji })}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                disabled={!state.enabled || (!scrubberEmoji && !scrubberImage)}
                className="cursor-pointer rounded-md border px-2 text-[10px] text-muted-foreground hover:bg-muted/50 disabled:cursor-not-allowed"
                onClick={() => onPatch({ progressScrubberEmoji: '', progressScrubberImage: '' })}
              >
                {t('sites.youtube.progress.scrubberClear')}
              </button>
            </div>
            <Input
              className="mt-2 text-xs"
              placeholder={t('sites.youtube.progress.customImagePlaceholder')}
              value={scrubberImage.startsWith('data:') ? '' : scrubberImage}
              disabled={!state.enabled}
              onChange={(e) => onPatch({ progressScrubberImage: e.target.value, progressScrubberEmoji: '' })}
            />
          </div>

          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-[10px] font-medium text-muted-foreground"
            onClick={() => setFineOpen((o) => !o)}
          >
            {t('sites.youtube.progress.fineTune')}
            <ChevronDownIcon className={`size-3.5 transition-transform ${fineOpen ? 'rotate-180' : ''}`} />
          </button>
          {fineOpen && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
              <label className="flex items-center justify-between gap-2 text-[10px]">
                <span>{t('sites.youtube.features.progressHeight.label')}</span>
                <NumberField
                  className="w-16"
                  ariaLabel={t('sites.youtube.features.progressHeight.label')}
                  value={String(height)}
                  min={2}
                  max={12}
                  disabled={!state.enabled}
                  onChange={(raw) => {
                    const n = parseNumberInRange(raw, 2, 12)
                    if (n != null) onPatch({ progressHeight: n })
                  }}
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[10px]">
                <span>{t('sites.youtube.features.progressBarColor.label')}</span>
                <input
                  type="color"
                  className="h-7 w-12 cursor-pointer rounded border bg-transparent"
                  value={barColor}
                  disabled={!state.enabled}
                  onChange={(e) => onPatch({ progressBarColor: e.target.value, progressTheme: 'default' })}
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[10px]">
                <span>{t('sites.youtube.features.progressPlayedColor.label')}</span>
                <input
                  type="color"
                  className="h-7 w-12 cursor-pointer rounded border bg-transparent"
                  value={playedColor}
                  disabled={!state.enabled}
                  onChange={(e) => onPatch({ progressPlayedColor: e.target.value, progressTheme: 'default' })}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
