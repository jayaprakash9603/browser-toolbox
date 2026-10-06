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

interface RouterContextValue {
  path: string
  search: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue>({ path: '/', search: '', navigate: () => undefined })

function readHash(): Pick<RouterContextValue, 'path' | 'search'> {
  const hash = window.location.hash.replace(/^#/, '')
  const queryIndex = hash.indexOf('?')
  const path = queryIndex === -1 ? hash : hash.slice(0, queryIndex)
  const search = queryIndex === -1 ? '' : hash.slice(queryIndex)
  return { path: path.startsWith('/') ? path : '/', search }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readHash)

  useEffect(() => {
    const onHashChange = () => setLocation(readHash())
    window.addEventListener('hashchange', onHashChange)
    const off = eventBus.on('OPEN_TOOL', ({ toolId }) => {
      import('@/core/registry').then(({ toolRegistry }) => {
        const tool = toolRegistry.get(toolId)
        if (tool) window.location.hash = tool.route
      })
    })
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      off()
    }
  }, [])

  const navigate = useCallback((to: string) => {
    window.location.hash = to
  }, [])

  return <RouterContext.Provider value={{ ...location, navigate }}>{children}</RouterContext.Provider>
}

export function useRouter() {
  return useContext(RouterContext)
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: ReactNode
}

export function Link({ to, children, ...props }: LinkProps) {
  return (
    <a href={`#${to}`} {...props}>
      {children}
    </a>
  )
}
