import { ShieldBanIcon, ShieldCheckIcon } from 'lucide-react'

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
  defineTool({
    id: 'privacy.web-protection',
    name: 'Web Protection',
    description:
      'Block known phishing, malware and scam sites. Warns on suspicious sign-in pages. On by default.',
    category: 'privacy',
    icon: ShieldCheckIcon,
    keywords: ['phishing', 'malware', 'scam', 'security', 'safe browsing', '360'],
    aliases: ['web protection', 'internet protection', 'anti phishing'],
    route: '/tools/privacy/web-protection',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/privacy/web-protection/Tool'),
  }),
]
