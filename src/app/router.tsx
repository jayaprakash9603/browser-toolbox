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
    if (chrome.storage?.session) {
      void chrome.storage.session.get(PENDING_ROUTE_KEY).then((stored) => {
        applyPendingRoute(stored[PENDING_ROUTE_KEY])
      })
      chrome.storage.onChanged.addListener(onPendingRoute)
    }
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      chrome.storage?.onChanged.removeListener(onPendingRoute)
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
