import { ArrowLeftRightIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const dataTools = [
  defineTool({
    id: 'data.universal-converter',
    name: 'Universal Converter',
    description: 'Convert between JSON, CSV, XML, YAML, Markdown tables and TSV.',
    category: 'data',
    icon: ArrowLeftRightIcon,
    keywords: ['convert', 'json', 'csv', 'xml', 'yaml', 'markdown', 'tsv', 'format'],
    aliases: [
      'json to csv',
      'csv to json',
      'json to yaml',
      'xml to json',
      'data converter',
      'format converter',
    ],
    route: '/tools/data/universal-converter',
    capabilities: ['SIDE_PANEL', 'CONTEXT_MENU'],
    contextSurfaces: ['SELECTION'],
    toolkitGroup: 'data',
    dependencies: ['json', 'csv', 'xml', 'yaml'],
    status: 'active',
    loader: () => import('@/tools/data/universal-converter/Tool'),
  }),
]
