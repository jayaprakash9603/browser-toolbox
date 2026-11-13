import {
  DownloadIcon,
  HistoryIcon,
  ImageIcon,
  LayersIcon,
  ListOrderedIcon,
  PauseIcon,
  ScanSearchIcon,
  SearchIcon,
  SettingsIcon,
  VideoIcon,
} from 'lucide-react'
import { DemoStage, PanelChrome, type Build } from '@/app/demos/stage'
import { cn } from '@/shared/utils/cn'

import {
  CAPTIONS,
  DOWNLOADS,
  HISTORY,
  IMAGES,
  MEDIA,
  PAGE,
  QUEUE,
  RESOURCES,
  STATS,
  type DemoTab,
} from './script'

const TAB_META: { key: DemoTab; label: string; icon: typeof DownloadIcon }[] = [
  { key: 'downloads', label: 'Downloads', icon: DownloadIcon },
  { key: 'queue', label: 'Queue', icon: ListOrderedIcon },
  { key: 'bulk', label: 'Bulk', icon: LayersIcon },
  { key: 'sniffer', label: 'Sniffer', icon: ScanSearchIcon },
  { key: 'images', label: 'Images', icon: ImageIcon },
  { key: 'media', label: 'Media', icon: VideoIcon },
  { key: 'history', label: 'History', icon: HistoryIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
]

const PANELS: DemoTab[] = ['downloads', 'queue', 'sniffer', 'images', 'media', 'history', 'settings']

const build: Build = ({ tl, q, qa, step, final, move, click, wait, cursorOut }) => {
  const setTab = (tab: DemoTab, at = '<') => {
    TAB_META.forEach(({ key }) => {
      const on = key === tab
      tl.to(
        q(`tab-${key}`),
        {
          color: on ? 'var(--accent)' : 'var(--demo-muted)',
          borderColor: on ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'transparent',
          duration: 0.22,
        },
        at,
      )
    })
    PANELS.forEach((key) => {
      tl.to(q(`pane-${key}`), { opacity: key === tab ? 1 : 0, duration: 0.22, ease: 'power2.out' }, at)
    })
    if (tab === 'bulk') {
      tl.to(q('pane-sniffer'), { opacity: 1, duration: 0.22 }, at)
      tl.to(q('bulk-badge'), { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, at)
    } else {
      tl.to(q('bulk-badge'), { opacity: 0, scale: 0.8, duration: 0.15 }, at)
    }
  }

  step(0)
  setTab('downloads', '+=0.2')
  tl.to(q('prog-0'), { width: '62%', duration: 1.1, ease: 'power2.out' }, 0.5)
  tl.to(q('speed-live'), { opacity: 1, duration: 0.2 }, '<0.4')
  move('pause-0', { at: '+=0.15' })
  click('pause-0')
  tl.to(q('status-0'), { text: 'Paused', color: '#f59e0b', duration: 0.2 }, '<')
  tl.to(q('prog-0'), { opacity: 0.55, duration: 0.2 }, '<')

  step(1, '+=0.25')
  move('tab-queue')
  click('tab-queue')
  setTab('queue')
  tl.fromTo(
    qa('queue-row'),
    { opacity: 0, x: -8 },
    { opacity: 1, x: 0, duration: 0.28, stagger: 0.08, ease: 'power3.out', immediateRender: false },
    '<0.1',
  )

  step(2, '+=0.3')
  move('tab-sniffer')
  click('tab-sniffer')
  setTab('sniffer')
  tl.fromTo(
    q('scan-pulse'),
    { scale: 0.92, opacity: 0.4 },
    { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', immediateRender: false },
    '<',
  )
  RESOURCES.filter((r) => r.selected).forEach((row, i) => {
    move(row.id, { at: i === 0 ? '+=0.1' : '>' })
    click(row.id)
    tl.to(q(`check-${row.id}`), { opacity: 1, duration: 0.15 }, '<')
  })
  move('enqueue', { at: '+=0.1' })
  click('enqueue')
  tl.fromTo(q('queued-toast'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, '<')

  step(3, '+=0.35')
  move('tab-bulk')
  click('tab-bulk')
  setTab('bulk', '<')
  move('tab-images', { at: '+=0.2' })
  click('tab-images')
  setTab('images')
  tl.fromTo(
    qa('img-cell'),
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.25, stagger: 0.05, ease: 'back.out(2)', immediateRender: false },
    '<0.05',
  )

  step(4, '+=0.3')
  move('tab-media')
  click('tab-media')
  setTab('media')
  tl.fromTo(
    qa('media-row'),
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 0.28, stagger: 0.1, immediateRender: false },
    '<',
  )
  move('tab-history', { at: '+=0.25' })
  click('tab-history')
  setTab('history')
  move('export-csv', { at: '+=0.1' })
  click('export-csv')
  tl.fromTo(q('csv-chip'), { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.25, immediateRender: false }, '<')

  step(5, '+=0.3')
  move('tab-settings')
  click('tab-settings')
  setTab('settings')
  move('toggle-organize', { at: '+=0.1' })
  click('toggle-organize')
  tl.to(q('knob-organize'), { x: 12, duration: 0.2, ease: 'power2.out' }, '<')
  tl.to(q('fill-organize'), { opacity: 1, duration: 0.2 }, '<')
  move('toggle-notify', { at: '+=0.1' })
  click('toggle-notify')
  tl.to(q('knob-notify'), { x: 12, duration: 0.2, ease: 'power2.out' }, '<')
  tl.to(q('fill-notify'), { opacity: 1, duration: 0.2 }, '<')
  cursorOut('+=0.3')
  final()
  wait(1.2)

  tl.set(q('csv-chip'), { opacity: 0 }, 0)
  tl.set(q('queued-toast'), { opacity: 0 }, 0)
  tl.set(q('bulk-badge'), { opacity: 0, scale: 0.8 }, 0)
  tl.set(q('speed-live'), { opacity: 0 }, 0)
  tl.set([q('prog-0'), ...qa('res-check')], { clearProps: 'all' }, 0)
}

function SearchBar() {
  return (
    <div className="flex h-6 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2 text-[8px] text-muted">
      <SearchIcon className="size-2.5 shrink-0" />
      Search downloads
    </div>
  )
}

function TabBar() {
  return (
    <div className="flex gap-0.5 overflow-hidden rounded-lg border border-line bg-canvas/60 p-0.5">
      {TAB_META.map(({ key, label, icon: Icon }) => (
        <span
          key={key}
          data-d={`tab tab-${key}`}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md border border-transparent px-0.5 py-1 text-[7px] font-medium text-muted"
          style={{ color: key === 'downloads' ? 'var(--accent)' : undefined }}
        >
          <Icon className="size-2.5 shrink-0" strokeWidth={2} />
          <span className="truncate">{label}</span>
        </span>
      ))}
    </div>
  )
}

function DownloadsPane() {
  return (
    <div data-d="pane-downloads" className="absolute inset-0 flex flex-col gap-1.5 opacity-100">
      {DOWNLOADS.map((row, index) => (
        <div
          key={row.id}
          data-d={row.id}
          className="rounded-lg border border-line bg-elevated p-1.5 shadow-xs"
        >
          <div className="flex items-start justify-between gap-1">
            <FileTitle name={row.name} ext={row.ext} />
            <span
              data-d={`status-${index}`}
              className={cn(
                'rounded px-1 py-0.5 text-[7px] font-medium',
                row.tone === 'sky' && 'bg-sky-500/15 text-sky-700',
                row.tone === 'emerald' && 'bg-emerald-500/15 text-emerald-700',
              )}
            >
              {row.status}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[7px] text-muted">{row.host}</p>
          {index === 0 ? (
            <div className="mt-1 flex items-center gap-1">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
                <span data-d="prog-0" className="block h-full w-[18%] rounded-full bg-sky-500" />
              </span>
              <span data-d="speed-live" className="text-[7px] tabular-nums text-sky-600 opacity-0">
                {STATS.speed}
              </span>
              <span
                data-d="pause-0"
                className="flex size-4 items-center justify-center rounded border border-line bg-canvas"
              >
                <PauseIcon className="size-2.5 text-ink-soft" />
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[7px] text-muted">{row.size}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function FileTitle({ name, ext }: { name: string; ext: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[8.5px] font-medium text-ink">{name}</span>
      <span className="text-[7px] uppercase text-muted">{ext}</span>
    </span>
  )
}

function QueuePane() {
  return (
    <div data-d="pane-queue" className="absolute inset-0 flex flex-col gap-1.5 opacity-0">
      <p className="text-[8px] font-medium text-ink">Download queue</p>
      {QUEUE.map((item) => (
        <div
          key={item.title}
          data-d="queue-row"
          className="rounded-lg border border-line bg-elevated px-2 py-1.5 text-[8px]"
        >
          <span className="font-medium text-ink">{item.title}</span>
          <span className="ml-1 text-muted">· {item.state}</span>
        </div>
      ))}
    </div>
  )
}

function SnifferPane() {
  return (
    <div data-d="pane-sniffer" className="absolute inset-0 flex flex-col gap-1 opacity-0">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[7.5px] text-muted">{PAGE}</p>
        <span className="relative shrink-0 rounded border border-line px-1 py-0.5 text-[7px]">Rescan</span>
        <span
          data-d="bulk-badge"
          className="absolute right-12 top-6 rounded bg-ink px-1 text-[7px] font-semibold text-canvas opacity-0"
        >
          Bulk · downloadable only
        </span>
      </div>
      <span
        data-d="scan-pulse"
        className="pointer-events-none absolute left-1/2 top-8 size-16 -translate-x-1/2 rounded-full bg-sky-400/20"
      />
      {RESOURCES.map((row) => (
        <div
          key={row.id}
          data-d={row.id}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-elevated px-1.5 py-1"
        >
          <span
            data-d={`check-${row.id} res-check`}
            className={cn(
              'flex size-2.5 items-center justify-center rounded-sm border border-line',
              row.selected ? 'bg-ink opacity-0' : 'bg-canvas',
            )}
          />
          <span className="min-w-0 flex-1 truncate text-[8px] text-ink">{row.label}</span>
          <span className="text-[7px] text-muted">{row.ext}</span>
        </div>
      ))}
      <span data-d="enqueue" className="mt-auto inline-flex h-6 items-center justify-center rounded-lg bg-[var(--accent)] text-[8px] font-medium text-canvas">
        Download selected
      </span>
      <span
        data-d="queued-toast"
        className="absolute bottom-2 left-2 right-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-center text-[7.5px] text-emerald-800 opacity-0"
      >
        2 files added to queue
      </span>
    </div>
  )
}

function ImagesPane() {
  return (
    <div data-d="pane-images" className="absolute inset-0 opacity-0">
      <div className="grid grid-cols-4 gap-1">
        {IMAGES.map((img) => (
          <span
            key={img.id}
            data-d={`img-cell ${img.id}`}
            className="relative aspect-square overflow-hidden rounded-md border border-line"
            style={{ background: `linear-gradient(135deg, ${img.from}, ${img.to})` }}
          >
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/50 px-0.5 text-[6px] text-white">
              {img.w}×{img.h}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function MediaPane() {
  return (
    <div data-d="pane-media" className="absolute inset-0 flex flex-col gap-1 opacity-0">
      {MEDIA.map((row) => (
        <div key={row.id} data-d="media-row" className="rounded-lg border border-line bg-elevated px-2 py-1.5">
          <p className="text-[8px] font-medium text-ink">{row.label}</p>
          <p className="text-[7px] text-muted">
            {row.kind} · {row.size}
          </p>
        </div>
      ))}
    </div>
  )
}

function HistoryPane() {
  return (
    <div data-d="pane-history" className="absolute inset-0 flex flex-col gap-1.5 opacity-0">
      <span data-d="export-csv" className="inline-flex h-6 w-fit items-center rounded-lg border border-line px-2 text-[8px]">
        Export CSV
      </span>
      {HISTORY.map((row) => (
        <div key={row.name} className="rounded-lg border border-line bg-elevated px-2 py-1.5 text-[8px]">
          <span className="font-medium text-ink">{row.name}</span>
          <span className="ml-1 text-muted">{row.when}</span>
        </div>
      ))}
      <span
        data-d="csv-chip"
        className="mt-auto self-center rounded-full border border-line bg-canvas px-2 py-0.5 text-[7px] opacity-0"
      >
        download-history.csv
      </span>
    </div>
  )
}

function SettingsPane() {
  return (
    <div data-d="pane-settings" className="absolute inset-0 space-y-2 opacity-0">
      <SettingToggle d="organize" label="Organize extension downloads" />
      <SettingToggle d="notify" label="Notify when complete" on />
      <p className="text-[7px] leading-relaxed text-muted">Max concurrent: 3 · scheduler runs while Chrome is open</p>
    </div>
  )
}

function SettingToggle({ d, label, on }: { d: string; label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[8px]">
      <span>{label}</span>
      <span data-d={`toggle-${d}`} className="relative block h-3.5 w-7 rounded-full border border-line bg-canvas">
        <span data-d={`fill-${d}`} className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-0" />
        <span
          data-d={`knob-${d}`}
          className="absolute top-0.5 left-0.5 size-2.5 rounded-full bg-white shadow"
          style={{ transform: on ? 'translateX(12px)' : undefined }}
        />
      </span>
    </div>
  )
}

export default function Demo() {
  return (
    <DemoStage
      label="Download Manager — dashboard, queue, page scan, images, media, history, and settings"
      steps={CAPTIONS}
      build={build}
      width={540}
      height={408}
    >
      <PanelChrome title="Download Manager" compact>
        <div className="flex h-full flex-col gap-2">
          <SearchBar />
          <TabBar />
          <div className="relative min-h-0 flex-1">
            <DownloadsPane />
            <QueuePane />
            <SnifferPane />
            <ImagesPane />
            <MediaPane />
            <HistoryPane />
            <SettingsPane />
          </div>
        </div>
      </PanelChrome>
    </DemoStage>
  )
}
