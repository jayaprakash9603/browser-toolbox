import { BookmarkPlusIcon, CheckIcon, DownloadIcon, GlobeIcon } from 'lucide-react'

import { BrowserChrome, DemoStage, DockHeader, type Build } from '@/app/demos/stage'

import { CAPTIONS, ITEMS, PAGE, SAVE_NOTE } from './script'

const PANEL = 260
const ROW = 36

const INITIAL = ITEMS.filter((i) => i.id !== 'r2')

const build: Build = ({ tl, q, qa, step, final, move, click, type, wait, cursorOut }) => {
  const viewFilter = (index: number) => {
    tl.to(qa('filter'), { backgroundColor: 'rgba(255,255,255,0)', color: 'var(--demo-muted)', duration: 0.15 }, '<')
    tl.to(q(`filter-${index}`), { backgroundColor: 'var(--demo-tint-10)', color: 'var(--demo-ink)', duration: 0.15 }, '<')
  }

  step(0)
  tl.fromTo(
    q('capture'),
    { opacity: 0, y: -8 },
    { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', immediateRender: false },
  )
  move('note-field', { at: '+=0.2', ax: 0.2 })
  click('note-field')
  type('note-field', SAVE_NOTE, { speed: 0.04 })
  move('save-page', { at: '+=0.1' })
  click('save-page')
  tl.fromTo(q('row-saved'), { height: 0, opacity: 0 }, { height: ROW, opacity: 1, duration: 0.35, ease: 'power2.out' }, '<0.1')
  tl.to(q('capture'), { opacity: 0, y: -8, duration: 0.25 }, '+=0.3')

  step(1, '+=0.35')
  move('filter-1')
  click('filter-1')
  viewFilter(1)
  tl.to(q('row-r1'), { height: 0, opacity: 0, marginBottom: 0, duration: 0.3 }, '<0.1')

  step(2, '+=0.4')
  move('mark-saved')
  click('mark-saved')
  tl.to(q('mark-saved'), { backgroundColor: '#34d399', borderColor: '#34d399', duration: 0.15 }, '<')
  tl.to(q('tick-saved'), { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(3)' }, '<')
  tl.to(q('row-saved'), { opacity: 0.55, duration: 0.25 }, '<0.05')
  tl.fromTo(q('export-chip'), { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.25 }, '+=0.15')
  cursorOut('+=0.35')
  final()
  wait(1.2)

  tl.set(q('capture'), { opacity: 0 }, 0)
  tl.set(q('row-saved'), { height: 0, opacity: 0 }, 0)
  tl.set(q('row-r1'), { height: ROW, opacity: 1, marginBottom: 4 }, 0)
  tl.set(q('note-field'), { text: '' }, 0)
  tl.set(q('mark-saved'), { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#60a5fa' }, 0)
  tl.set(q('tick-saved'), { opacity: 0, scale: 0.5 }, 0)
  tl.set(q('export-chip'), { opacity: 0 }, 0)
  tl.set(qa('filter'), { backgroundColor: 'rgba(255,255,255,0)', color: 'var(--demo-muted)' }, 0)
  tl.set(q('filter-0'), { backgroundColor: 'var(--demo-tint-10)', color: 'var(--demo-ink)' }, 0)
}

function Page() {
  return (
    <div className="h-full bg-[#fafafa] px-4 pt-3 text-[#111]">
      <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#2563eb]">Northwind Blog</p>
      <h3 className="mt-1 text-[15px] font-bold leading-tight tracking-tight">{PAGE.title}</h3>
      <p className="mt-1 text-[8px] text-[#64748b]">12 min read</p>
      <div className="mt-3 space-y-1.5">
        {[94, 88, 97, 72, 90, 84, 60, 92].map((width, index) => (
          <span key={index} className="block h-1.5 rounded-full bg-black/[0.08]" style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function Demo() {
  return (
    <DemoStage
      label={`Reading List: save "${PAGE.title}" with a note, filter Unread, mark read and export`}
      steps={CAPTIONS}
      build={build}
    >
      <BrowserChrome
        url={PAGE.url}
        panelWidth={PANEL}
        panel={
          <div className="relative flex h-full flex-col text-[10px]">
            <DockHeader icon={BookmarkPlusIcon} title="Reading List" />
            <div className="grid grid-cols-3 gap-0.5 px-2 pt-2">
              {['All', 'Unread', 'Read'].map((label, index) => (
                <span
                  key={label}
                  data-d={`filter filter-${index}`}
                  className={`rounded py-1 text-center text-[8.5px] ${index === 0 ? 'bg-ink/10 text-ink' : 'text-muted'}`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pt-1.5">
              {INITIAL.map((item) => (
                <div key={item.id} data-d={`row-${item.id}`} className="mb-1 overflow-hidden" style={{ height: ROW }}>
                  <div className="flex h-[32px] items-center gap-1.5 rounded-lg border border-line bg-canvas/70 px-2">
                    <span className="min-w-0 flex-1 truncate text-[9px] text-ink">{item.title}</span>
                    {item.read ? (
                      <CheckIcon className="size-3 shrink-0 text-[#34d399]" aria-hidden />
                    ) : (
                      <span className="size-2 shrink-0 rounded-full bg-[var(--accent)]" />
                    )}
                  </div>
                </div>
              ))}
              <div data-d="row-saved" className="mb-1 overflow-hidden opacity-0" style={{ height: 0 }}>
                <div className="flex h-[32px] items-center gap-1.5 rounded-lg border border-line bg-canvas/70 px-2">
                  <span
                    data-d="mark-saved"
                    className="relative flex size-3 shrink-0 items-center justify-center rounded-full border border-[#60a5fa] bg-[rgba(59,130,246,0.1)]"
                  >
                    <CheckIcon
                      data-d="tick-saved"
                      className="size-2 text-canvas opacity-0"
                      style={{ transform: 'scale(0.5)' }}
                      strokeWidth={3.5}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[9px] text-ink">{PAGE.title}</span>
                </div>
              </div>
            </div>
            <span
              data-d="export-chip"
              className="mx-2 mb-2 flex items-center justify-center gap-1 rounded-md border border-line py-1 text-[8.5px] text-ink-soft opacity-0"
            >
              <DownloadIcon className="size-2.5" aria-hidden />
              Export Markdown
            </span>
            <div
              data-d="capture"
              className="absolute inset-x-2 top-10 rounded-lg border border-line-strong bg-elevated p-2 opacity-0 shadow-2xl"
            >
              <p className="text-[7.5px] font-medium uppercase tracking-[0.14em] text-muted">Current page</p>
              <p className="mt-1 flex items-center gap-1.5 text-[9.5px] text-ink">
                <GlobeIcon className="size-3 shrink-0 text-muted" />
                <span className="truncate">{PAGE.title}</span>
              </p>
              <span
                data-d="note-field"
                className="mt-1.5 flex min-h-[22px] items-start rounded border border-line px-1.5 py-0.5 text-[8.5px] text-ink-soft"
              />
              <span
                data-d="save-page"
                className="mt-1.5 block rounded bg-[var(--accent)] py-1 text-center text-[8px] font-medium text-canvas"
              >
                Save to reading list
              </span>
            </div>
          </div>
        }
      >
        <Page />
      </BrowserChrome>
    </DemoStage>
  )
}
