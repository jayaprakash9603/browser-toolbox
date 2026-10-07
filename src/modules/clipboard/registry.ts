import { ClipboardPasteIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const clipboardTools = [
  defineTool({
    id: 'clipboard.manager',
    name: 'Clipboard Manager',
    description: 'View, pin and manage everything you copy.',
    category: 'clipboard',
    icon: ClipboardPasteIcon,
    keywords: ['clipboard', 'manager', 'paste', 'copy', 'history', 'pinned', 'search'],
    aliases: ['clipboard history', 'copy history', 'clipboard manager'],
    route: '/tools/clipboard/manager',
    capabilities: ['SIDE_PANEL', 'CLIPBOARD', 'STORAGE'],
    toolkitGroup: 'clipboard-text',
    dependencies: ['clipboard'],
    status: 'active',
    loader: () => import('@/tools/clipboard/clipboard-manager/Tool'),
  }),
]
