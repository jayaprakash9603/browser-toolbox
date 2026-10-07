import { NotebookPenIcon, TimerIcon, LayoutGridIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const productivityTools: ToolDefinition[] = [
  {
    id: 'productivity.notes',
    name: 'Notes',
    description: 'Local markdown notes with search and pinning.',
    category: 'productivity',
    icon: NotebookPenIcon,
    keywords: ['notes', 'markdown', 'write', 'pin', 'search', 'local'],
    aliases: ['notes', 'notepad', 'scratchpad', 'quick notes'],
    route: '/tools/productivity/notes',
    capabilities: ['SIDE_PANEL', 'STORAGE'],
    status: 'active',
    loader: () => import('@/tools/productivity/notes/Tool'),
  },
  {
    id: 'productivity.timer',
    name: 'Timer',
    description: 'Countdown, stopwatch and Pomodoro timer.',
    category: 'productivity',
    icon: TimerIcon,
    keywords: ['timer', 'countdown', 'stopwatch', 'pomodoro', 'focus'],
    aliases: ['timer', 'countdown timer', 'stopwatch', 'pomodoro timer', 'focus timer'],
    route: '/tools/productivity/timer',
    capabilities: ['SIDE_PANEL'],
    status: 'active',
    loader: () => import('@/tools/productivity/timer/Tool'),
  },
  {
    id: 'productivity.tab-manager',
    name: 'Tab Manager',
    description: 'Search, close duplicates, and copy URLs of open tabs.',
    category: 'productivity',
    icon: LayoutGridIcon,
    keywords: ['tabs', 'manage', 'close', 'duplicates', 'search', 'urls'],
    aliases: ['tab manager', 'duplicate tabs', 'close tabs', 'tab search', 'copy tab urls'],
    route: '/tools/productivity/tab-manager',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/productivity/tab-manager/Tool'),
  },
]
