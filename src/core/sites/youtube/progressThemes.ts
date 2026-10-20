import type { YoutubeFeatureValue } from './types'
import {
  SCRUBBER_ASSETS,
  getScrubberAsset,
  type ScrubberAssetDef,
} from './scrubberAssets'

export interface ProgressThemeDef {
  id: string
  labelKey: string
  bar: string
  played: string
  /** Generic pulse/shimmer on the played segment */
  animated?: boolean
  /** CSS animation preset id (see youtube.css) */
  effect?: 'shimmer' | 'flow' | 'glow' | 'matrix'
}

export type ProgressCollectionId =
  | 'all'
  | 'memes'
  | 'games'
  | 'cartoons'
  | 'cute'
  | 'scifi'
  | 'gradients'

export interface ProgressCollectionDef {
  id: Exclude<ProgressCollectionId, 'all'>
  labelKey: string
}

export interface ProgressPresetBundle {
  id: string
  labelKey: string
  collection: Exclude<ProgressCollectionId, 'all' | 'gradients'>
  /** Extra lowercase tokens for search */
  tags: string[]
  themeId: string
  scrubberAssetId?: string
  scrubberEmoji?: string
}

const DEFAULT_BAR = '#ff0000'
const DEFAULT_PLAYED = '#cc0000'
const DEFAULT_HEIGHT = 3

/** Built-in progress bar themes (color & gradient styles). */
export const PROGRESS_THEMES: ProgressThemeDef[] = [
  { id: 'default', labelKey: 'sites.youtube.progress.default', bar: '#ff0000', played: '#cc0000' },
  { id: 'ocean', labelKey: 'sites.youtube.progress.ocean', bar: '#0ea5e9', played: '#0284c7' },
  { id: 'neon', labelKey: 'sites.youtube.progress.neon', bar: '#22d3ee', played: '#06b6d4', animated: true, effect: 'glow' },
  { id: 'fire', labelKey: 'sites.youtube.progress.fire', bar: '#f97316', played: '#ea580c', animated: true, effect: 'shimmer' },
  { id: 'gold', labelKey: 'sites.youtube.progress.gold', bar: '#eab308', played: '#ca8a04' },
  { id: 'forest', labelKey: 'sites.youtube.progress.forest', bar: '#22c55e', played: '#16a34a' },
  { id: 'violet', labelKey: 'sites.youtube.progress.violet', bar: '#a855f7', played: '#9333ea' },
  { id: 'rose', labelKey: 'sites.youtube.progress.rose', bar: '#f43f5e', played: '#e11d48' },
  { id: 'slate', labelKey: 'sites.youtube.progress.slate', bar: '#64748b', played: '#475569' },
  {
    id: 'rainbow',
    labelKey: 'sites.youtube.progress.rainbow',
    bar: 'linear-gradient(90deg,red,orange,yellow,green,blue,violet)',
    played: 'linear-gradient(90deg,#f43f5e,#eab308,#22c55e,#3b82f6,#a855f7)',
    animated: true,
    effect: 'flow',
  },
  {
    id: 'candy',
    labelKey: 'sites.youtube.progress.candy',
    bar: 'repeating-linear-gradient(45deg,#f472b6,#f472b6 8px,#fbcfe8 8px,#fbcfe8 16px)',
    played: '#db2777',
    animated: true,
    effect: 'flow',
  },
  { id: 'pride', labelKey: 'sites.youtube.progress.pride', bar: 'linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#24408e,#732982)', played: '#555' },
  { id: 'midnight', labelKey: 'sites.youtube.progress.midnight', bar: '#312e81', played: '#1e1b4b' },
  { id: 'mint', labelKey: 'sites.youtube.progress.mint', bar: '#6ee7b7', played: '#34d399' },
  { id: 'sunset', labelKey: 'sites.youtube.progress.sunset', bar: 'linear-gradient(90deg,#f43f5e,#f97316,#fbbf24)', played: '#c2410c' },
  { id: 'ice', labelKey: 'sites.youtube.progress.ice', bar: '#bae6fd', played: '#7dd3fc' },
  { id: 'lava', labelKey: 'sites.youtube.progress.lava', bar: '#450a0a', played: '#dc2626', animated: true, effect: 'glow' },
  { id: 'matrix', labelKey: 'sites.youtube.progress.matrix', bar: '#22c55e', played: '#14532d', animated: true, effect: 'matrix' },
  { id: 'cyber', labelKey: 'sites.youtube.progress.cyber', bar: '#f0abfc', played: '#c026d3', animated: true, effect: 'glow' },
  { id: 'mono', labelKey: 'sites.youtube.progress.mono', bar: '#fafafa', played: '#a3a3a3' },
  { id: 'pacman', labelKey: 'sites.youtube.progress.pacman', bar: '#1f2937', played: '#facc15' },
  { id: 'minecraft', labelKey: 'sites.youtube.progress.minecraft', bar: '#14532d', played: '#4ade80' },
  { id: 'sonic', labelKey: 'sites.youtube.progress.sonic', bar: '#1e3a8a', played: '#38bdf8', animated: true, effect: 'flow' },
  { id: 'among', labelKey: 'sites.youtube.progress.among', bar: '#1f2937', played: '#ef4444' },
  { id: 'adventure', labelKey: 'sites.youtube.progress.adventure', bar: '#4ade80', played: '#22c55e' },
  { id: 'pusheen', labelKey: 'sites.youtube.progress.pusheenPink', bar: '#fbcfe8', played: '#f472b6' },
  { id: 'lightsaber', labelKey: 'sites.youtube.progress.lightsaber', bar: '#0f172a', played: '#38bdf8', animated: true, effect: 'glow' },
  { id: 'sith', labelKey: 'sites.youtube.progress.sith', bar: '#0f172a', played: '#ef4444', animated: true, effect: 'glow' },
]

export const PROGRESS_COLLECTIONS: ProgressCollectionDef[] = [
  { id: 'memes', labelKey: 'sites.youtube.progress.collection.memes' },
  { id: 'games', labelKey: 'sites.youtube.progress.collection.games' },
  { id: 'cartoons', labelKey: 'sites.youtube.progress.collection.cartoons' },
  { id: 'cute', labelKey: 'sites.youtube.progress.collection.cute' },
  { id: 'scifi', labelKey: 'sites.youtube.progress.collection.scifi' },
  { id: 'gradients', labelKey: 'sites.youtube.progress.collection.gradients' },
]

/** One-click character / meme presets (theme + scrubber). */
export const PROGRESS_PRESET_BUNDLES: ProgressPresetBundle[] = [
  { id: 'preset-nyan', labelKey: 'sites.youtube.preset.nyan', collection: 'memes', tags: ['nyan', 'cat'], themeId: 'rainbow', scrubberAssetId: 'nyan' },
  { id: 'preset-pizza', labelKey: 'sites.youtube.preset.pizza', collection: 'memes', tags: ['pizza'], themeId: 'fire', scrubberAssetId: 'pizza' },
  { id: 'preset-popcat', labelKey: 'sites.youtube.preset.popcat', collection: 'memes', tags: ['pop', 'cat'], themeId: 'candy', scrubberAssetId: 'popcat' },
  { id: 'preset-doge', labelKey: 'sites.youtube.preset.doge', collection: 'memes', tags: ['doge'], themeId: 'gold', scrubberAssetId: 'doge' },
  { id: 'preset-fine', labelKey: 'sites.youtube.preset.thisIsFine', collection: 'memes', tags: ['fine', 'fire'], themeId: 'lava', scrubberAssetId: 'thisIsFine' },
  { id: 'preset-deal', labelKey: 'sites.youtube.preset.dealWithIt', collection: 'memes', tags: ['deal', 'glasses'], themeId: 'mono', scrubberAssetId: 'dealWithIt' },
  { id: 'preset-bongo', labelKey: 'sites.youtube.preset.bongoCat', collection: 'memes', tags: ['bongo'], themeId: 'neon', scrubberAssetId: 'bongoCat' },
  { id: 'preset-mario', labelKey: 'sites.youtube.preset.mario', collection: 'games', tags: ['mario'], themeId: 'fire', scrubberAssetId: 'mario' },
  { id: 'preset-mushroom', labelKey: 'sites.youtube.preset.mushroom', collection: 'games', tags: ['mushroom'], themeId: 'gold', scrubberAssetId: 'mushroom' },
  { id: 'preset-star', labelKey: 'sites.youtube.preset.star', collection: 'games', tags: ['star', 'mario'], themeId: 'rainbow', scrubberAssetId: 'star' },
  { id: 'preset-mc-sword', labelKey: 'sites.youtube.preset.diamondSword', collection: 'games', tags: ['minecraft'], themeId: 'minecraft', scrubberAssetId: 'diamondSword' },
  { id: 'preset-creeper', labelKey: 'sites.youtube.preset.creeper', collection: 'games', tags: ['creeper'], themeId: 'minecraft', scrubberAssetId: 'creeper' },
  { id: 'preset-sonic', labelKey: 'sites.youtube.preset.sonic', collection: 'games', tags: ['sonic'], themeId: 'sonic', scrubberAssetId: 'sonic' },
  { id: 'preset-pacman', labelKey: 'sites.youtube.preset.pacman', collection: 'games', tags: ['pacman'], themeId: 'pacman', scrubberAssetId: 'pacman' },
  { id: 'preset-among', labelKey: 'sites.youtube.preset.amongUs', collection: 'games', tags: ['among'], themeId: 'among', scrubberAssetId: 'amongUs' },
  { id: 'preset-kirby', labelKey: 'sites.youtube.preset.kirby', collection: 'games', tags: ['kirby'], themeId: 'rose', scrubberAssetId: 'kirby' },
  { id: 'preset-pikachu', labelKey: 'sites.youtube.preset.pikachu', collection: 'games', tags: ['pokemon'], themeId: 'gold', scrubberAssetId: 'pikachu' },
  { id: 'preset-bmo', labelKey: 'sites.youtube.preset.bmo', collection: 'cartoons', tags: ['bmo', 'adventure'], themeId: 'adventure', scrubberAssetId: 'bmo' },
  { id: 'preset-jake', labelKey: 'sites.youtube.preset.jake', collection: 'cartoons', tags: ['jake'], themeId: 'sunset', scrubberAssetId: 'jake' },
  { id: 'preset-pusheen', labelKey: 'sites.youtube.preset.pusheen', collection: 'cartoons', tags: ['pusheen'], themeId: 'pusheen', scrubberAssetId: 'pusheen' },
  { id: 'preset-kitty', labelKey: 'sites.youtube.preset.helloKitty', collection: 'cartoons', tags: ['hello', 'kitty'], themeId: 'rose', scrubberAssetId: 'helloKitty' },
  { id: 'preset-sponge', labelKey: 'sites.youtube.preset.sponge', collection: 'cartoons', tags: ['spongebob'], themeId: 'ocean', scrubberAssetId: 'sponge' },
  { id: 'preset-demon', labelKey: 'sites.youtube.preset.demonSlayer', collection: 'cartoons', tags: ['anime', 'demon'], themeId: 'midnight', scrubberAssetId: 'demonBlade' },
  { id: 'preset-corgi', labelKey: 'sites.youtube.preset.corgi', collection: 'cute', tags: ['corgi'], themeId: 'sunset', scrubberAssetId: 'corgi' },
  { id: 'preset-shiba', labelKey: 'sites.youtube.preset.shiba', collection: 'cute', tags: ['shiba'], themeId: 'gold', scrubberAssetId: 'shiba' },
  { id: 'preset-axolotl', labelKey: 'sites.youtube.preset.axolotl', collection: 'cute', tags: ['axolotl'], themeId: 'pusheen', scrubberAssetId: 'axolotl' },
  { id: 'preset-bee', labelKey: 'sites.youtube.preset.bee', collection: 'cute', tags: ['bee'], themeId: 'gold', scrubberAssetId: 'bee' },
  { id: 'preset-heart', labelKey: 'sites.youtube.preset.heart8bit', collection: 'cute', tags: ['heart', 'life'], themeId: 'rose', scrubberAssetId: 'heart8bit' },
  { id: 'preset-money', labelKey: 'sites.youtube.preset.money', collection: 'cute', tags: ['money'], themeId: 'forest', scrubberAssetId: 'money' },
  { id: 'preset-jedi', labelKey: 'sites.youtube.preset.jedi', collection: 'scifi', tags: ['jedi', 'lightsaber'], themeId: 'lightsaber', scrubberAssetId: 'lightsaberBlue' },
  { id: 'preset-sith', labelKey: 'sites.youtube.preset.sith', collection: 'scifi', tags: ['sith'], themeId: 'sith', scrubberAssetId: 'lightsaberRed' },
  { id: 'preset-batman', labelKey: 'sites.youtube.preset.batman', collection: 'scifi', tags: ['batman'], themeId: 'midnight', scrubberAssetId: 'batman' },
  { id: 'preset-delorean', labelKey: 'sites.youtube.preset.delorean', collection: 'scifi', tags: ['delorean', 'future'], themeId: 'ice', scrubberAssetId: 'delorean' },
  { id: 'preset-nimbus', labelKey: 'sites.youtube.preset.nimbus', collection: 'scifi', tags: ['harry', 'potter'], themeId: 'violet', scrubberAssetId: 'nimbus' },
]

export type ProgressGalleryItem =
  | { kind: 'bundle'; bundle: ProgressPresetBundle }
  | { kind: 'gradient'; theme: ProgressThemeDef }

export function getGradientGalleryItems(): ProgressGalleryItem[] {
  return PROGRESS_THEMES.filter((t) => t.id !== 'default').map((theme) => ({ kind: 'gradient', theme }))
}

export function getPresetsByCollection(collection: ProgressCollectionId): ProgressGalleryItem[] {
  if (collection === 'gradients') return getGradientGalleryItems()
  if (collection === 'all') {
    return [
      ...PROGRESS_PRESET_BUNDLES.map((bundle) => ({ kind: 'bundle' as const, bundle })),
      ...getGradientGalleryItems(),
    ]
  }
  const bundles = PROGRESS_PRESET_BUNDLES.filter((b) => b.collection === collection).map((bundle) => ({
    kind: 'bundle' as const,
    bundle,
  }))
  return bundles
}

export function searchPresets(query: string, collection: ProgressCollectionId): ProgressGalleryItem[] {
  const q = query.trim().toLowerCase()
  const base = getPresetsByCollection(collection)
  if (!q) return base
  return base.filter((item) => {
    if (item.kind === 'gradient') {
      const id = item.theme.id.toLowerCase()
      return id.includes(q)
    }
    const b = item.bundle
    const asset = b.scrubberAssetId ? getScrubberAsset(b.scrubberAssetId) : undefined
    const hay = [b.id, b.themeId, ...b.tags, ...(asset?.tags ?? [])].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function getPresetBundle(id: string): ProgressPresetBundle | undefined {
  return PROGRESS_PRESET_BUNDLES.find((p) => p.id === id)
}

export function bundleToValuePatch(bundle: ProgressPresetBundle): Record<string, YoutubeFeatureValue> {
  const asset = bundle.scrubberAssetId ? getScrubberAsset(bundle.scrubberAssetId) : undefined
  return {
    progressTheme: bundle.themeId,
    progressScrubberEmoji: bundle.scrubberEmoji ?? '',
    progressScrubberImage: asset?.dataUri ?? '',
  }
}

export function resolveGalleryTheme(item: ProgressGalleryItem): ProgressThemeDef | undefined {
  if (item.kind === 'gradient') return item.theme
  return getProgressTheme(item.bundle.themeId)
}

export function resolveGalleryScrubber(item: ProgressGalleryItem): {
  emoji: string
  image: string
} {
  if (item.kind === 'gradient') return { emoji: '', image: '' }
  const b = item.bundle
  const asset = b.scrubberAssetId ? getScrubberAsset(b.scrubberAssetId) : undefined
  return {
    emoji: b.scrubberEmoji ?? '',
    image: asset?.dataUri ?? '',
  }
}

export function isGalleryItemSelected(
  item: ProgressGalleryItem,
  values: Record<string, YoutubeFeatureValue>,
): boolean {
  const theme = String(values.progressTheme ?? 'default')
  const emoji = String(values.progressScrubberEmoji ?? '').trim()
  const image = String(values.progressScrubberImage ?? '').trim()
  if (item.kind === 'gradient') {
    return theme === item.theme.id && !emoji && !image
  }
  const b = item.bundle
  const asset = b.scrubberAssetId ? getScrubberAsset(b.scrubberAssetId) : undefined
  const expectedImage = asset?.dataUri ?? ''
  return theme === b.themeId && emoji === (b.scrubberEmoji ?? '') && image === expectedImage
}

export function getProgressTheme(themeId: string): ProgressThemeDef | undefined {
  return PROGRESS_THEMES.find((t) => t.id === themeId)
}

export function isProgressCustomizationActive(values: Record<string, YoutubeFeatureValue>): boolean {
  const theme = String(values.progressTheme ?? 'default')
  const barColor = String(values.progressBarColor ?? DEFAULT_BAR)
  const playedColor = String(values.progressPlayedColor ?? DEFAULT_PLAYED)
  const height = Number(values.progressHeight ?? DEFAULT_HEIGHT)
  const emoji = String(values.progressScrubberEmoji ?? '').trim()
  const image = String(values.progressScrubberImage ?? '').trim()
  return (
    theme !== 'default' ||
    barColor !== DEFAULT_BAR ||
    playedColor !== DEFAULT_PLAYED ||
    height !== DEFAULT_HEIGHT ||
    emoji.length > 0 ||
    image.length > 0
  )
}

export function isAllowedScrubberImageUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  return /^https:\/\//i.test(t) || /^data:image\//i.test(t)
}

export function themeCssVars(themeId: string, customBar?: string, customPlayed?: string, height?: number): Record<string, string> {
  const theme = getProgressTheme(themeId)
  let bar = theme?.bar ?? DEFAULT_BAR
  let played = theme?.played ?? DEFAULT_PLAYED
  if (themeId === 'custom' || themeId === 'default' || !theme) {
    if (customBar) bar = customBar
    if (customPlayed) played = customPlayed
  }
  return {
    '--tbx-yt-progress-bar': bar,
    '--tbx-yt-progress-played': played,
    '--tbx-yt-progress-height': `${height ?? DEFAULT_HEIGHT}px`,
  }
}

export function activePresetLabelKey(
  values: Record<string, YoutubeFeatureValue>,
): string {
  const theme = String(values.progressTheme ?? 'default')
  const emoji = String(values.progressScrubberEmoji ?? '').trim()
  const image = String(values.progressScrubberImage ?? '').trim()
  for (const bundle of PROGRESS_PRESET_BUNDLES) {
    if (isGalleryItemSelected({ kind: 'bundle', bundle }, values)) return bundle.labelKey
  }
  if (!emoji && !image) {
    const th = getProgressTheme(theme)
    if (th) return th.labelKey
  }
  if (emoji) return 'sites.youtube.progress.customEmojiActive'
  if (image) return 'sites.youtube.progress.customImageActive'
  return 'sites.youtube.progress.default'
}

export function scrubberAssetForValues(values: Record<string, YoutubeFeatureValue>): ScrubberAssetDef | undefined {
  const image = String(values.progressScrubberImage ?? '').trim()
  if (!image) return undefined
  return SCRUBBER_ASSETS.find((a) => a.dataUri === image)
}

export {
  SCRUBBER_ASSETS,
  getScrubberAsset,
  getScrubbersByCollection,
  type ScrubberAssetDef,
  type ScrubberCollectionId,
} from './scrubberAssets'
