import {
  ClipboardPasteIcon,
  HistoryIcon,
  PinIcon,
  SearchIcon,
} from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const clipboardTools: ToolDefinition[] = [
  {
    id: 'clipboard.manager',
    name: 'Clipboard Manager',
    description: 'View, pin and manage everything you copy.',
    category: 'clipboard',
    icon: ClipboardPasteIcon,
    keywords: ['clipboard', 'manager', 'paste', 'copy'],
    route: '/tools/clipboard/manager',
    capabilities: ['SIDE_PANEL', 'CLIPBOARD', 'STORAGE'],
    loader: () => import('@/tools/clipboard/clipboard-manager/Tool'),
  },
  {
    id: 'clipboard.history',
    name: 'Clipboard History',
    description: 'Searchable history of copied text.',
    category: 'clipboard',
    icon: HistoryIcon,
    keywords: ['clipboard', 'history', 'recent', 'copied'],
    route: '/tools/clipboard/history',
    capabilities: ['SIDE_PANEL', 'CLIPBOARD', 'STORAGE'],
    loader: () => import('@/tools/clipboard/clipboard-history/Tool'),
  },
  {
    id: 'clipboard.pinned',
    name: 'Pinned Items',
    description: 'Your pinned clipboard snippets, always at hand.',
    category: 'clipboard',
    icon: PinIcon,
    keywords: ['clipboard', 'pinned', 'snippets', 'saved'],
    route: '/tools/clipboard/pinned',
    capabilities: ['SIDE_PANEL', 'CLIPBOARD', 'STORAGE'],
    loader: () => import('@/tools/clipboard/clipboard-pinned/Tool'),
  },
  {
    id: 'clipboard.search',
    name: 'Clipboard Search',
    description: 'Search across your entire clipboard history.',
    category: 'clipboard',
    icon: SearchIcon,
    keywords: ['clipboard', 'search', 'find', 'copy'],
    route: '/tools/clipboard/search',
    capabilities: ['SIDE_PANEL', 'CLIPBOARD', 'STORAGE'],
    loader: () => import('@/tools/clipboard/clipboard-search/Tool'),
  },
]
