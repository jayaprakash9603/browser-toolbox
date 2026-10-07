import { SearchCheckIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const seoTools = [
  defineTool({
    id: 'seo.toolkit',
    name: 'SEO Toolkit',
    description: 'Analyze the current page: meta, headings, links, images and Open Graph.',
    category: 'seo',
    icon: SearchCheckIcon,
    keywords: ['seo', 'meta', 'headings', 'links', 'open graph', 'alt', 'title', 'description'],
    aliases: ['seo analyzer', 'seo audit', 'page seo', 'meta analyzer', 'heading structure'],
    route: '/tools/seo/toolkit',
    capabilities: ['SIDE_PANEL', 'CONTENT_SCRIPT', 'PAGE_ACCESS'],
    dependencies: ['seo'],
    status: 'active',
    loader: () => import('@/tools/seo/seo-toolkit/Tool'),
  }),
]
