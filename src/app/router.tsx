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
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue>({ path: '/', navigate: () => undefined })

function readHash(): string {
  const hash = window.location.hash.replace(/^#/, '')
  return hash.startsWith('/') ? hash : '/'
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(readHash)

  useEffect(() => {
    const onHashChange = () => setPath(readHash())
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

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>
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
