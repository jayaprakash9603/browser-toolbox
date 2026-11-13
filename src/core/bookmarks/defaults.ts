import type { BookmarkCollection, CollectionColor } from './model'

export const COLLECTION_COLORS: readonly CollectionColor[] = [
  'indigo',
  'violet',
  'emerald',
  'amber',
  'sky',
  'rose',
  'slate',
  'teal',
]

export const COLLECTION_COLOR_CLASS: Record<CollectionColor, string> = {
  indigo: 'bg-primary/12 text-primary',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  sky: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  rose: 'bg-rose-500/12 text-rose-700 dark:text-rose-400',
  slate: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
  teal: 'bg-teal-500/12 text-teal-700 dark:text-teal-400',
}

export const DEFAULT_COLLECTION_SEEDS: readonly Omit<BookmarkCollection, 'bookmarkIds'>[] = [
  { id: 'development', name: 'Development', icon: 'code', color: 'indigo', seeded: true },
  { id: 'design', name: 'Design', icon: 'palette', color: 'violet', seeded: true },
  { id: 'seo-marketing', name: 'SEO & Marketing', icon: 'megaphone', color: 'amber', seeded: true },
  { id: 'productivity', name: 'Productivity', icon: 'zap', color: 'teal', seeded: true },
  { id: 'learning', name: 'Learning', icon: 'graduation-cap', color: 'sky', seeded: true },
  { id: 'research', name: 'Research', icon: 'search', color: 'slate', seeded: true },
  { id: 'documentation', name: 'Documentation', icon: 'book-open', color: 'indigo', seeded: true },
  { id: 'social', name: 'Social Media', icon: 'share-2', color: 'rose', seeded: true },
  { id: 'news', name: 'News', icon: 'newspaper', color: 'amber', seeded: true },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: 'emerald', seeded: true },
  { id: 'entertainment', name: 'Entertainment', icon: 'clapperboard', color: 'violet', seeded: true },
  { id: 'finance', name: 'Finance', icon: 'wallet', color: 'teal', seeded: true },
  { id: 'other', name: 'Other', icon: 'folder', color: 'slate', seeded: true },
]

export function seededCollections(): Record<string, BookmarkCollection> {
  const collections: Record<string, BookmarkCollection> = {}
  for (const seed of DEFAULT_COLLECTION_SEEDS) {
    collections[seed.id] = { ...seed, bookmarkIds: [] }
  }
  return collections
}
