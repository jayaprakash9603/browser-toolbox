import type { WalkStep } from '@/app/demos/stage/types'

export const QUERY = 'pricing'

export const BOOKMARKS = [
  {
    id: 'b1',
    title: 'The pricing page teardown',
    path: 'Work › Docs',
    url: 'https://northwind.dev/blog/pricing-teardown',
  },
  {
    id: 'b2',
    title: 'Pricing – Northwind',
    path: 'Work › Sales',
    url: 'https://northwind.dev/pricing',
  },
  {
    id: 'b3',
    title: 'Q3 planning – Docs',
    path: 'Work › Docs',
    url: 'https://docs.northwind.dev/q3-planning',
  },
  {
    id: 'b4',
    title: 'Team retro notes',
    path: 'Personal',
    url: 'https://notes.northwind.dev/retro',
  },
  {
    id: 'b5',
    title: 'Invoice templates',
    path: 'Work › Finance',
    url: 'https://billing.northwind.dev/templates',
  },
] as const

export const MATCH_IDS = new Set(['b1', 'b2'])

export const MD_PREVIEW = [
  '- [The pricing page teardown](https://northwind.dev/blog/pricing-teardown)',
  '- [Pricing – Northwind](https://northwind.dev/pricing)',
] as const

export const STEPS: WalkStep[] = [
  {
    title: 'Search bookmarks',
    body: 'Type a keyword to slice through titles and URLs without opening the browser menu.',
  },
  {
    title: 'Scan paths and titles',
    body: 'Folder breadcrumbs stay visible so you know which workspace each link came from.',
  },
  {
    title: 'Export Markdown',
    body: 'Copy a clean bullet list for docs, wikis, or sharing with the team.',
  },
]

export const CAPTIONS = STEPS.map((step) => step.title)
