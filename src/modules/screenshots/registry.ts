import { CameraIcon, VideoIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const screenshotsTools = [
  defineTool({
    id: 'screenshots.capture',
    name: 'Page Capture',
    description: 'Capture the visible area, a selection, an element or a full scrolling page, then annotate with shapes, text, highlight and blur.',
    category: 'screenshots',
    icon: CameraIcon,
    keywords: ['screenshot', 'capture', 'screen', 'annotate', 'arrow', 'blur', 'scrolling', 'full page'],
    aliases: ['capture toolkit', 'take screenshot', 'screenshot', 'capture screen', 'annotate screenshot', 'page capture'],
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
