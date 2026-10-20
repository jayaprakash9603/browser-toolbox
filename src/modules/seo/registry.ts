import { SearchCheckIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const seoTools = [
  defineTool({
    id: 'seo.toolkit',
    name: 'SEO Toolkit',
    description:
      'Full on-page SEO audit: meta, indexability, content, links, images, schema, hreflang, social and PageSpeed.',
    category: 'seo',
    icon: SearchCheckIcon,
    keywords: [
      'seo',
      'meta',
      'headings',
      'links',
      'open graph',
      'alt',
      'title',
      'description',
      'canonical',
      'robots',
      'sitemap',
      'schema',
      'hreflang',
      'pagespeed',
      'structured data',
    ],
    aliases: [
      'seo analyzer',
      'seo audit',
      'page seo',
      'meta analyzer',
      'heading structure',
      'detailed seo',
      'on-page seo',
    ],
    route: '/tools/seo/toolkit',
    capabilities: ['SIDE_PANEL', 'CONTENT_SCRIPT', 'PAGE_ACCESS'],
    dependencies: ['seo'],
    status: 'active',
    loader: () => import('@/tools/seo/seo-toolkit/Tool'),
  }),
]
