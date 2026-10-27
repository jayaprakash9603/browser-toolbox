import { LockIcon, RotateCwIcon, SearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

import { useToolMeta, type ToolMeta } from './context'
import { LogoMark } from './Logo'

interface PanelChromeProps {
  title?: string
  icon?: ToolMeta['icon']
  children: ReactNode
  className?: string
  /** Right side of the tool header (status pill, actions). */
  aside?: ReactNode
  compact?: boolean
}

/** The One Panel side panel: brand bar, tool header, then the tool body. */
export function PanelChrome({ title, icon, children, className, aside, compact = false }: PanelChromeProps) {
  const meta = useToolMeta()
  const Icon = icon ?? meta.icon
  return (
    <div className={cn('flex h-full flex-col bg-surface', className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <LogoMark className="size-3.5" />
        <span className="text-[11px] font-medium text-ink-soft">One Panel</span>
        {compact ? null : (
          <span className="ml-auto flex h-6 w-36 items-center gap-1.5 rounded-full border border-line bg-canvas/80 px-2.5 text-[10px] text-muted">
            <SearchIcon className="size-2.5" /> Search tools
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-line-strong bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
          <Icon aria-hidden className="size-4" strokeWidth={1.8} />
        </span>
        <span className="text-[13px] font-medium">{title ?? meta.name}</span>
        {aside ? <span className="ml-auto">{aside}</span> : null}
      </div>
      <div className="relative min-h-0 flex-1 px-4 pt-1 pb-4">{children}</div>
    </div>
  )
}

interface BrowserChromeProps {
  url: string
  children: ReactNode
  /** Docked side panel on the right, like One Panel in Chrome. */
  panel?: ReactNode
  panelWidth?: number
  tab?: string
  className?: string
}

export function BrowserChrome({ url, children, panel, panelWidth = 200, tab, className }: BrowserChromeProps) {
  return (
    <div className={cn('flex h-full flex-col bg-[#0b0b11]', className)}>
      <div className="flex items-end gap-2 bg-[#05050a] px-3 pt-2">
        <span className="mb-2.5 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="size-2.5 rounded-full bg-[#28c840]/80" />
        </span>
        <span className="ml-2 max-w-40 truncate rounded-t-lg bg-[#0b0b11] px-3 py-1.5 text-[10px] text-ink-soft">
          {tab ?? url.replace(/^https?:\/\//, '').split('/')[0]}
        </span>
      </div>
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <RotateCwIcon className="size-3 text-muted" />
        <span
          data-d="url"
          className="flex h-6 flex-1 items-center gap-1.5 truncate rounded-full bg-white/[0.05] px-3 font-mono text-[10px] text-ink-soft"
        >
          <LockIcon className="size-2.5 shrink-0 text-muted" />
          <span data-d="url-text" className="truncate">
            {url}
          </span>
        </span>
        <LogoMark className="size-3.5" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 overflow-hidden">{children}</div>
        {panel ? (
          <div
            data-d="side-panel"
            className="relative shrink-0 overflow-hidden border-l border-line-strong bg-surface"
            style={{ width: panelWidth }}
          >
            {panel}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Compact header used inside a docked side panel. */
export function DockHeader({ title, icon }: { title?: string; icon?: ToolMeta['icon'] }) {
  const meta = useToolMeta()
  const Icon = icon ?? meta.icon
  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]">
        <Icon aria-hidden className="size-3.5" strokeWidth={1.8} />
      </span>
      <span className="truncate text-[11.5px] font-medium">{title ?? meta.name}</span>
    </div>
  )
}
