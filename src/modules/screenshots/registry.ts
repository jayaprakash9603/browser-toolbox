import { CameraIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const screenshotsTools: ToolDefinition[] = [
  {
    id: 'screenshots.capture',
    name: 'Capture Toolkit',
    description: 'Capture the visible tab and annotate with shapes, text, highlight and blur.',
    category: 'screenshots',
    icon: CameraIcon,
    keywords: ['screenshot', 'capture', 'screen', 'annotate', 'arrow', 'blur'],
    aliases: ['take screenshot', 'screenshot', 'capture screen', 'annotate screenshot'],
    route: '/tools/screenshots/capture',
    capabilities: ['SIDE_PANEL', 'COMMAND', 'SCREEN_CAPTURE'],
    status: 'active',
    loader: () => import('@/tools/screenshots/capture/Tool'),
  },
]
