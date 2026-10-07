import { AccessibilityIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const accessibilityTools = [
  defineTool({
    id: 'accessibility.toolkit',
    name: 'Accessibility Quick Check',
    description: 'Quick page checks: alt text, headings, link names and language.',
    category: 'accessibility',
    icon: AccessibilityIcon,
    keywords: ['accessibility', 'a11y', 'alt', 'headings', 'aria', 'contrast', 'wcag'],
    aliases: ['accessibility check', 'a11y audit', 'alt text check', 'heading check'],
    route: '/tools/accessibility/toolkit',
    capabilities: ['SIDE_PANEL', 'CONTENT_SCRIPT', 'PAGE_ACCESS'],
    status: 'active',
    loader: () => import('@/tools/accessibility/accessibility-toolkit/Tool'),
  }),
]
