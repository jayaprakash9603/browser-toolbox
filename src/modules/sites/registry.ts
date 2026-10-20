import { MessageCircleIcon, PlaySquareIcon } from 'lucide-react'

import { defineTool } from '@/core/registry/defineTool'

export const sitesTools = [
  defineTool({
    id: 'sites.youtube',
    name: 'YouTube Control Panel',
    description: 'Hide clutter, tune the player, custom progress bar, and optional SponsorBlock',
    category: 'sites',
    icon: PlaySquareIcon,
    keywords: ['youtube', 'shorts', 'player', 'enhancer', 'sponsorblock', 'progress bar', 'feed'],
    aliases: ['yt', 'control panel for youtube'],
    route: '/tools/sites/youtube',
    capabilities: ['SIDE_PANEL', 'COMMAND', 'PAGE_ACCESS'],
    loader: () => import('@/tools/sites/youtube/Tool'),
  }),
  defineTool({
    id: 'sites.whatsapp',
    name: 'WhatsApp Web Plus',
    description: 'Privacy, business tools, exports, and broadcasting for web.whatsapp.com',
    category: 'sites',
    icon: MessageCircleIcon,
    keywords: ['whatsapp', 'wa', 'web plus', 'business', 'broadcast', 'privacy'],
    aliases: ['wa web plus', 'whatsapp plus'],
    route: '/tools/sites/whatsapp',
    capabilities: ['SIDE_PANEL', 'COMMAND', 'PAGE_ACCESS'],
    loader: () => import('@/tools/sites/whatsapp/Tool'),
  }),
]
