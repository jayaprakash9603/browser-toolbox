import { newRuleId } from '@/core/interceptor'
import type { InterceptorRule } from '@/core/interceptor'

export interface InterceptorTemplate {
  id: string
  name: string
  description: string
  tags: string[]
  groupName?: string
  build: () => InterceptorRule[]
}

const now = () => Date.now()
const base = (type: InterceptorRule['type'], name: string, sourceValue: string) => ({
  id: newRuleId(),
  name,
  enabled: true,
  groupId: 'default',
  priority: 10,
  createdAt: now(),
  updatedAt: now(),
  type,
  source: { field: 'url' as const, operator: 'contains' as const, value: sourceValue },
})

export const INTERCEPTOR_TEMPLATES: InterceptorTemplate[] = [
  {
    id: 'redirect-js-local',
    name: 'Redirect JS from production to local',
    description: 'Point production script URLs to a local dev server.',
    tags: ['redirect', 'dev'],
    build: () => [
      {
        ...base('replace', 'JS prod → local', 'cdn.example.com'),
        type: 'replace',
        from: 'cdn\\.example\\.com',
        to: 'localhost:8080',
      },
    ],
  },
  {
    id: 'inject-customer-js',
    name: 'Inject JS into customer site',
    description: 'Run a script on matching customer pages.',
    tags: ['script'],
    build: () => [
      {
        ...base('insertScript', 'Inject helper script', 'customer.example.com'),
        type: 'insertScript',
        kind: 'js',
        timing: 'document_idle',
        scriptSource: 'inline',
        code: "console.log('Toolbox interceptor script');",
      },
    ],
  },
  {
    id: 'bypass-cors',
    name: 'Bypass CORS',
    description: 'Add permissive CORS response headers.',
    tags: ['headers', 'cors'],
    build: () => [
      {
        ...base('headers', 'Bypass CORS', '*'),
        type: 'headers',
        response: [
          { name: 'Access-Control-Allow-Origin', operation: 'set', value: '*' },
          { name: 'Access-Control-Allow-Methods', operation: 'set', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { name: 'Access-Control-Allow-Headers', operation: 'set', value: '*' },
          { name: 'Access-Control-Allow-Credentials', operation: 'set', value: 'true' },
        ],
      },
    ],
  },
  {
    id: 'auth-localhost',
    name: 'Add Authorization header to localhost',
    description: 'Attach a bearer token for local API calls.',
    tags: ['headers', 'auth'],
    build: () => [
      {
        ...base('headers', 'Localhost Authorization', 'localhost'),
        type: 'headers',
        request: [{ name: 'Authorization', operation: 'set', value: 'Bearer YOUR_TOKEN' }],
      },
    ],
  },
  {
    id: 'override-api',
    name: 'Override response of an API',
    description: 'Return static JSON for a matching API path.',
    tags: ['mock'],
    build: () => [
      {
        ...base('mockApi', 'Override API response', '/api/'),
        type: 'mockApi',
        status: 200,
        bodySource: 'static',
        body: '{"ok":true,"source":"interceptor"}',
        contentType: 'application/json',
      },
    ],
  },
  {
    id: 'remove-csp',
    name: 'Remove Content-Security-Policy header',
    description: 'Strip CSP from responses for debugging.',
    tags: ['headers'],
    build: () => [
      {
        ...base('headers', 'Remove CSP', '*'),
        type: 'headers',
        response: [{ name: 'Content-Security-Policy', operation: 'remove' }],
      },
    ],
  },
  {
    id: 'simulate-404',
    name: 'Simulate 404 status code',
    description: 'Force a 404 response status on matched requests.',
    tags: ['status'],
    build: () => [
      {
        ...base('statusCode', 'Simulate 404', '/missing'),
        type: 'statusCode',
        status: 404,
      },
    ],
  },
  {
    id: 'mock-geo',
    name: 'Mock geolocation header',
    description: 'Set a custom geolocation hint header.',
    tags: ['headers'],
    build: () => [
      {
        ...base('headers', 'Mock geo header', '*'),
        type: 'headers',
        request: [{ name: 'X-Geo-Country', operation: 'set', value: 'US' }],
      },
    ],
  },
  {
    id: 'google-ddg',
    name: 'Redirect Google search to DuckDuckGo',
    description: 'Rewrite Google search URLs to DuckDuckGo.',
    tags: ['redirect'],
    build: () => [
      {
        ...base('redirect', 'Google → DuckDuckGo', 'google.com/search'),
        type: 'redirect',
        destination: 'https://duckduckgo.com/?q=$1',
      },
    ],
  },
  {
    id: 'google-bing',
    name: 'Redirect Google search to Bing',
    description: 'Rewrite Google search URLs to Bing.',
    tags: ['redirect'],
    build: () => [
      {
        ...base('redirect', 'Google → Bing', 'google.com/search'),
        type: 'redirect',
        destination: 'https://www.bing.com/search?q=$1',
      },
    ],
  },
  {
    id: 'ga-debug',
    name: 'Load Google Analytics in debug mode',
    description: 'Redirect GA collect + inject debug flag script.',
    tags: ['redirect', 'script'],
    groupName: 'GA debug',
    build: () => [
      {
        ...base('redirect', 'GA debug redirect', 'google-analytics.com'),
        type: 'redirect',
        destination: 'https://www.google-analytics.com/debug/collect',
      },
      {
        ...base('insertScript', 'GA debug flag', 'google-analytics.com'),
        type: 'insertScript',
        kind: 'js',
        timing: 'document_start',
        scriptSource: 'inline',
        code: 'window.ga_debug = { trace: true };',
      },
    ],
  },
  {
    id: 'highlight-ads',
    name: 'Highlight Google ads',
    description: 'Inject CSS to outline ad containers.',
    tags: ['script'],
    build: () => [
      {
        ...base('insertScript', 'Highlight ads', 'google.'),
        type: 'insertScript',
        kind: 'css',
        timing: 'document_idle',
        scriptSource: 'inline',
        code: '[data-text-ad], .ads-ad { outline: 2px solid red !important; }',
      },
    ],
  },
  {
    id: 'quora-anon',
    name: 'Browse Quora anonymously',
    description: 'Strip tracking query params on Quora.',
    tags: ['query'],
    build: () => [
      {
        ...base('queryParam', 'Quora anon', 'quora.com'),
        type: 'queryParam',
        remove: ['share', 'ch', 'utm_source', 'utm_medium'],
      },
    ],
  },
  {
    id: 'remove-utm',
    name: 'Remove UTM params',
    description: 'Remove common UTM tracking query parameters.',
    tags: ['query'],
    build: () => [
      {
        ...base('queryParam', 'Remove UTM', '*'),
        type: 'queryParam',
        remove: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'],
      },
    ],
  },
  {
    id: 'staging-api',
    name: 'Switch API host to staging',
    description: 'Replace production API host with staging.',
    tags: ['replace'],
    build: () => [
      {
        ...base('replace', 'API → staging', 'api.example.com'),
        type: 'replace',
        from: 'api\\.example\\.com',
        to: 'staging-api.example.com',
      },
    ],
  },
  {
    id: 'mock-json',
    name: 'Mock JSON API',
    description: 'Return a simple JSON payload for API paths.',
    tags: ['mock'],
    build: () => [
      {
        ...base('mockApi', 'Mock JSON API', '/api/'),
        type: 'mockApi',
        status: 200,
        bodySource: 'static',
        body: '{"data":[]}',
        contentType: 'application/json',
      },
    ],
  },
  {
    id: 'delay-api',
    name: 'Delay API calls',
    description: 'Add latency to XHR/fetch API requests.',
    tags: ['delay'],
    build: () => [
      {
        ...base('delay', 'Delay API', '/api/'),
        type: 'delay',
        delayMs: 3000,
      },
    ],
  },
  {
    id: 'block-trackers',
    name: 'Block analytics trackers',
    description: 'Cancel requests to common tracker hosts.',
    tags: ['cancel'],
    build: () => [
      {
        ...base('cancel', 'Block trackers', 'doubleclick'),
        type: 'cancel',
      },
    ],
  },
  {
    id: 'mobile-ua',
    name: 'Change User-Agent to mobile',
    description: 'Spoof a mobile Chrome user agent.',
    tags: ['user-agent'],
    build: () => [
      {
        ...base('userAgent', 'Mobile UA', '*'),
        type: 'userAgent',
        preset: 'chromeAndroid',
      },
    ],
  },
  {
    id: 'mock-graphql',
    name: 'Mock GraphQL operation',
    description: 'Return a static GraphQL response for a named operation.',
    tags: ['graphql'],
    build: () => [
      {
        ...base('mockGraphql', 'Mock GraphQL', '/graphql'),
        type: 'mockGraphql',
        operationName: 'GetUser',
        status: 200,
        bodySource: 'static',
        body: '{"data":{"user":{"id":"1","name":"Test"}}}',
      },
    ],
  },
]
