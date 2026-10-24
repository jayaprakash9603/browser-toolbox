import type { ThemeMode } from '@/features/settings/settingsService'
import { DEFAULT_PALETTE, type PaletteId } from '@/shared/lib/theme/palettes'
import {
  TOOLBOX_PALETTE_BRANDS,
  TOOLBOX_SURFACES,
  type ColorScheme,
} from '@/shared/lib/theme/toolboxColors'

export interface OverlayColors {
  card: string
  foreground: string
  muted: string
  border: string
  accent: string
}

export interface OverlayTheme {
  mode: ThemeMode
  light: OverlayColors
  dark: OverlayColors
}

function overlayColors(scheme: ColorScheme, palette: PaletteId): OverlayColors {
  const surface = TOOLBOX_SURFACES[scheme]
  return {
    card: surface.card,
    foreground: surface.cardForeground,
    muted: surface.mutedForeground,
    border: surface.border,
    accent: TOOLBOX_PALETTE_BRANDS[palette][scheme].primary,
  }
}

/** The toolbox appearance (theme and palette) as plain values the injected card can use. */
export function timerOverlayTheme(
  mode: ThemeMode = 'system',
  palette: PaletteId = DEFAULT_PALETTE,
): OverlayTheme {
  return { mode, light: overlayColors('light', palette), dark: overlayColors('dark', palette) }
}

/**
 * Injected into the active page. Must stay self-contained for chrome.scripting.executeScript:
 * only its arguments cross over, nothing it references from this module.
 */
export function showTimerCompleteOverlay(
  title: string,
  message: string,
  theme: OverlayTheme = {
    mode: 'system',
    light: {
      card: '#ffffff',
      foreground: '#111827',
      muted: '#64748b',
      border: '#e2e8f0',
      accent: '#4f46e5',
    },
    dark: {
      card: '#1c2022',
      foreground: '#f8fafc',
      muted: '#a1a1aa',
      border: '#2a3133',
      accent: '#818cf8',
    },
  },
): void {
  const id = 'tbx-timer-complete'
  document.getElementById(id)?.remove()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const vars = (colors: OverlayColors) =>
    [
      `--tbx-card:${colors.card}`,
      `--tbx-fg:${colors.foreground}`,
      `--tbx-muted:${colors.muted}`,
      `--tbx-border:${colors.border}`,
      `--tbx-accent:${colors.accent}`,
    ].join(';')
  const light = vars(theme.light)
  const dark = vars(theme.dark)
  const schemeCss =
    theme.mode === 'system'
      ? `:host{${light};color-scheme:light}@media (prefers-color-scheme: dark){:host{${dark};color-scheme:dark}}`
      : `:host{${theme.mode === 'dark' ? dark : light};color-scheme:${theme.mode}}`

  const host = document.createElement('div')
  host.id = id
  host.setAttribute('role', 'alert')
  host.setAttribute('aria-live', 'assertive')
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;inset:0 0 auto auto'
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
${schemeCss}
.wrap{position:fixed;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));
  width:min(360px,calc(100vw - 32px));font:14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  -webkit-font-smoothing:antialiased}
@media (max-width:480px){.wrap{left:16px;right:16px;width:auto}}
.card{position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;
  padding:14px 12px 14px 14px;border-radius:14px;overflow:hidden;
  background:var(--tbx-card);color:var(--tbx-fg);border:1px solid var(--tbx-border);
  box-shadow:0 1px 2px rgb(0 0 0/.06),0 12px 32px -8px rgb(0 0 0/.28)}
.card::before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:var(--tbx-accent)}
.icon{position:relative;display:grid;place-items:center;width:40px;height:40px;border-radius:10px;
  color:var(--tbx-accent);background:color-mix(in srgb,var(--tbx-accent) 14%,transparent)}
.icon svg{width:20px;height:20px}
.icon::after{content:'';position:absolute;inset:0;border-radius:inherit;
  box-shadow:0 0 0 0 color-mix(in srgb,var(--tbx-accent) 45%,transparent)}
.meta{display:flex;align-items:center;gap:6px;margin:0;font-size:12px;color:var(--tbx-muted)}
.meta .dot{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.7}
.title{margin:2px 0 0;font-size:15px;font-weight:600;line-height:1.35;color:var(--tbx-fg)}
.body{margin:2px 0 0;color:var(--tbx-muted);overflow-wrap:anywhere}
.close{display:grid;place-items:center;width:36px;height:36px;margin:-6px -4px 0 0;padding:0;border:0;
  border-radius:9px;background:transparent;color:var(--tbx-muted);cursor:pointer;
  transition:background-color .15s,color .15s}
.close:hover{background:color-mix(in srgb,var(--tbx-fg) 8%,transparent);color:var(--tbx-fg)}
.close:focus-visible{outline:2px solid var(--tbx-accent);outline-offset:2px}
.close svg{width:16px;height:16px}
@media (prefers-reduced-motion:no-preference){
  .wrap{animation:tbx-in .28s cubic-bezier(.2,.9,.3,1.2) both}
  .wrap.leaving{animation:tbx-out .18s ease-in both}
  .icon::after{animation:tbx-ping 1.4s ease-out 2}
}
@keyframes tbx-in{from{opacity:0;transform:translateX(24px) scale(.98)}to{opacity:1;transform:none}}
@keyframes tbx-out{to{opacity:0;transform:translateX(24px)}}
@keyframes tbx-ping{to{box-shadow:0 0 0 10px transparent}}
`

  const svg = (paths: string[]) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    element.setAttribute('viewBox', '0 0 24 24')
    element.setAttribute('fill', 'none')
    element.setAttribute('stroke', 'currentColor')
    element.setAttribute('stroke-width', '2')
    element.setAttribute('stroke-linecap', 'round')
    element.setAttribute('stroke-linejoin', 'round')
    element.setAttribute('aria-hidden', 'true')
    for (const d of paths) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      element.append(path)
    }
    return element
  }
  const el = (tag: string, className: string, text?: string) => {
    const element = document.createElement(tag)
    element.className = className
    if (text !== undefined) element.textContent = text
    return element
  }

  const wrap = el('div', 'wrap')
  const card = el('div', 'card')
  const icon = el('div', 'icon')
  icon.append(
    svg(['M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 9v4l2 2', 'M5 3 2 6', 'm22 6-3-3']),
  )

  const content = el('div', 'content')
  const meta = el('p', 'meta')
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  meta.append(el('span', '', 'Browser Toolbox · Timer'), el('span', 'dot'), el('span', '', time))
  content.append(meta, el('p', 'title', title), el('p', 'body', message))

  const close = el('button', 'close') as HTMLButtonElement
  close.type = 'button'
  close.setAttribute('aria-label', 'Dismiss')
  close.title = 'Dismiss'
  close.append(svg(['M18 6 6 18', 'm6 6 12 12']))

  card.append(icon, content, close)
  wrap.append(card)
  shadow.append(style, wrap)
  document.documentElement.append(host)

  const dismiss = () => {
    document.removeEventListener('keydown', onKey)
    if (reduced) {
      host.remove()
      return
    }
    wrap.classList.add('leaving')
    window.setTimeout(() => host.remove(), 180)
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dismiss()
  }
  close.addEventListener('click', dismiss)
  document.addEventListener('keydown', onKey)

  if (!reduced) {
    try {
      const context = new AudioContext()
      const tone = (frequency: number, at: number, duration: number) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.frequency.value = frequency
        oscillator.connect(gain)
        gain.connect(context.destination)
        gain.gain.setValueAtTime(0.0001, context.currentTime + at)
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + duration)
        oscillator.start(context.currentTime + at)
        oscillator.stop(context.currentTime + at + duration)
      }
      tone(880, 0, 0.16)
      tone(660, 0.18, 0.22)
      window.setTimeout(() => void context.close(), 800)
    } catch {
      /* autoplay or audio can be blocked */
    }
  }
}
