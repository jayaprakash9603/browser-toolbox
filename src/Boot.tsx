import { lazy, Suspense, useEffect, useState } from 'react'

const App = lazy(() => import('@/app/App'))

export function Boot() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const [{ registerModules }, { preloadRouteFromHash }] = await Promise.all([
        import('@/modules'),
        import('@/app/routePreload'),
        import('@/i18n'),
        import('@/app/App'),
      ])
      registerModules()
      preloadRouteFromHash()
      setReady(true)
    })()
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  )
}
