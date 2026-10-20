import { PanelsTopLeftIcon, PictureInPicture2Icon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const browserTools = [
  defineTool({
    id: 'browser.picture-in-picture',
    name: 'Picture-in-Picture',
    description: 'Float the page video in a always-on-top window with Alt+P or the context menu.',
    category: 'browser',
    icon: PictureInPicture2Icon,
    keywords: ['pip', 'picture in picture', 'video', 'float', 'player', 'alt+p'],
    aliases: ['watch video pip', 'floating video', 'mini player'],
    route: '/tools/browser/picture-in-picture',
    capabilities: ['CONTEXT_MENU', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/browser/picture-in-picture/Tool'),
  }),
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
