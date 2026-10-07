import { NetworkIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const apiTools = [
  defineTool({
    id: 'api.request-builder',
    name: 'API Request Builder',
    description:
      'Full API client with collections, environments, scripts, and request history (Postman Lite).',
    category: 'api',
    icon: NetworkIcon,
    keywords: ['api', 'http', 'request', 'rest', 'client', 'endpoint', 'response', 'history'],
    aliases: ['api client', 'http client', 'rest client', 'request builder', 'postman'],
    route: '/tools/api/request-builder',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    toolkitGroup: 'api',
    dependencies: ['api', 'httpClient'],
    permissions: ['optional HTTP(S) host access'],
    status: 'active',
    loader: () => import('@/tools/api/request-builder/Tool'),
  }),
]
