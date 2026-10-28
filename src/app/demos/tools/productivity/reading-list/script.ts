import type { WalkStep } from '@/app/demos/stage/types'

export const PAGE = {
  title: 'The pricing page teardown',
  host: 'northwind.dev',
  url: 'https://northwind.dev/blog/pricing-teardown',
} as const

export const SAVE_NOTE = 'Compare tiers before Q3 deck'

export const ITEMS = [
  {
    id: 'r1',
    title: 'Northwind API changelog',
    url: 'https://northwind.dev/changelog',
    read: true,
  },
  {
    id: 'r2',
    title: PAGE.title,
    url: PAGE.url,
    read: false,
    note: SAVE_NOTE,
  },
  {
    id: 'r3',
    title: 'Focus mode tips',
    url: 'https://northwind.dev/blog/focus',
    read: false,
  },
] as const

export const STEPS: WalkStep[] = [
  {
    title: 'Save the open page',
    body: 'Capture the article you are reading with an optional note for later context.',
  },
  {
    title: 'Filter unread',
    body: 'Hide finished articles so the queue stays short and actionable.',
  },
  {
    title: 'Mark read and export',
    body: 'Clear items as you finish them and export the list when you need a shareable snapshot.',
  },
]

export const CAPTIONS = STEPS.map((step) => step.title)
