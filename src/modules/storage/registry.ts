import { DatabaseIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const storageTools = [
  defineTool({
    id: 'storage.inspector',
    name: 'Storage Inspector',
    description:
      'Browse, search, edit, import and export localStorage and sessionStorage with type detection, JWT decode and live refresh.',
    category: 'storage',
    icon: DatabaseIcon,
    keywords: ['storage', 'localstorage', 'sessionstorage', 'cookies', 'inspect', 'keys'],
    aliases: ['local storage', 'session storage', 'storage inspector', 'cookies', 'web storage'],
    route: '/tools/storage/inspector',
    capabilities: ['SIDE_PANEL', 'CONTENT_SCRIPT', 'PAGE_ACCESS', 'DEVTOOLS'],
    status: 'active',
    loader: () => import('@/tools/storage/storage-inspector/Tool'),
  }),
]
