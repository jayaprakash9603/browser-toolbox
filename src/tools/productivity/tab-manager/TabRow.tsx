import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppWindowIcon,
  CopyIcon,
  CopyPlusIcon,
  EllipsisVerticalIcon,
  GlobeIcon,
  LinkIcon,
  MoonIcon,
  PinIcon,
  PinOffIcon,
  PuzzleIcon,
  RotateCwIcon,
  SquareArrowOutUpRightIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { domainOf, pathOf, type TabInfo } from './tabModel'

export type RowAction =
  | 'focus'
  | 'reload'
  | 'duplicate'
  | 'pin'
  | 'mute'
  | 'sleep'
  | 'newWindow'
  | 'copyUrl'
  | 'copyMarkdown'
  | 'closeOthers'
  | 'close'

interface TabRowProps {
  tab: TabInfo
  selected: boolean
  selectMode: boolean
  duplicate: boolean
  onToggleSelect: (tab: TabInfo, range: boolean) => void
  onAction: (action: RowAction, tab: TabInfo) => void
}

function Favicon({ tab }: { tab: TabInfo }) {
  const [failed, setFailed] = useState(false)
  const usable = /^(https?:|data:image\/)/.test(tab.favIconUrl) && !failed
  if (usable) {
    return <img src={tab.favIconUrl} alt="" className="size-4 rounded-sm" onError={() => setFailed(true)} />
  }
  const Icon = /^chrome(-extension)?:\/\/extensions/.test(tab.url) || tab.url.startsWith('chrome-extension:')
    ? PuzzleIcon
    : tab.url.startsWith('chrome:')
      ? AppWindowIcon
      : GlobeIcon
  return <Icon className="size-4 text-muted-foreground" aria-hidden />
}

function StatusChip({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <span
      title={label}
      className={cn(
        'inline-flex h-4 shrink-0 items-center gap-0.5 rounded px-1 text-[10px] font-medium [&_svg]:size-2.5',
        className,
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function TabRow({ tab, selected, selectMode, duplicate, onToggleSelect, onAction }: TabRowProps) {
  const { t } = useTranslation()
  const domain = domainOf(tab.url)
  const path = pathOf(tab.url)
  const showCheckbox = selectMode || selected

  return (
    <li
      className={cn(
        'group relative flex items-center gap-1 rounded-lg border bg-card py-1 pr-1 pl-1.5 shadow-xs transition-colors hover:border-foreground/20 hover:bg-accent/40',
        selected && 'border-primary/40 bg-primary/5 hover:bg-primary/10',
        tab.active &&
          'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary',
        tab.discarded && !selected && 'opacity-75',
      )}
    >
      <div className="relative flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
        <span
          className={cn(
            'transition-opacity duration-150',
            showCheckbox ? 'opacity-0' : 'group-focus-within:opacity-0 group-hover:opacity-0',
          )}
        >
          <Favicon tab={tab} />
        </span>
        <Checkbox
          checked={selected}
          onClick={(e) => {
            e.preventDefault()
            onToggleSelect(tab, e.shiftKey)
          }}
          aria-label={t('tabs.selectTab', { title: tab.title })}
          className={cn(
            'absolute transition-opacity duration-150',
            showCheckbox ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
          )}
        />
      </div>

      <button
        type="button"
        onClick={(e) => (selectMode ? onToggleSelect(tab, e.shiftKey) : onAction('focus', tab))}
        className="min-w-0 flex-1 cursor-pointer rounded-md px-1.5 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={`${tab.title}\n${tab.url}`}
      >
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[13px] leading-5 font-medium">{tab.title}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] leading-4 text-muted-foreground">
          {tab.active && (
            <StatusChip label={t('tabs.badge.active')} className="bg-primary/12 text-primary">
              {t('tabs.badge.activeShort')}
            </StatusChip>
          )}
          {tab.pinned && (
            <StatusChip label={t('tabs.badge.pinned')} className="bg-muted text-foreground/80">
              <PinIcon />
            </StatusChip>
          )}
          {(tab.audible || tab.muted) && (
            <StatusChip
              label={tab.muted ? t('tabs.badge.muted') : t('tabs.badge.playing')}
              className="bg-sky-500/12 text-sky-700 dark:text-sky-300"
            >
              {tab.muted ? <VolumeXIcon /> : <Volume2Icon />}
            </StatusChip>
          )}
          {tab.discarded && (
            <StatusChip label={t('tabs.badge.sleeping')} className="bg-violet-500/12 text-violet-700 dark:text-violet-300">
              <MoonIcon />
            </StatusChip>
          )}
          {duplicate && (
            <StatusChip label={t('tabs.badge.duplicate')} className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <CopyIcon />
              {t('tabs.badge.duplicateShort')}
            </StatusChip>
          )}
          <span className="min-w-0 truncate">
            <span className="text-foreground/75">{domain}</span>
            {path && <span className="opacity-70">{path}</span>}
          </span>
        </span>
      </button>

      {(tab.audible || tab.muted) && (
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onAction('mute', tab)}
          aria-label={tab.muted ? t('tabs.unmute') : t('tabs.mute')}
          title={tab.muted ? t('tabs.unmute') : t('tabs.mute')}
        >
          {tab.muted ? <VolumeXIcon /> : <Volume2Icon />}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t('tabs.tabActions')}
            title={t('tabs.tabActions')}
            className="opacity-60 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))]">
          <DropdownMenuItem onSelect={() => onAction('focus', tab)}>
            <SquareArrowOutUpRightIcon className="size-4" />
            {t('tabs.switchTo')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('reload', tab)}>
            <RotateCwIcon className="size-4" />
            {t('tabs.reload')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('duplicate', tab)}>
            <CopyPlusIcon className="size-4" />
            {t('tabs.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('pin', tab)}>
            {tab.pinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
            {tab.pinned ? t('tabs.unpin') : t('tabs.pin')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('mute', tab)}>
            {tab.muted ? <Volume2Icon className="size-4" /> : <VolumeXIcon className="size-4" />}
            {tab.muted ? t('tabs.unmute') : t('tabs.mute')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={tab.active || tab.discarded} onSelect={() => onAction('sleep', tab)}>
            <MoonIcon className="size-4" />
            {t('tabs.sleep')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('newWindow', tab)}>
            <AppWindowIcon className="size-4" />
            {t('tabs.moveToNewWindow')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onAction('copyUrl', tab)}>
            <LinkIcon className="size-4" />
            {t('tabs.copyUrl')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('copyMarkdown', tab)}>
            <CopyIcon className="size-4" />
            {t('tabs.copyMarkdown')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onAction('closeOthers', tab)}>
            <XIcon className="size-4" />
            {t('tabs.closeOthers')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={() => onAction('close', tab)}
        aria-label={t('tabs.close')}
        title={t('tabs.close')}
        className="hover:bg-destructive/10 hover:text-destructive"
      >
        <XIcon />
      </Button>
    </li>
  )
}
