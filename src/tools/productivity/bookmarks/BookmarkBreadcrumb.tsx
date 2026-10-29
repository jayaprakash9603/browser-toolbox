import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, CornerLeftUpIcon, HomeIcon, PlusIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import type { BookmarkFolder } from './service'

interface BookmarkBreadcrumbProps {
  trail: readonly BookmarkFolder[]
  onNavigate: (folderId: string | 'all') => void
  onAddFolder: () => void
}

export function BookmarkBreadcrumb({ trail, onNavigate, onAddFolder }: BookmarkBreadcrumbProps) {
  const { t } = useTranslation()
  const parent = trail.length > 1 ? trail[trail.length - 2].id : 'all'

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon-xs"
        variant="outline"
        className="size-7 shrink-0"
        aria-label={t('bookmarks.up')}
        title={t('bookmarks.up')}
        onClick={() => onNavigate(parent)}
      >
        <CornerLeftUpIcon />
      </Button>
      <nav
        aria-label={t('bookmarks.breadcrumb')}
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap"
      >
        <Crumb onClick={() => onNavigate('all')} label={t('bookmarks.allBookmarks')} icon />
        {trail.map((folder, index) => (
          <Fragment key={folder.id}>
            <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
            <Crumb
              label={folder.title}
              current={index === trail.length - 1}
              onClick={() => onNavigate(folder.id)}
            />
          </Fragment>
        ))}
      </nav>
      <Button
        size="xs"
        variant="ghost"
        className="shrink-0 text-primary"
        title={t('bookmarks.newFolder')}
        onClick={onAddFolder}
      >
        <PlusIcon />
        <span className="hidden @[420px]:inline">{t('bookmarks.newFolder')}</span>
        <span className="sr-only @[420px]:hidden">{t('bookmarks.newFolder')}</span>
      </Button>
    </div>
  )
}

function Crumb({
  label,
  current,
  icon,
  onClick,
}: {
  label: string
  current?: boolean
  icon?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        current ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon && <HomeIcon className="size-3" aria-hidden />}
      <span className="max-w-40 truncate">{label}</span>
    </button>
  )
}
