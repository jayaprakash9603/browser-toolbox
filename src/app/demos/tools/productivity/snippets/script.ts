import type { WalkStep } from '@/app/demos/stage/types'

export const COMPOSE_URL = 'https://mail.northwind.dev/compose'

export const SNIPPETS = [
  {
    id: 'followup',
    title: 'Follow-up after the pricing teardown',
    category: 'Email',
    body: 'Hi Dana — thanks for the call. Here is the recap and next steps from the pricing review.',
    pinned: true,
  },
  {
    id: 'reset',
    title: 'Password reset reply',
    category: 'Support',
    body: 'We sent a reset link that expires in 15 minutes. Let us know if you need a new one.',
    pinned: false,
  },
  {
    id: 'curl',
    title: 'cURL health check',
    category: 'Code',
    body: 'curl -sS https://api.northwind.dev/health | jq .status',
    pinned: false,
  },
] as const

export const FEATURE = SNIPPETS[0]

export const STEPS: WalkStep[] = [
  {
    title: 'Filter by category',
    body: 'Jump to Email, Support or Code so the list stays short when you have dozens of snippets.',
  },
  {
    title: 'Copy in one click',
    body: 'Tap a snippet to put the full text on your clipboard — pins keep favorites at the top.',
  },
  {
    title: 'Paste where you work',
    body: 'Drop the snippet straight into a compose field or ticket without retyping.',
  },
]

export const CAPTIONS = STEPS.map((step) => step.title)
