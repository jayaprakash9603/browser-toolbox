import { BookmarkIcon, DownloadIcon, SearchIcon } from 'lucide-react'

import { DemoStage, PanelChrome, type Build } from '@/app/demos/stage'

import { BOOKMARKS, CAPTIONS, MATCH_IDS, MD_PREVIEW, QUERY } from './script'

const ROW = 32
const gone = { height: 0, marginBottom: 0, opacity: 0 }
const STATS = [
  { label: 'Bookmarks', value: '48' },
  { label: 'Unread', value: '6' },
  { label: 'Dupes', value: '2' },
] as const
const NAV = ['All', 'Collections', 'Projects', 'Fav', 'Reading'] as const

const build: Build = ({ tl, q, step, final, move, click, type, wait, cursorOut }) => {
  const hide = BOOKMARKS.filter((b) => !MATCH_IDS.has(b.id)).map((b) => q(`row-${b.id}`))

  step(0)
  move('search', { ax: 0.25 })
  click('search')
  tl.to(q('search-ph'), { opacity: 0, duration: 0.1 }, '<')
  type('search-text', QUERY, { speed: 0.07 })
  tl.to(hide, { ...gone, duration: 0.35, stagger: 0.04, ease: 'power2.inOut' }, '<0.15')

  step(1, '+=0.45')
  move(`row-b1`, { ax: 0.4 })

  step(2, '+=0.35')
  move('export-md')
  click('export-md')
  tl.fromTo(q('md-preview'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '<')
  cursorOut('+=0.4')
  final()
  wait(1.2)

  tl.set(q('search-text'), { text: '' }, 0)
  tl.set(q('search-ph'), { opacity: 1 }, 0)
  tl.set(hide, { height: ROW, marginBottom: 4, opacity: 1 }, 0)
  tl.set(q('md-preview'), { opacity: 0 }, 0)
}

export default function Demo() {
  return (
    <DemoStage
      label={`Smart Bookmark Organizer: filter "${QUERY}", review matches, export Markdown links`}
      steps={CAPTIONS}
      build={build}
    >
      <PanelChrome title="Smart Bookmark Organizer" icon={BookmarkIcon} compact>
        <div className="flex h-full flex-col text-[10px]">
          <div className="relative mb-1.5">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted" aria-hidden />
            <span
              data-d="search"
              className="flex h-7 items-center rounded-md border border-line bg-canvas/80 pl-7 pr-2"
            >
              <span data-d="search-ph" className="text-muted">
                Search title, URL, tags…
              </span>
              <span data-d="search-text" className="text-ink" />
            </span>
          </div>
          <div className="mb-1.5 flex gap-1 overflow-hidden">
            {STATS.map((stat) => (
              <span
                key={stat.label}
                className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-line bg-canvas/70 px-1.5"
              >
                <span className="text-[8px] text-muted">{stat.label}</span>
                <span className="text-[9px] font-semibold tabular-nums text-ink">{stat.value}</span>
              </span>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {NAV.map((chip, index) => (
              <span
                key={chip}
                className={`rounded-full px-1.5 py-0.5 text-[8.5px] ${index === 0 ? 'bg-ink text-canvas' : 'text-muted'}`}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {BOOKMARKS.map((b) => (
              <div key={b.id} data-d={`row-${b.id}`} className="mb-1 overflow-hidden" style={{ height: ROW }}>
                <div className="flex h-[28px] flex-col justify-center rounded-lg border border-line bg-canvas/70 px-2">
                  <span className="truncate font-medium text-ink">{b.title}</span>
                  <span className="truncate text-[8px] text-muted">{b.path}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-d="export-md"
            className="mt-2 flex items-center justify-center gap-1 rounded-md border border-line py-1.5 text-[9px] text-ink-soft"
          >
            <DownloadIcon className="size-3" aria-hidden />
            Export Markdown
          </button>
          <pre
            data-d="md-preview"
            className="mt-2 overflow-hidden rounded-md border border-line bg-canvas/80 p-2 font-mono text-[8px] leading-relaxed text-ink-soft opacity-0"
          >
            {MD_PREVIEW.join('\n')}
          </pre>
        </div>
      </PanelChrome>
    </DemoStage>
  )
}
