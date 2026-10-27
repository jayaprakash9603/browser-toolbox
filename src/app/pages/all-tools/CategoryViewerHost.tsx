import { lazy, Suspense } from 'react'

import type { CategoryViewerProps } from '@/app/pages/all-tools/CategoryViewer'

const CategoryViewer = lazy(() =>
  import('@/app/pages/all-tools/CategoryViewer').then((module) => ({ default: module.CategoryViewer })),
)

/** Loads the full-panel category pager only when opened, keeping the home boot bundle smaller. */
export function CategoryViewerHost(props: CategoryViewerProps) {
  if (!props.open) return null
  return (
    <Suspense fallback={null}>
      <CategoryViewer {...props} />
    </Suspense>
  )
}
