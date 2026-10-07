import { ClipboardPasteIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const clipboardTools: ToolDefinition[] = [
  {
    id: 'clipboard.manager',
    name: 'Clipboard Manager',
    description: 'View, pin and manage everything you copy.',
    category: 'clipboard',
    icon: ClipboardPasteIcon,
    keywords: ['clipboard', 'manager', 'paste', 'copy', 'history', 'pinned', 'search'],
    aliases: ['clipboard history', 'copy history', 'clipboard manager'],
    route: '/tools/clipboard/manager',
    capabilities: ['SIDE_PANEL', 'CLIPBOARD', 'STORAGE'],
    status: 'active',
    loader: () => import('@/tools/clipboard/clipboard-manager/Tool'),
  },
]
