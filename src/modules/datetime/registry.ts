import { CalendarClockIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const datetimeTools = [
  defineTool({
    id: 'datetime.toolkit',
    name: 'Date & Time Toolkit',
    description: 'Unix timestamps, date calculator, timezone converter and cron parser.',
    category: 'datetime',
    icon: CalendarClockIcon,
    keywords: [
      'date',
      'time',
      'timezone',
      'cron',
      'working days',
      'difference',
      'add days',
      'timestamp',
      'unix',
      'epoch',
    ],
    aliases: [
      'date calculator',
      'timezone converter',
      'cron parser',
      'cron expression',
      'date difference',
      'working days',
      'unix timestamp',
      'timestamp converter',
    ],
    route: '/tools/datetime/toolkit',
    capabilities: ['SIDE_PANEL', 'CONTEXT_MENU'],
    contextSurfaces: ['SELECTION'],
    toolkitGroup: 'datetime',
    dependencies: ['date', 'timezone'],
    status: 'active',
    loader: () => import('@/tools/datetime/datetime-toolkit/Tool'),
  }),
]
