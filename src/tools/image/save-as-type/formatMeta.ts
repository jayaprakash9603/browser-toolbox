import type { ImageSaveFormat } from '@/core/imageConvert'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const FORMAT_TONE: Record<ImageSaveFormat, string> = {
  jpg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  png: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  webp: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  gif: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
  pdf: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

export const FORMAT_DOT: Record<ImageSaveFormat, string> = {
  jpg: 'bg-amber-500',
  png: 'bg-sky-500',
  webp: 'bg-emerald-500',
  gif: 'bg-fuchsia-500',
  pdf: 'bg-rose-500',
}

export const QUALITY_PRESETS = [
  { id: 'web', value: 75 },
  { id: 'balanced', value: 85 },
  { id: 'high', value: 92 },
  { id: 'max', value: 100 },
] as const

export type QualityTier = 'small' | (typeof QUALITY_PRESETS)[number]['id']

export function qualityTier(percent: number): QualityTier {
  if (percent >= 98) return 'max'
  if (percent >= 90) return 'high'
  if (percent >= 80) return 'balanced'
  if (percent >= 60) return 'web'
  return 'small'
}

export const BACKGROUND_SWATCHES = ['#ffffff', '#f4f4f5', '#18181b', '#000000'] as const

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const CHECKERBOARD =
  'bg-[conic-gradient(#e4e4e7_25%,#fafafa_0_50%,#e4e4e7_0_75%,#fafafa_0)] bg-[length:12px_12px] dark:bg-[conic-gradient(#3f3f46_25%,#27272a_0_50%,#3f3f46_0_75%,#27272a_0)]'
