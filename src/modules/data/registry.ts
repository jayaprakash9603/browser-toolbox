import { ArrowLeftRightIcon, TableIcon } from 'lucide-react'

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
  defineTool({
    id: 'data.data-scraper',
    name: 'Data Scraper',
    description:
      'Extract tables and lists from any site with heuristics, point-and-click selectors, pagination, and CSV/Excel export.',
    category: 'data',
    icon: TableIcon,
    keywords: [
      'scrape',
      'scraper',
      'instant data scraper',
      'web scraper',
      'table',
      'csv',
      'excel',
      'xlsx',
      'pagination',
      'crawl',
    ],
    aliases: ['instant data scraper', 'data miner', 'table to csv', 'export to excel'],
    route: '/tools/data/data-scraper',
    capabilities: ['SIDE_PANEL', 'PAGE_ACCESS', 'CONTENT_SCRIPT'],
    toolkitGroup: 'data',
    status: 'active',
    searchEntries: [
      { id: 'auto', labelKey: 'dataScraper.autoDetect', fallbackLabel: 'Auto-detect grid', params: {} },
      { id: 'export', labelKey: 'dataScraper.title', fallbackLabel: 'Export dataset', params: {} },
    ],
    loader: () => import('@/tools/data/data-scraper/Tool'),
  }),
]
