import type { NoteColor } from './notesService'

interface ColorStyle {
  swatch: string
  surface: string
  accent: string
}

export const NOTE_COLOR_STYLES: Record<NoteColor, ColorStyle> = {
  default: { swatch: 'bg-background', surface: 'bg-background', accent: 'border-l-border' },
  yellow: {
    swatch: 'bg-amber-300',
    surface: 'bg-amber-50 dark:bg-amber-400/10',
    accent: 'border-l-amber-400',
  },
  green: {
    swatch: 'bg-emerald-300',
    surface: 'bg-emerald-50 dark:bg-emerald-400/10',
    accent: 'border-l-emerald-400',
  },
  pink: { swatch: 'bg-pink-300', surface: 'bg-pink-50 dark:bg-pink-400/10', accent: 'border-l-pink-400' },
  purple: {
    swatch: 'bg-violet-300',
    surface: 'bg-violet-50 dark:bg-violet-400/10',
    accent: 'border-l-violet-400',
  },
  blue: { swatch: 'bg-sky-300', surface: 'bg-sky-50 dark:bg-sky-400/10', accent: 'border-l-sky-400' },
  gray: { swatch: 'bg-zinc-300', surface: 'bg-zinc-100 dark:bg-zinc-400/10', accent: 'border-l-zinc-400' },
  charcoal: {
    swatch: 'bg-zinc-700',
    surface: 'bg-zinc-800 text-zinc-50 dark:bg-zinc-950',
    accent: 'border-l-zinc-700',
  },
}
