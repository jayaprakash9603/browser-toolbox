import { CameraIcon, VideoIcon } from 'lucide-react'

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
  defineTool({
    id: 'screenshots.recorder',
    name: 'Screen Recorder',
    description: 'Record a tab, window, or your whole screen with mic and tab audio, then save or share it.',
    category: 'screenshots',
    icon: VideoIcon,
    keywords: ['record', 'recorder', 'screen recording', 'video', 'screencast', 'tutorial', 'webm', 'mp4'],
    aliases: ['record screen', 'screen recorder', 'record tab', 'screencast'],
    route: '/tools/screenshots/recorder',
    capabilities: ['SIDE_PANEL', 'COMMAND', 'SCREEN_CAPTURE'],
    dependencies: ['capture'],
    status: 'active',
    loader: () => import('@/tools/screenshots/recorder/Tool'),
  }),
]
