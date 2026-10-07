import { CameraIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const screenshotsTools = [
  defineTool({
    id: 'screenshots.capture',
    name: 'Capture Toolkit',
    description: 'Capture the visible tab and annotate with shapes, text, highlight and blur.',
    category: 'screenshots',
    icon: CameraIcon,
    keywords: ['screenshot', 'capture', 'screen', 'annotate', 'arrow', 'blur'],
    aliases: ['take screenshot', 'screenshot', 'capture screen', 'annotate screenshot'],
    route: '/tools/screenshots/capture',
    capabilities: ['SIDE_PANEL', 'COMMAND', 'SCREEN_CAPTURE'],
    dependencies: ['capture'],
    status: 'active',
    loader: () => import('@/tools/screenshots/capture/Tool'),
  }),
]
