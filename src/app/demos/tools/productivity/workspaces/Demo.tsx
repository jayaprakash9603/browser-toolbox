import { LayersIcon, PlayIcon, PlusIcon } from 'lucide-react'

import { BrowserChrome, DemoStage, DockHeader, type Build } from '@/app/demos/stage'

import { CAPTIONS, SESSION_NAME, SESSION_TABS, WINDOW_TABS } from './script'

const PANEL = 248
const build: Build = ({ tl, q, qa, step, final, move, click, type, wait, cursorOut }) => {
  const grow = (name: string, at?: string) =>
    tl.fromTo(
      q(name),
      { height: 0, opacity: 0 },
      { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out', immediateRender: false },
      at,
    )

  step(0)
  move('save-window')
  click('save-window')
  tl.fromTo(q('dialog'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, '<')

  step(1, '+=0.35')
  move('name-field', { ax: 0.2 })
  click('name-field')
  tl.set(q('name-field'), { text: '' })
  type('name-field', SESSION_NAME, { speed: 0.045 })
  move('confirm-save', { at: '+=0.15' })
  click('confirm-save')
  tl.to(q('dialog'), { opacity: 0, y: -6, duration: 0.2 }, '<')
  grow('session-q3', '<0.05')

  step(2, '+=0.45')
  move('restore-q3')
  click('restore-q3')
  tl.to(qa('strip-extra'), { maxWidth: 72, opacity: 1, paddingLeft: 8, paddingRight: 8, duration: 0.35, stagger: 0.06, ease: 'power2.out' }, '<0.1')
  tl.set(q('strip-count'), { text: String(SESSION_TABS.length) }, '<')
  cursorOut('+=0.4')
  final()
  wait(1.2)

  tl.set(q('dialog'), { opacity: 0 }, 0)
  tl.set(q('session-q3'), { height: 0, opacity: 0 }, 0)
  tl.set(qa('strip-extra'), { maxWidth: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 }, 0)
  tl.set(q('strip-count'), { text: String(WINDOW_TABS.length) }, 0)
  tl.set(q('name-field'), { text: 'Window Mar 12' }, 0)
}

export default function Demo() {
  return (
    <DemoStage
      label={`Tab Sessions: save the Northwind window, name "${SESSION_NAME}", restore ${SESSION_TABS.length} tabs`}
      steps={CAPTIONS}
      build={build}
    >
      <BrowserChrome
        url="https://docs.northwind.dev/q3-planning"
        panelWidth={PANEL}
        tab="Q3 planning"
        panel={
          <div className="relative flex h-full flex-col text-[10px]">
            <DockHeader icon={LayersIcon} title="Tab Sessions" />
            <div className="px-2 pt-2">
              <button
                type="button"
                data-d="save-window"
                className="flex w-full items-center justify-center gap-1 rounded-md border border-line bg-canvas/80 py-1.5 text-[9px] font-medium text-ink"
              >
                <PlusIcon className="size-3" aria-hidden />
                Save this window
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pt-2">
              <div data-d="session-q3" className="overflow-hidden opacity-0" style={{ height: 0 }}>
                <div className="rounded-lg border border-line bg-canvas/70 p-2">
                  <p className="font-medium text-ink">{SESSION_NAME}</p>
                  <p className="mt-0.5 text-[8px] text-muted">{SESSION_TABS.length} tabs · just now</p>
                  <button
                    type="button"
                    data-d="restore-q3"
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-[var(--accent)] py-1 text-[8.5px] font-medium text-canvas"
                  >
                    <PlayIcon className="size-2.5" aria-hidden />
                    Restore
                  </button>
                </div>
              </div>
            </div>
            <div
              data-d="dialog"
              className="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg border border-line-strong bg-elevated p-2 opacity-0 shadow-xl"
            >
              <p className="text-[8px] font-semibold uppercase tracking-wide text-muted">New session</p>
              <span
                data-d="name-field"
                className="mt-1 flex h-6 items-center rounded border border-line px-2 text-[9px] text-ink"
              >
                Window Mar 12
              </span>
              <span
                data-d="confirm-save"
                className="mt-1.5 block rounded bg-[var(--accent)] py-1 text-center text-[8.5px] font-medium text-canvas"
              >
                Save
              </span>
            </div>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex items-end gap-0.5 border-b border-[#e2e8f0] bg-[#f1f5f9] px-2 pt-1">
            {WINDOW_TABS.map((tab) => (
              <span
                key={tab.id}
                className={`max-w-[88px] truncate rounded-t px-2 py-0.5 text-[8px] ${'active' in tab && tab.active ? 'bg-white text-[#0f172a]' : 'text-[#64748b]'}`}
              >
                <span className="mr-1 inline-block size-1.5 rounded-full" style={{ background: tab.color }} />
                {tab.title.split(' – ')[0]}
              </span>
            ))}
            {SESSION_TABS.slice(WINDOW_TABS.length).map((label) => (
              <span
                key={label}
                data-d="strip-extra"
                className="max-w-[72px] truncate rounded-t bg-white/80 px-2 py-0.5 text-[8px] text-[#64748b]"
                style={{ maxWidth: 0, opacity: 0, overflow: 'hidden', padding: 0 }}
              >
                {label.split('/')[0]}
              </span>
            ))}
            <span data-d="strip-count" className="ml-auto self-center pr-1 text-[7px] text-[#94a3b8]">
              {WINDOW_TABS.length}
            </span>
          </div>
          <div className="flex-1 bg-white px-4 pt-3 text-[#0f172a]">
            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#0ea5e9]">Northwind Docs</p>
            <h3 className="mt-1 text-[14px] font-bold leading-tight">Q3 planning</h3>
            <div className="mt-3 space-y-1.5">
              {[92, 78, 85, 70, 88].map((w, i) => (
                <span key={i} className="block h-1.5 rounded-full bg-black/[0.06]" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      </BrowserChrome>
    </DemoStage>
  )
}
