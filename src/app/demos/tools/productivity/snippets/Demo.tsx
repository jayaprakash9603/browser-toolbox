import { BracesIcon, CopyIcon, PinIcon, SearchIcon } from 'lucide-react'

import { BrowserChrome, DemoStage, DockHeader, type Build } from '@/app/demos/stage'

import { CAPTIONS, COMPOSE_URL, FEATURE, SNIPPETS } from './script'

const PANEL = 248
const ROW = 34
const CATS = ['All', 'Email', 'Support', 'Code'] as const

const build: Build = ({ tl, q, qa, step, final, move, click, fly, wait, cursorOut }) => {
  step(0)
  move('cat-Email')
  click('cat-Email')
  tl.to(qa('cat'), { backgroundColor: 'rgba(255,255,255,0)', color: 'var(--demo-muted)', duration: 0.15 }, '<')
  tl.to(q('cat-Email'), { backgroundColor: 'var(--demo-tint-10)', color: 'var(--demo-ink)', duration: 0.15 }, '<')
  tl.to(qa('hide-on-email'), { height: 0, opacity: 0, marginBottom: 0, duration: 0.35, stagger: 0.05 }, '<0.15')

  step(1, '+=0.45')
  move('copy-feature')
  click('copy-feature')

  step(2, '+=0.4')
  fly('ghost-body', 'feature-body', 'compose-field', { duration: 0.75, lift: 48 })
  tl.set(q('compose-text'), { text: `${FEATURE.body.slice(0, 72)}…` })
  tl.fromTo(q('compose-text'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, '-=0.25')
  tl.to(q('ghost-body'), { opacity: 0, duration: 0.15 }, '<0.1')
  tl.fromTo(q('toast'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 }, '+=0.05')
  cursorOut('+=0.35')
  final()
  wait(1.2)

  tl.set(q('toast'), { opacity: 0 }, 0)
  tl.set(q('compose-text'), { text: '', opacity: 0 }, 0)
  tl.set(q('ghost-body'), { opacity: 0 }, 0)
  tl.set(qa('hide-on-email'), { height: ROW, opacity: 1, marginBottom: 4 }, 0)
  tl.set(qa('cat'), { backgroundColor: 'rgba(255,255,255,0)', color: 'var(--demo-muted)' }, 0)
  tl.set(q('cat-All'), { backgroundColor: 'var(--demo-tint-10)', color: 'var(--demo-ink)' }, 0)
}

export default function Demo() {
  return (
    <DemoStage
      label={`Snippets: filter Email, copy "${FEATURE.title}", paste into Northwind mail compose`}
      steps={CAPTIONS}
      build={build}
    >
      <BrowserChrome
        url={COMPOSE_URL}
        panelWidth={PANEL}
        tab="Compose"
        panel={
          <div className="relative flex h-full flex-col text-[10px]">
            <DockHeader icon={BracesIcon} title="Snippets" />
            <div className="px-2 pt-2">
              <div className="flex h-6 items-center gap-1 rounded-md border border-line bg-canvas/80 px-2 text-muted">
                <SearchIcon className="size-2.5" aria-hidden />
                <span>Search snippets</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-0.5">
                {CATS.map((cat) => (
                  <span
                    key={cat}
                    data-d={`cat cat-${cat}`}
                    className={`rounded px-1.5 py-0.5 text-[8.5px] ${cat === 'All' ? 'bg-ink/10 text-ink' : 'text-muted'}`}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pt-1.5">
              {SNIPPETS.map((s) => (
                <div
                  key={s.id}
                  data-d={s.id === 'followup' ? 'row-feature' : `hide-on-email row-${s.id}`}
                  className="mb-1 overflow-hidden"
                  style={{ height: ROW }}
                >
                  <div
                    data-d={s.id === 'followup' ? 'feature-body' : undefined}
                    className="flex h-[30px] flex-col justify-center rounded-lg border border-line bg-canvas/70 px-2"
                  >
                    <div className="flex items-center gap-1">
                      {s.pinned ? <PinIcon className="size-2.5 shrink-0 text-[var(--accent)]" aria-hidden /> : null}
                      <span className="truncate font-medium text-ink">{s.title}</span>
                      <span className="ml-auto shrink-0 text-[8px] text-muted">{s.category}</span>
                    </div>
                  </div>
                  {s.id === 'followup' ? (
                    <button
                      type="button"
                      data-d="copy-feature"
                      className="mt-0.5 flex w-full items-center justify-center gap-1 rounded border border-line py-0.5 text-[8.5px] text-ink-soft"
                    >
                      <CopyIcon className="size-2.5" aria-hidden />
                      Copy
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <span
              data-d="toast"
              className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-medium text-canvas opacity-0"
            >
              Copied
            </span>
          </div>
        }
      >
        <div className="h-full bg-[#f8fafc] px-4 pt-3 text-[#0f172a]">
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">New message</p>
          <p className="mt-1 text-[9px] text-[#64748b]">To: dana@northwind.dev</p>
          <p className="mt-2 text-[9px] font-medium">Subject: Pricing follow-up</p>
          <div
            data-d="compose-field"
            className="mt-2 min-h-[72px] rounded-md border border-[#e2e8f0] bg-white px-2 py-1.5 text-[9px] leading-relaxed text-[#334155]"
          >
            <span data-d="compose-text" />
          </div>
        </div>
      </BrowserChrome>
      <span
        data-d="ghost-body"
        className="absolute left-0 top-0 z-30 max-w-[140px] rounded-lg border border-line bg-elevated px-2 py-1 text-[9px] text-ink opacity-0 shadow-lg"
      >
        {FEATURE.body.slice(0, 48)}…
      </span>
    </DemoStage>
  )
}
