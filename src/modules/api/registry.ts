import { NetworkIcon, RadarIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const apiTools = [
  defineTool({
    id: 'api.http-interceptor',
    name: 'HTTP Interceptor',
    description:
      'Intercept and modify HTTP(S) traffic, discover API endpoints from live capture, and replay requests in a compact explorer.',
    category: 'api',
    icon: RadarIcon,
    keywords: [
      'requestly',
      'interceptor',
      'mock',
      'redirect',
      'headers',
      'network',
      'graphql',
      'xhr',
      'fetch',
    ],
    aliases: ['http interceptor', 'requestly', 'mock api', 'modify headers', 'network log'],
    route: '/tools/api/http-interceptor',
    capabilities: ['SIDE_PANEL', 'DEVTOOLS', 'PAGE_ACCESS'],
    toolkitGroup: 'api',
    status: 'active',
    searchEntries: [
      {
        id: 'interceptor-rules',
        labelKey: 'interceptor.tab.rules',
        fallbackLabel: 'Rules',
        keywords: ['redirect', 'mock', 'headers'],
        params: { tab: 'rules' },
      },
      {
        id: 'interceptor-network',
        labelKey: 'interceptor.tab.network',
        fallbackLabel: 'Network',
        keywords: ['log', 'har', 'requests'],
        params: { tab: 'network' },
      },
      {
        id: 'interceptor-finder',
        labelKey: 'interceptor.tab.finder',
        fallbackLabel: 'API Finder',
        keywords: ['endpoint', 'discover', 'graphql'],
        params: { tab: 'finder' },
      },
      {
        id: 'interceptor-explorer',
        labelKey: 'interceptor.tab.explorer',
        fallbackLabel: 'API Explorer',
        keywords: ['replay', 'send', 'postman'],
        params: { tab: 'explorer' },
      },
      {
        id: 'interceptor-collections',
        labelKey: 'interceptor.tab.collections',
        fallbackLabel: 'Collections',
        keywords: ['saved', 'history'],
        params: { tab: 'collections' },
      },
      {
        id: 'interceptor-library',
        labelKey: 'interceptor.tab.library',
        fallbackLabel: 'Library',
        params: { tab: 'library' },
      },
      {
        id: 'interceptor-settings',
        labelKey: 'interceptor.tab.settings',
        fallbackLabel: 'Settings',
        params: { tab: 'settings' },
      },
    ],
    loader: () => import('@/tools/api/http-interceptor/Tool'),
  }),
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
