import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'

import { eventBus } from '@/core/events'
import {
  consumeOpenHomeOnPanel,
  consumePanelRouteIntent,
  PANEL_OPEN_HOME_KEY,
  PANEL_ROUTE_INTENT_KEY,
} from '@/core/panel/navigationSession'
import { PENDING_ROUTE_KEY } from '@/core/timer/model'
import { cn } from '@/shared/utils/cn'

interface RouterContextValue {
  path: string
  search: string
  navKey: number
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue>({
  path: '/',
  search: '',
  navKey: 0,
  navigate: () => undefined,
})

function readHash(): Pick<RouterContextValue, 'path' | 'search'> {
  const hash = window.location.hash.replace(/^#/, '')
  const queryIndex = hash.indexOf('?')
  const path = queryIndex === -1 ? hash : hash.slice(0, queryIndex)
  const search = queryIndex === -1 ? '' : hash.slice(queryIndex)
  return { path: path.startsWith('/') ? path : '/', search }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readHash)
  const [navKey, setNavKey] = useState(0)

  useEffect(() => {
    void (async () => {
      const intent = await consumePanelRouteIntent()
      if (intent) {
        window.location.hash = intent
        return
      }
      const openHome = await consumeOpenHomeOnPanel()
      if (openHome) {
        const { path } = readHash()
        if (path.startsWith('/tools/') || path.startsWith('/categories/') || path.startsWith('/devtools')) {
          window.location.hash = '/'
        }
      }
    })()

    const onHashChange = () => setLocation(readHash())
    window.addEventListener('hashchange', onHashChange)
    const off = eventBus.on('OPEN_TOOL', ({ toolId }) => {
      import('@/core/registry').then(({ toolRegistry }) => {
        const tool = toolRegistry.get(toolId)
        if (tool) window.location.hash = tool.route
      })
    })
    const applyPendingRoute = (route: unknown) => {
      if (typeof route !== 'string' || !route.startsWith('/tools/')) return
      window.location.hash = route
      void Promise.resolve(chrome.storage.session.remove(PENDING_ROUTE_KEY)).catch(() => undefined)
    }
    const onPendingRoute = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'session' && changes[PENDING_ROUTE_KEY]) applyPendingRoute(changes[PENDING_ROUTE_KEY].newValue)
    }
    const onSessionNav = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'session') return
      if (changes[PANEL_OPEN_HOME_KEY]?.newValue) {
        void consumeOpenHomeOnPanel().then((openHome) => {
          if (openHome) window.location.hash = '/'
        })
      }
      if (changes[PANEL_ROUTE_INTENT_KEY]?.newValue) {
        void consumePanelRouteIntent().then((route) => {
          if (route) window.location.hash = route
        })
      }
    }

    if (chrome.storage?.session) {
      void chrome.storage.session.get(PENDING_ROUTE_KEY).then((stored) => {
        applyPendingRoute(stored[PENDING_ROUTE_KEY])
      })
      chrome.storage.onChanged.addListener(onPendingRoute)
      chrome.storage.onChanged.addListener(onSessionNav)
    }
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      chrome.storage?.onChanged.removeListener(onPendingRoute)
      chrome.storage?.onChanged?.removeListener(onSessionNav)
      off()
    }
  }, [])

  const navigate = useCallback((to: string) => {
    setNavKey((key) => key + 1)
    window.location.hash = to
    const next = readHash()
    if (next.path === location.path && next.search === location.search) {
      setLocation(next)
    }
  }, [location.path, location.search])

  return (
    <RouterContext.Provider value={{ ...location, navKey, navigate }}>{children}</RouterContext.Provider>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: ReactNode
}

export function Link({ to, children, className, ...props }: LinkProps) {
  return (
    <a href={`#${to}`} className={cn('cursor-pointer', className)} {...props}>
      {children}
    </a>
  )
}
