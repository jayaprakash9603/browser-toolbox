import type { WalkStep } from '@/app/demos/stage/types'

export const WINDOW_TABS = [
  { id: 1, title: 'Inbox – Northwind Mail', color: '#2563eb' },
  { id: 2, title: 'Q3 planning – Docs', color: '#0ea5e9', active: true },
  { id: 3, title: 'Invoice #1042', color: '#16a34a' },
] as const

export const SESSION_NAME = 'Q3 research'

export const SESSION_TABS = [
  'mail.northwind.dev/inbox',
  'docs.northwind.dev/q3-planning',
  'docs.northwind.dev/q3-planning#budget',
  'billing.northwind.dev/invoices/1042',
  'northwind.dev/pricing',
] as const

export const STEPS: WalkStep[] = [
  {
    title: 'Save this window',
    body: 'Capture every tab in the current window before you close the laptop or switch projects.',
  },
  {
    title: 'Name the session',
    body: 'Give it a label you will recognize later — notes are optional but handy for context.',
  },
  {
    title: 'Restore on demand',
    body: 'Bring all five tabs back in one click when you pick the research thread back up.',
  },
]

export const CAPTIONS = STEPS.map((step) => step.title)
