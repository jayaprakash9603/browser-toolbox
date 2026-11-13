import {
  BookOpenIcon,
  ClapperboardIcon,
  CodeIcon,
  FolderIcon,
  GraduationCapIcon,
  MegaphoneIcon,
  NewspaperIcon,
  PaletteIcon,
  SearchIcon,
  Share2Icon,
  ShoppingBagIcon,
  WalletIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react'

import { COLLECTION_COLOR_CLASS, type CollectionColor } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

const ICONS: Record<string, LucideIcon> = {
  code: CodeIcon,
  palette: PaletteIcon,
  megaphone: MegaphoneIcon,
  zap: ZapIcon,
  'graduation-cap': GraduationCapIcon,
  search: SearchIcon,
  'book-open': BookOpenIcon,
  'share-2': Share2Icon,
  newspaper: NewspaperIcon,
  'shopping-bag': ShoppingBagIcon,
  clapperboard: ClapperboardIcon,
  wallet: WalletIcon,
  folder: FolderIcon,
}

export const COLLECTION_ICON_IDS = Object.keys(ICONS)

export function CollectionIcon({
  icon,
  color,
  className,
}: {
  icon: string
  color: CollectionColor
  className?: string
}) {
  const Glyph = ICONS[icon] ?? FolderIcon
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
        COLLECTION_COLOR_CLASS[color],
        className,
      )}
    >
      <Glyph className="size-4" aria-hidden />
    </span>
  )
}
