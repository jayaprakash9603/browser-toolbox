import { CalendarClockIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const datetimeTools: ToolDefinition[] = [
  {
    id: 'datetime.toolkit',
    name: 'Date & Time Toolkit',
    description: 'Date calculator, timezone converter and cron parser.',
    category: 'datetime',
    icon: CalendarClockIcon,
    keywords: ['date', 'time', 'timezone', 'cron', 'working days', 'difference', 'add days'],
    aliases: ['date calculator', 'timezone converter', 'cron parser', 'cron expression', 'date difference', 'working days'],
    route: '/tools/datetime/toolkit',
    capabilities: ['SIDE_PANEL', 'CONTEXT_MENU'],
    status: 'active',
    loader: () => import('@/tools/datetime/datetime-toolkit/Tool'),
  },
]
