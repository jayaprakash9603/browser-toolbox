import { ShieldBanIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const privacyTools = [
  defineTool({
    id: 'privacy.ad-blocker',
    name: 'Ad Blocker',
    description:
      'Block ads and trackers on websites and YouTube. Per-site allowlist and filter lists.',
    category: 'privacy',
    icon: ShieldBanIcon,
    keywords: ['adblock', 'ads', 'privacy', 'youtube', 'tracker', 'block'],
    aliases: ['ublock', 'ad blocker', 'block ads'],
    route: '/tools/privacy/ad-blocker',
    capabilities: ['SIDE_PANEL', 'COMMAND', 'PAGE_ACCESS'],
    status: 'active',
    loader: () => import('@/tools/privacy/ad-blocker/Tool'),
  }),
]
