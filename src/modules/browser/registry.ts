import { PanelsTopLeftIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const browserTools = [
  defineTool({
    id: 'browser.toolkit',
    name: 'Browser Toolkit',
    description: 'Copy page URL/title, reload, hard-reload and duplicate the tab.',
    category: 'browser',
    icon: PanelsTopLeftIcon,
    keywords: ['browser', 'tab', 'url', 'title', 'reload', 'duplicate', 'copy'],
    aliases: ['copy url', 'copy title', 'reload page', 'hard refresh', 'duplicate tab'],
    route: '/tools/browser/toolkit',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/browser/browser-toolkit/Tool'),
  }),
]
