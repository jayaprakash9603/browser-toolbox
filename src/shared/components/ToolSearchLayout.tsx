import type { KeyboardEventHandler, ReactNode, Ref } from 'react'

import { cn } from '@/shared/utils/cn'

interface ToolSearchLayoutProps {
  /** Search box, filters, view switches. Stays pinned above the scrolling content. */
  header?: ReactNode
  /** Scrolling content. */
  children: ReactNode
  /** Rendered after the scroll area, e.g. toasts positioned against the layout. */
  footer?: ReactNode
  className?: string
  /** Extra classes for the scroll area (padding overrides, etc.). */
  bodyClassName?: string
  bodyRef?: Ref<HTMLDivElement>
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
}

/**
 * Tool layout whose search/filter header never scrolls away: the header is a fixed row and only
 * the content below it scrolls, so nothing shows through above or behind the header.
 * Use inside `<ToolPage contentClassName="overflow-hidden p-0">`.
 */
export function ToolSearchLayout({
  header,
  children,
  footer,
  className,
  bodyClassName,
  bodyRef,
  onKeyDown,
}: ToolSearchLayoutProps) {
  return (
    <div
      className={cn('@container relative flex h-full min-h-0 flex-col', className)}
      onKeyDown={onKeyDown}
    >
      {header && (
        <div className="flex shrink-0 flex-col gap-2 border-b bg-background/95 px-[var(--density-page-pad)] pt-[var(--density-page-pad)] pb-2.5 backdrop-blur-xs">
          {header}
        </div>
      )}
      <div
        ref={bodyRef}
        className={cn(
          'scrollbar-styled min-h-0 flex-1 overflow-y-auto overscroll-contain px-[var(--density-page-pad)]',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  )
}
