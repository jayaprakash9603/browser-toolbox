import type { Fact, WalkStep } from '@/app/demos/stage/types'

export const PAGE = 'https://northwind.design/assets/catalog'

export const STATS = {
  total: 24,
  active: 1,
  completed: 21,
  failed: 2,
  data: '1.8 GB',
  speed: '4.2 MB/s',
}

export const DOWNLOADS = [
  {
    id: 'row-0',
    name: 'brand-guide.pdf',
    ext: 'pdf',
    host: 'northwind.design',
    status: 'Downloading',
    pct: 62,
    size: '12.4 MB',
    tone: 'sky',
  },
  {
    id: 'row-1',
    name: 'product-sheet-q4.xlsx',
    ext: 'xlsx',
    host: 'cdn.northwind.design',
    status: 'Complete',
    pct: 100,
    size: '890 KB',
    tone: 'emerald',
  },
]

export const QUEUE = [
  { title: 'hero-video.mp4', state: 'Next' },
  { title: 'press-kit.zip', state: 'Queued' },
  { title: 'logo-pack.svg', state: 'Queued' },
]

export const RESOURCES = [
  { id: 'res-0', label: 'brand-guide.pdf', ext: 'PDF', selected: true },
  { id: 'res-1', label: 'texture-amber.webp', ext: 'WEBP', selected: true },
  { id: 'res-2', label: 'analytics.js', ext: 'JS', selected: false },
]

export const IMAGES = [
  { id: 'img-0', from: '#4ade80', to: '#14532d', w: 1200, h: 800 },
  { id: 'img-1', from: '#fdba74', to: '#7c2d12', w: 1080, h: 1350 },
  { id: 'img-2', from: '#94a3b8', to: '#1e293b', w: 1600, h: 900 },
  { id: 'img-3', from: '#c4b5fd', to: '#4c1d95', w: 2048, h: 1365 },
]

export const MEDIA = [
  { id: 'media-0', label: 'hero-loop.mp4', kind: 'Video', size: '18.2 MB' },
  { id: 'media-1', label: 'podcast-intro.mp3', kind: 'Audio', size: '4.1 MB' },
]

export const HISTORY = [
  { name: 'invoice-march.pdf', when: '2h ago' },
  { name: 'release-notes.md', when: 'Yesterday' },
]

export const TABS = [
  'downloads',
  'queue',
  'bulk',
  'sniffer',
  'images',
  'media',
  'history',
  'settings',
] as const

export type DemoTab = (typeof TABS)[number]

export const STEPS: WalkStep[] = [
  {
    title: 'Live downloads dashboard',
    body: 'Stats stay visible on every tab. Pause, resume, cancel, and filter Chrome downloads from one list.',
  },
  {
    title: 'Queue and concurrency',
    body: 'Stack URLs with priority and delays. The scheduler respects your max concurrent slots.',
  },
  {
    title: 'Scan the open page',
    body: 'Bulk, Sniffer, Images, and Media reuse one page scan — files, links, images, and streams in separate views.',
  },
  {
    title: 'Pick images from the page',
    body: 'Filter by size, search URLs, skip duplicates, and enqueue many images without leaving the panel.',
  },
  {
    title: 'Media and history',
    body: 'Surface video and audio URLs, then export finished downloads as CSV from History.',
  },
  {
    title: 'Organize and notify',
    body: 'Auto-folder rules, completion notifications, and sniffer thresholds live in Settings.',
  },
]

export const CAPTIONS = STEPS.map((step) => step.title)

export const FACTS: Fact[] = [
  { value: '8', label: 'Views: downloads, queue, bulk, sniffer, images, media, history, settings' },
  { value: 'Native', label: 'Chrome Downloads API — pause, resume, show in folder, erase history' },
  { value: 'Scan', label: 'Content script discovers links, assets, images, and media on the active tab' },
  { value: 'Queue', label: 'Sequential and concurrent slots with retry and duplicate skipping' },
]
