import { cn } from '@/shared/utils/cn'

export type AppLoadingSkeletonVariant = 'home' | 'collection' | 'category' | 'settings' | 'tool'

interface AppLoadingSkeletonProps {
  variant: AppLoadingSkeletonVariant
  label: string
}

export function AppLoadingSkeleton({ variant, label }: AppLoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className="h-full overflow-y-auto p-4"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {variant === 'settings' ? (
          <SettingsSkeleton />
        ) : variant === 'tool' ? (
          <ToolSkeleton />
        ) : (
          <LibrarySkeleton variant={variant} />
        )}
      </div>
    </div>
  )
}

function LibrarySkeleton({ variant }: { variant: 'home' | 'collection' | 'category' }) {
  const isHome = variant === 'home'
  const isCategory = variant === 'category'

  return (
    <div>
      {isHome ? (
        <div className="mb-4 space-y-2">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-3 w-56 max-w-full" />
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2.5">
          <SkeletonBlock className="h-7 w-14" />
          {isCategory && <SkeletonBlock className="size-8 rounded-md" />}
          <div className="space-y-2">
            <SkeletonBlock className="h-3.5 w-32" />
            {isCategory && <SkeletonBlock className="h-3 w-48 max-w-full" />}
          </div>
        </div>
      )}
      {(isHome || isCategory) && <SearchSkeleton />}
      {isHome ? (
        <ToolSectionSkeleton />
      ) : (
        <ToolGridSkeleton count={4} />
      )}
    </div>
  )
}

function ToolSectionSkeleton() {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <SkeletonBlock className="size-4 rounded-sm" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      <ToolGridSkeleton count={3} />
    </section>
  )
}

function ToolGridSkeleton({ count }: { count: number }) {
  return (
    <div data-skeleton-grid className="grid grid-cols-1 gap-2 @[360px]:grid-cols-2 @[560px]:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="min-h-[91px] rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <SkeletonBlock className="size-7 rounded-md" />
            <SkeletonBlock className="h-3 w-28 max-w-[65%]" />
          </div>
          <SkeletonBlock className="mb-1.5 h-2.5 w-full" />
          <SkeletonBlock className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div>
      <SkeletonBlock className="mb-4 h-7 w-14" />
      <SkeletonBlock className="mb-2 h-4 w-28" />
      <SkeletonBlock className="mb-5 h-3 w-52 max-w-full" />
      <SettingsRowSkeleton />
      <SettingsRowSkeleton />
      <SkeletonBlock className="my-4 h-px w-full" />
      <SkeletonBlock className="mb-3 h-3 w-24" />
      <SkeletonBlock className="mb-3 h-10 w-full rounded-md" />
      <SettingsRowSkeleton />
      <SettingsRowSkeleton />
      <SkeletonBlock className="my-4 h-px w-full" />
      <SkeletonBlock className="mb-3 h-3 w-20" />
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-full rounded-md" />
        <SkeletonBlock className="h-8 w-full rounded-md" />
        <SkeletonBlock className="h-8 w-full rounded-md" />
      </div>
    </div>
  )
}

function SettingsRowSkeleton() {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-2.5 w-44 max-w-full" />
      </div>
      <SkeletonBlock className="h-7 w-24 shrink-0 rounded-md" />
    </div>
  )
}

function ToolSkeleton() {
  return (
    <div className="-m-4 flex min-h-full flex-col">
      <div className="flex items-start gap-2.5 px-4 pt-3 pb-3">
        <SkeletonBlock className="mt-1 h-7 w-14 shrink-0" />
        <SkeletonBlock className="mt-0.5 size-8 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-3 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="size-8 shrink-0 rounded-md" />
      </div>
      <div className="border-t p-4">
        <div className="mb-4 flex gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-md" />
          <SkeletonBlock className="h-8 w-24 rounded-md" />
        </div>
        <SkeletonBlock className="mb-3 h-3 w-28" />
        <SkeletonBlock className="mb-4 h-9 w-full rounded-md" />
        <SkeletonBlock className="mb-2 h-3 w-20" />
        <SkeletonBlock className="mb-4 h-32 w-full rounded-md" />
        <SkeletonBlock className="mb-5 h-8 w-28 rounded-md" />
        <SkeletonBlock className="mb-2 h-3 w-24" />
        <SkeletonBlock className="h-28 w-full rounded-md" />
      </div>
    </div>
  )
}

function SearchSkeleton() {
  return (
    <div className="mb-4 flex h-8 items-center gap-2 rounded-md border px-2.5">
      <SkeletonBlock className="size-3.5 rounded-full" />
      <SkeletonBlock className="h-2.5 w-36" />
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded-sm bg-muted motion-reduce:animate-none', className)} />
}