import { DatabaseIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const storageTools: ToolDefinition[] = [
  {
    id: 'storage.inspector',
    name: 'Storage Inspector',
    description: 'Inspect localStorage and sessionStorage of the current page.',
    category: 'storage',
    icon: DatabaseIcon,
    keywords: ['storage', 'localstorage', 'sessionstorage', 'cookies', 'inspect', 'keys'],
    aliases: ['local storage', 'session storage', 'storage inspector', 'cookies', 'web storage'],
    route: '/tools/storage/inspector',
    capabilities: ['SIDE_PANEL', 'CONTENT_SCRIPT', 'PAGE_ACCESS', 'DEVTOOLS'],
    status: 'active',
    loader: () => import('@/tools/storage/storage-inspector/Tool'),
  },
]
