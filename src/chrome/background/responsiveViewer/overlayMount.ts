import type { SimulatorOverlayConfig, SimulatorOverlayUiSettings, SimulatorOverlayUiTheme } from './overlayTypes'

/** Injected in the page only — bundled to public/inject/simulator-overlay.js. */
export function mountSimulatorOverlay(config: SimulatorOverlayConfig): boolean {
  const HOST_ID = 'tbx-simulator-overlay'
  if (window !== window.top) return false

  document.getElementById('tbx-simulator-veil')?.remove()
  delete document.documentElement.dataset.tbxSimVeil

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
  const iconClose =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  const iconRotate =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>'
  const iconRefresh =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>'
  const iconExpand =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
  const iconSignal =
    '<svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="3" width="2" height="7" rx="0.5"/><rect x="12" y="1" width="2" height="9" rx="0.5" opacity="0.45"/></svg>'
  const iconWifi =
    '<svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.4 4.2a7 7 0 0 1 10.2 0"/><path d="M3.2 6a4.4 4.4 0 0 1 6.6 0"/><circle cx="6.5" cy="8.4" r="0.9" fill="currentColor" stroke="none"/></svg>'
  const iconBattery =
    '<svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.6" y="1.2" width="18" height="7.6" rx="1.6" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="2.6" width="13" height="4.8" rx="0.6" fill="currentColor"/><rect x="19.2" y="3.2" width="1.8" height="3.6" rx="0.6" fill="currentColor"/></svg>'
  const iconBack =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>'
  const iconForward =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
  const iconShare =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>'
  const iconBook =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  const iconTabs =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>'
  const iconPhone =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'
  const iconCamera =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
  const iconVideo =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>'
  const iconSettings =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'
  const kindIcons: Record<string, string> = {
    all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    favorites: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.3 6.2 21l1.6-6.6L2 9.3l6.8-.5L12 2l3.2 6.8 6.8.5-5.8 5.1 1.6 6.6z"/></svg>',
    recents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phone: iconPhone.replace('width="16" height="16"', ''),
    tablet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="12" rx="1"/><path d="M2 19h20"/></svg>',
    desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="1"/><path d="M8 22h8M12 18v4"/></svg>',
    watch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2h6M9 22h6"/></svg>',
    special: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>',
  }

  type Host = HTMLElement & {
    __tbxSimDispose?: () => void
    __tbxSimApply?: (next: SimulatorOverlayConfig) => void
  }
  const existing = document.getElementById(HOST_ID) as Host | null
  if (existing) {
    if (config.replace && existing.__tbxSimApply) {
      existing.__tbxSimApply(config)
      return true
    }
    existing.__tbxSimDispose?.()
    existing.remove()
    if (!config.replace) return true
  }

  const host = document.createElement('div') as Host
  host.id = HOST_ID
  host.setAttribute('data-tbx-simulator', 'overlay')
  host.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;'

  const shadow = host.attachShadow({ mode: 'open' })
  const previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'

  const state = {
    rotated: false,
    live: config,
    ui: config.ui,
    panel: '' as '' | 'devices' | 'settings' | 'shot-menu' | 'record-menu' | 'capture-result',
    lastCaptureUrl: '',
    lastCaptureName: '',
    previewReload: 0,
  }

  const style = document.createElement('style')
  style.textContent = `
    :host {
      all: initial;
      display: block;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      outline: none;
    }
    * { box-sizing: border-box; }
    button { font: inherit; }
    .root {
      pointer-events: auto;
      position: fixed;
      inset: 0;
      border: 0;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #eceff3;
      color: #1e293b;
      --tbx-accent: #0d9488;
      --tbx-accent-hover: #0f766e;
      --tbx-accent-pressed: #115e59;
      --tbx-panel-bg: #fff;
      --tbx-panel-border: #dde3ea;
      --tbx-panel-muted: #64748b;
      --tbx-row-hover: #f1f5f9;
      --tbx-input-bg: #f8fafc;
      --tbx-input-border: #cbd5e1;
      --tbx-hint: #64748b;
      --tbx-menu-bg: #f8fafc;
      --tbx-menu-border: #cbd5e1;
    }
    .root.theme-dark {
      background: #0b0f14;
      color: #e2e8f0;
      --tbx-panel-bg: #151b24;
      --tbx-panel-border: #2a3544;
      --tbx-panel-muted: #94a3b8;
      --tbx-row-hover: #1e2733;
      --tbx-input-bg: #0f141c;
      --tbx-input-border: #334155;
      --tbx-hint: #cbd5e1;
      --tbx-menu-bg: #1e2733;
      --tbx-menu-border: #3d4f63;
    }
    .root.theme-dark .panel { box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
    .stage {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 20px;
      max-width: 100%;
      max-height: 100%;
      padding: 12px 92px 12px 20px;
    }
    .phone-wrap { position: relative; }
    .mockup-img {
      pointer-events: none;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 6;
      filter: drop-shadow(0 28px 64px rgba(15,23,42,0.18));
    }
    .has-mockup.landscape .mockup-img {
      inset: auto;
      left: 50%;
      top: 50%;
      width: var(--tbx-mockup-h);
      height: var(--tbx-mockup-w);
      transform: translate(-50%, -50%) rotate(90deg);
    }
    .chassis {
      position: relative;
      padding: 10px;
      border-radius: 55px;
      background: var(--tbx-fill);
      box-shadow: 0 1px 0 var(--tbx-ring), 0 28px 64px rgba(15,23,42,0.18), 0 2px 10px rgba(15,23,42,0.1);
    }
    .has-mockup .chassis {
      position: absolute;
      inset: 0;
      padding: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .has-mockup .side { display: none; }
    .has-mockup .screen {
      position: absolute;
      border-radius: 11%;
    }
    .side {
      position: absolute;
      width: 3px;
      border-radius: 1px;
      background: var(--tbx-button);
    }
    .screen {
      position: relative;
      overflow: hidden;
      background: #fff;
      border-radius: 40px;
      box-shadow: inset 0 0 0 1px rgba(15,23,42,0.06);
    }
    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    .status {
      pointer-events: none;
      position: absolute;
      inset: 0 0 auto 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 34px;
      padding: 0 22px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      mix-blend-mode: difference;
    }
    .status-icons { display: flex; align-items: center; gap: 6px; }
    .island, .notch, .punch, .pill, .home, .android-nav { pointer-events: none; position: absolute; z-index: 4; background: #0a0a0a; }
    .island {
      top: 12px; left: 50%; transform: translateX(-50%);
      width: 32%; max-width: 126px; height: 4.35%; min-height: 12px; border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }
    .notch {
      top: 0; left: 50%; transform: translateX(-50%);
      width: 34%; height: 20px; border-radius: 0 0 16px 16px;
    }
    .punch {
      top: 10px; left: 50%; transform: translateX(-50%);
      width: 9px; height: 9px; border-radius: 999px;
    }
    .pill {
      top: 8px; left: 50%; transform: translateX(-50%);
      width: 22%; height: 6px; border-radius: 999px;
    }
    .home {
      bottom: 7px; left: 50%; transform: translateX(-50%);
      width: 34%; max-width: 134px; height: 5px; border-radius: 999px; background: rgba(255,255,255,0.92);
    }
    .safari:not([hidden]) ~ .home {
      background: #3a3a3c;
    }
    .android-nav {
      inset: auto 0 0 0; height: 28px; background: transparent;
      display: flex; align-items: center; justify-content: space-evenly;
      color: rgba(255,255,255,0.8); mix-blend-mode: difference;
    }
    .safari {
      pointer-events: none;
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 3;
      padding: 6px 12px 18px;
      background: linear-gradient(180deg, rgba(247,247,248,0.92) 0%, #f4f4f5 40%, #f4f4f5 100%);
      color: #111827;
    }
    .url-pill {
      display: flex; align-items: center; gap: 8px;
      height: 36px; padding: 0 10px; border-radius: 12px; background: #fff;
      box-shadow: 0 0 0 1px rgba(15,23,42,0.06);
      font-size: 12px;
    }
    .url-pill .host { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; color: #374151; }
    .safari-tools {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 4px; padding: 4px 10px 0; color: #0b84ff;
    }
    .safari-tools svg { width: 22px; height: 22px; }
    .actions {
      position: absolute;
      right: 14px; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; align-items: center;
      padding: 10px 8px;
      border-radius: 24px;
      background: rgba(255,255,255,0.9);
      border: 0;
      box-shadow: 0 10px 32px rgba(15,23,42,0.14);
      backdrop-filter: blur(14px);
      z-index: 9;
      max-height: min(92vh, 620px);
      overflow: hidden;
      width: 60px;
    }
    .actions-primary {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .actions-scroll {
      flex: 1;
      min-height: 0;
      width: 100%;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(15,23,42,0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .root.theme-dark .actions-scroll { border-top-color: #2a3544; }
    .root.theme-dark .actions {
      background: rgba(21,27,36,0.92);
      box-shadow: 0 10px 36px rgba(0,0,0,0.45);
    }
    .round {
      display: flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; border-radius: 999px;
      border: 0; background: var(--tbx-accent); color: #fff;
      box-shadow: 0 2px 10px rgba(13,148,136,0.35);
      cursor: pointer;
      text-decoration: none;
    }
    .round:hover { background: var(--tbx-accent-hover); }
    .round:focus-visible { outline: 2px solid #5eead4; outline-offset: 2px; }
    .round[aria-pressed="true"] { background: var(--tbx-accent-pressed); box-shadow: inset 0 0 0 2px #99f6e4; }
    .round[data-act="close"] { background: #64748b; box-shadow: 0 2px 8px rgba(71,85,105,0.35); }
    .round[data-act="close"]:hover { background: #475569; }
    .panel {
      display: none; flex-direction: column; gap: 10px;
      position: absolute; z-index: 8;
      background: var(--tbx-panel-bg);
      color: inherit;
    }
    .panel.open { display: flex; z-index: 11; }
    .panel[data-panel="devices"] {
      right: 76px;
      width: min(380px, 50vw);
      max-height: min(78vh, 640px);
      padding: 0;
      border-radius: 14px;
      border: 1px solid var(--tbx-panel-border);
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
      min-height: 0;
      overflow: hidden;
      flex-direction: row;
    }
    .panel[data-panel="devices"].open { display: flex; }
    .panel[data-panel="devices"]::after {
      content: '';
      position: absolute;
      right: -6px;
      top: var(--tbx-device-arrow-y, 50%);
      width: 10px;
      height: 10px;
      transform: translateY(-50%) rotate(45deg);
      background: var(--tbx-panel-bg);
      border-right: 1px solid var(--tbx-panel-border);
      border-top: 1px solid var(--tbx-panel-border);
    }
    .device-panel-head {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--tbx-panel-border);
    }
    .device-sidebar {
      flex-shrink: 0;
      width: 76px;
      padding: 10px 6px;
      border-right: 1px solid var(--tbx-panel-border);
      background: var(--tbx-input-bg);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kind-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
      padding: 8px 4px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      color: inherit;
      font-size: 9px;
      font-weight: 600;
      line-height: 1.15;
      cursor: pointer;
      text-align: center;
    }
    .kind-tab:hover { background: var(--tbx-row-hover); }
    .kind-tab[aria-pressed="true"] {
      background: var(--tbx-accent);
      border-color: var(--tbx-accent);
      color: #fff;
      box-shadow: 0 2px 8px rgba(13,148,136,0.35);
    }
    .kind-tab svg { width: 18px; height: 18px; flex-shrink: 0; }
    .kind-tab .kind-count { font-size: 8px; font-weight: 700; opacity: 0.85; tabular-nums; }
    .device-main {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .panel[data-panel="devices"] .panel-list {
      flex: 1;
      min-height: 120px;
      max-height: min(52vh, 480px);
      padding: 6px 10px 12px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .device-section {
      margin: 12px 4px 6px;
      padding-bottom: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--tbx-panel-muted);
      border-bottom: 1px solid var(--tbx-panel-border);
    }
    .device-section:first-child { margin-top: 4px; }
    .device-thumb {
      flex-shrink: 0;
      border: 2px solid #94a3b8;
      border-radius: 6px;
      background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6);
    }
    .root.theme-dark .device-thumb {
      border-color: #475569;
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    }
    .device-thumb[data-kind="phone"] { width: 22px; height: 36px; border-radius: 7px; }
    .device-thumb[data-kind="tablet"] { width: 30px; height: 36px; border-radius: 6px; }
    .device-thumb[data-kind="laptop"] { width: 34px; height: 24px; border-radius: 4px 4px 2px 2px; }
    .device-thumb[data-kind="desktop"] { width: 34px; height: 26px; border-radius: 4px; }
    .device-thumb[data-kind="watch"] { width: 22px; height: 26px; border-radius: 8px; }
    .device-thumb[data-kind="special"] { width: 28px; height: 28px; border-radius: 6px; }
    .device-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .device-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .device-meta { font-size: 10px; color: var(--tbx-panel-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .device-row { gap: 10px; padding: 8px 10px; }
    .device-row[aria-current="true"]::after {
      content: '✓';
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--tbx-accent);
    }
    .panel[data-panel="settings"] {
      right: 76px;
      width: min(292px, 42vw);
      min-height: 220px;
      max-height: min(72vh, 520px);
      padding: 14px;
      border-radius: 14px;
      border: 1px solid var(--tbx-panel-border);
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
      gap: 12px;
      transform: none;
      overflow-y: auto;
    }
    .panel[data-panel="settings"].open:not([style*="top"]) {
      top: 50%;
      transform: translateY(-50%);
    }
    .panel[data-panel="settings"]::after {
      content: '';
      position: absolute;
      right: -6px;
      top: var(--tbx-settings-arrow-y, 50%);
      z-index: 1;
      width: 10px;
      height: 10px;
      transform: translateY(-50%) rotate(45deg);
      background: var(--tbx-panel-bg);
      border-right: 1px solid var(--tbx-panel-border);
      border-top: 1px solid var(--tbx-panel-border);
    }
    .panel[data-panel="shot-menu"],
    .panel[data-panel="record-menu"],
    .panel[data-panel="capture-result"] {
      right: 76px;
      width: min(292px, 42vw);
      max-height: min(72vh, 520px);
      padding: 14px;
      border-radius: 14px;
      border: 1px solid var(--tbx-panel-border);
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
      transform: none;
      gap: 10px;
    }
    .panel[data-panel="shot-menu"]::after,
    .panel[data-panel="record-menu"]::after,
    .panel[data-panel="capture-result"]::after {
      content: '';
      position: absolute;
      right: -6px;
      top: var(--tbx-rail-arrow-y, 50%);
      width: 10px;
      height: 10px;
      transform: translateY(-50%) rotate(45deg);
      background: var(--tbx-panel-bg);
      border-right: 1px solid var(--tbx-panel-border);
      border-top: 1px solid var(--tbx-panel-border);
    }
    .panel[data-panel="capture-result"] {
      width: min(340px, 44vw);
    }
    .panel[data-panel="capture-result"] img {
      width: 100%; max-height: 46vh; object-fit: contain;
      border-radius: 10px; background: #f1f5f9; border: 1px solid #e2e8f0;
    }
    .root.theme-dark .panel[data-panel="capture-result"] img {
      background: #0f141c;
      border-color: #334155;
    }
    .menu-options { display: flex; flex-direction: column; gap: 8px; }
    .menu-option {
      display: flex; align-items: center; justify-content: flex-start; gap: 10px;
      width: 100%; min-height: 44px; padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid var(--tbx-menu-border);
      background: var(--tbx-menu-bg);
      color: inherit; font-size: 13px; font-weight: 600;
      cursor: pointer; text-align: left;
    }
    .menu-option:hover {
      border-color: var(--tbx-accent);
      background: var(--tbx-row-hover);
    }
    .root.theme-dark .menu-option {
      color: #f8fafc;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
    }
    .root.theme-dark .menu-option:hover {
      border-color: #5eead4;
      background: #243041;
    }
    .capture-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .capture-actions .menu-option { flex: 1 1 auto; justify-content: center; }
    .capture-hint { margin: 0; font-size: 12px; color: var(--tbx-hint); line-height: 1.45; }
    .panel[data-panel="shot-menu"] h2,
    .panel[data-panel="record-menu"] h2,
    .panel[data-panel="capture-result"] h2 {
      color: inherit;
    }
    .panel h2 { margin: 0; font-size: 13px; font-weight: 700; }
    .panel-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }
    .panel-head svg { flex-shrink: 0; opacity: 0.9; }
    .setting-list { display: flex; flex-direction: column; gap: 6px; }
    .setting-section { margin: 4px 0 0; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--tbx-panel-muted); }
    .theme-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
    .theme-opt {
      height: 34px; border-radius: 10px; border: 1px solid var(--tbx-input-border);
      background: var(--tbx-input-bg); color: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .theme-opt:hover { border-color: var(--tbx-accent); color: var(--tbx-accent); }
    .theme-opt[aria-pressed="true"] { background: var(--tbx-accent); border-color: var(--tbx-accent); color: #fff; }
    .setting-switch {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 8px 6px; border-radius: 10px; cursor: pointer; user-select: none;
    }
    .setting-switch:hover { background: var(--tbx-row-hover); }
    .setting-switch span:first-child { font-size: 13px; flex: 1; }
    .setting-switch input {
      position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0;
    }
    .switch-track {
      flex-shrink: 0;
      width: 40px; height: 22px; border-radius: 999px;
      background: #cbd5e1; position: relative; transition: background 0.15s;
    }
    .root.theme-dark .switch-track { background: #334155; }
    .switch-track::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 18px; height: 18px; border-radius: 50%; background: #fff;
      box-shadow: 0 1px 3px rgba(15,23,42,0.2); transition: transform 0.15s;
    }
    .setting-switch input:checked + .switch-track { background: var(--tbx-accent); }
    .setting-switch input:checked + .switch-track::after { transform: translateX(18px); }
    .setting-switch input:focus-visible + .switch-track { outline: 2px solid #5eead4; outline-offset: 2px; }
    .panel input {
      width: 100%; height: 36px; padding: 0 12px; border-radius: 10px;
      border: 1px solid var(--tbx-input-border); font-size: 13px; background: var(--tbx-input-bg); color: inherit;
    }
    .panel input:focus { outline: 2px solid #99f6e4; border-color: var(--tbx-accent); }
    .panel-list { overflow: auto; flex: 1; display: flex; flex-direction: column; gap: 2px; min-height: 0; }
    .device-row, .setting-row {
      display: flex; align-items: center;
      width: 100%; border: 0; border-radius: 10px;
      background: transparent; text-align: left; cursor: pointer; color: inherit;
    }
    .device-row:hover, .setting-row:hover { background: var(--tbx-row-hover); }
    .device-row[aria-current="true"] { background: #ccfbf1; color: #0f766e; }
    .root.theme-dark .device-row[aria-current="true"] { background: #134e4a; color: #99f6e4; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      border: 1px solid var(--tbx-input-border); background: var(--tbx-input-bg); border-radius: 999px;
      padding: 4px 10px; font-size: 11px; cursor: pointer; color: inherit;
      white-space: nowrap;
    }
    .chip:hover { border-color: var(--tbx-accent); color: #0f766e; }
    .chip[aria-pressed="true"] { background: var(--tbx-accent); color: #fff; border-color: var(--tbx-accent); }
    .blocked {
      position: absolute; inset: 0; z-index: 5;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 16px; text-align: center;
      background: #f4f4f5; color: #52525b; font-size: 12px;
    }
    .blocked a { color: #4f46e5; }
    .landscape .island { top: 50%; left: 12px; transform: translateY(-50%); width: 14px; height: 32%; }
    .landscape .notch { top: 50%; left: 0; transform: translateY(-50%); width: 16px; height: 22%; border-radius: 0 16px 16px 0; }
    .landscape .punch { top: 50%; left: 10px; transform: translateY(-50%); }
    .landscape .home { bottom: auto; left: auto; right: 8px; top: 50%; transform: translateY(-50%); width: 5px; height: 22%; }
    .landscape .safari { display: none; }
    .landscape .status { padding: 0 16px; height: 28px; }
  `
  shadow.append(style)

  const root = document.createElement('div')
  root.className = 'root'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', `${config.label} mobile simulator`)
  root.style.setProperty('--tbx-fill', config.finish.fill)
  root.style.setProperty('--tbx-ring', config.finish.ring)
  root.style.setProperty('--tbx-button', config.finish.button)
  root.classList.toggle('theme-dark', config.ui.theme === 'dark')
  root.classList.toggle('theme-classic', config.ui.theme !== 'dark')

  root.innerHTML = `
    <div class="stage">
      <div class="phone-wrap">
        <img class="mockup-img" alt="" hidden />
        <span class="side" style="top:16%;left:-3px;height:7%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:26%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:39%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:22%;right:-3px;height:14%;border-radius:0 1px 1px 0;"></span>
        <div class="chassis">
          <div class="screen">
            <iframe title="${escapeHtml(config.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <div class="status" aria-hidden="true">
              <span class="clock"></span>
              <span class="status-icons">${iconSignal}${iconWifi}${iconBattery}</span>
            </div>
            <div class="cutout"></div>
            <div class="safari" hidden>
              <div class="url-pill">
                <span aria-hidden="true">AA</span>
                <span class="host"></span>
                ${iconRefresh}
              </div>
              <div class="safari-tools" aria-hidden="true">
                ${iconBack}${iconForward}${iconShare}${iconBook}${iconTabs}
              </div>
            </div>
            <div class="home" hidden></div>
            <div class="android-nav" hidden>
              <span style="width:10px;height:10px;border:1px solid currentColor;border-radius:2px;"></span>
              <span style="width:10px;height:10px;border:1px solid currentColor;border-radius:999px;"></span>
              <span style="width:10px;height:2px;background:currentColor;border-radius:999px;"></span>
            </div>
            <div class="blocked">This site blocked the in-page preview.<br/><a class="studio-link" target="_blank" rel="noopener noreferrer">Open full simulator</a></div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel" data-panel="devices" role="dialog" aria-label="Choose device">
      <div class="device-sidebar" data-kind-tabs role="tablist" aria-label="Device categories"></div>
      <div class="device-main">
        <div class="device-panel-head">
          <h2>Devices</h2>
          <input type="search" class="device-search" placeholder="Search devices" aria-label="Search devices" />
        </div>
        <div class="panel-list" data-device-list></div>
      </div>
    </div>
    <div class="panel" data-panel="settings" role="dialog" aria-label="Simulator settings">
      <div class="panel-head">
        ${iconSettings}
        <h2>Settings</h2>
      </div>
      <div class="setting-list">
        <p class="setting-section">Simulator canvas</p>
        <div class="theme-pick" role="group" aria-label="Simulator canvas theme">
          <button type="button" class="theme-opt" data-theme-opt="classic" aria-label="Classic light canvas">Classic</button>
          <button type="button" class="theme-opt" data-theme-opt="dark" aria-label="Dark canvas">Dark</button>
        </div>
        <p class="setting-section">Device chrome</p>
        <label class="setting-switch">
          <span>Safari chrome</span>
          <input type="checkbox" data-set="safari" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <label class="setting-switch">
          <span>Status bar</span>
          <input type="checkbox" data-set="status" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <label class="setting-switch">
          <span>Navigation bar</span>
          <input type="checkbox" data-set="nav" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <p class="setting-section">Preview</p>
        <label class="setting-switch">
          <span>Mobile User-Agent</span>
          <input type="checkbox" data-set="mobile-ua" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <label class="setting-switch">
          <span>Load sites that block embedding</span>
          <input type="checkbox" data-set="unblock" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <p class="capture-hint">Simulator also applies these options in the full studio.</p>
      </div>
    </div>
    <div class="panel" data-panel="shot-menu">
      <h2>Screenshot</h2>
      <p class="capture-hint">Choose what to capture from the simulator.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-shot="simulator">Simulator screenshot</button>
        <button type="button" class="menu-option" data-shot="viewport">Visible screen</button>
      </div>
    </div>
    <div class="panel" data-panel="record-menu">
      <h2>Record</h2>
      <p class="capture-hint">Recording includes the simulator frame and the page inside this tab.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-record="tab">Start tab recording</button>
      </div>
    </div>
    <div class="panel" data-panel="capture-result">
      <h2 data-capture-title>Screenshot ready</h2>
      <img data-capture-preview alt="Screenshot preview" />
      <div class="capture-actions">
        <button type="button" class="menu-option" data-capture-download>Download again</button>
        <button type="button" class="menu-option" data-capture-close>Close</button>
      </div>
    </div>
    <div class="actions">
      <div class="actions-primary">
        <button type="button" class="round" data-act="close" aria-label="Close simulator">${iconClose}</button>
        <button type="button" class="round" data-act="devices" aria-label="Change device">${iconPhone}</button>
        <button type="button" class="round" data-act="settings" aria-label="Settings">${iconSettings}</button>
      </div>
      <div class="actions-scroll">
        <button type="button" class="round" data-act="rotate" aria-label="Rotate">${iconRotate}</button>
        <button type="button" class="round" data-act="reload" aria-label="Reload">${iconRefresh}</button>
        <button type="button" class="round" data-act="screenshot" aria-label="Screenshot">${iconCamera}</button>
        <button type="button" class="round" data-act="record" aria-label="Start recording">${iconVideo}</button>
        <button type="button" class="round" data-act="compare" aria-label="Compare devices">${iconTabs}</button>
        <button type="button" class="round" data-act="expand" aria-label="Open full simulator">${iconExpand}</button>
      </div>
    </div>
  `
  shadow.append(root)

  const screen = shadow.querySelector('.screen') as HTMLElement
  const iframe = shadow.querySelector('iframe') as HTMLIFrameElement
  const clock = shadow.querySelector('.clock') as HTMLElement
  const cutout = shadow.querySelector('.cutout') as HTMLElement
  const safari = shadow.querySelector('.safari') as HTMLElement
  const home = shadow.querySelector('.home') as HTMLElement
  const androidNav = shadow.querySelector('.android-nav') as HTMLElement
  const blocked = shadow.querySelector('.blocked') as HTMLElement
  const hostLabel = shadow.querySelector('.host') as HTMLElement
  const chassis = shadow.querySelector('.chassis') as HTMLElement
  const status = shadow.querySelector('.status') as HTMLElement
  const wrap = shadow.querySelector('.phone-wrap') as HTMLElement
  const mockupImg = shadow.querySelector('.mockup-img') as HTMLImageElement

  hostLabel.textContent = config.hostname
  iframe.src = config.url
  for (const link of shadow.querySelectorAll<HTMLAnchorElement>('.studio-link')) {
    link.href = config.studioUrl
  }

  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  tick()
  const clockId = window.setInterval(tick, 30_000)

  type DeviceRow = { id: string; label: string; kind: string; manufacturer: string; width: number; height: number }
  type DeviceList = { devices: DeviceRow[]; favorites: string[]; recents: string[]; current: string }
  let catalog: DeviceList = { devices: [], favorites: [], recents: [], current: config.deviceId }
  let kindFilter = 'phone'
  const searchInput = shadow.querySelector('.device-search') as HTMLInputElement
  const kindTabs = shadow.querySelector('[data-kind-tabs]') as HTMLElement
  const deviceList = shadow.querySelector('[data-device-list]') as HTMLElement
  const deviceBtn = shadow.querySelector('[data-act="devices"]') as HTMLButtonElement
  const screenshotBtn = shadow.querySelector('[data-act="screenshot"]') as HTMLButtonElement
  const settingsBtn = shadow.querySelector('[data-act="settings"]') as HTMLButtonElement
  const recordBtn = shadow.querySelector('[data-act="record"]') as HTMLButtonElement
  const shotPanel = shadow.querySelector('[data-panel="shot-menu"]') as HTMLElement
  const recordPanel = shadow.querySelector('[data-panel="record-menu"]') as HTMLElement
  const capturePanel = shadow.querySelector('[data-panel="capture-result"]') as HTMLElement
  const settingsPanel = shadow.querySelector('[data-panel="settings"]') as HTMLElement

  const ask = <T,>(payload: Record<string, unknown>) =>
    new Promise<T | null>((resolve) => {
      try {
        chrome.runtime.sendMessage(payload, (raw: { ok?: boolean; data?: T } | undefined) => {
          resolve(raw && raw.ok !== false ? ((raw.data ?? raw) as T) : null)
        })
      } catch {
        resolve(null)
      }
    })

  const applyTheme = (theme: SimulatorOverlayUiTheme) => {
    root.classList.toggle('theme-dark', theme === 'dark')
    root.classList.toggle('theme-classic', theme !== 'dark')
  }

  const paintFinish = (next: SimulatorOverlayConfig) => {
    root.style.setProperty('--tbx-fill', next.finish.fill)
    root.style.setProperty('--tbx-ring', next.finish.ring)
    root.style.setProperty('--tbx-button', next.finish.button)
    root.setAttribute('aria-label', `${next.label} mobile simulator`)
    iframe.title = next.label
    hostLabel.textContent = next.hostname
    for (const link of shadow.querySelectorAll<HTMLAnchorElement>('.studio-link')) {
      link.href = next.studioUrl
    }
  }

  type OverlaySettings = SimulatorOverlayUiSettings

  const syncSettingsUi = () => {
    const ui = state.ui
    for (const button of shadow.querySelectorAll<HTMLButtonElement>('[data-theme-opt]')) {
      button.setAttribute('aria-pressed', String(button.dataset.themeOpt === ui.theme))
    }
    const safariInput = shadow.querySelector('[data-set="safari"]') as HTMLInputElement | null
    const statusInput = shadow.querySelector('[data-set="status"]') as HTMLInputElement | null
    const navInput = shadow.querySelector('[data-set="nav"]') as HTMLInputElement | null
    const uaInput = shadow.querySelector('[data-set="mobile-ua"]') as HTMLInputElement | null
    const unblockInput = shadow.querySelector('[data-set="unblock"]') as HTMLInputElement | null
    if (safariInput) safariInput.checked = state.live.showSafari
    if (statusInput) statusInput.checked = ui.showStatusBar
    if (navInput) navInput.checked = ui.showNavBar
    if (uaInput) uaInput.checked = ui.mobileUa
    if (unblockInput) unblockInput.checked = ui.unblock
  }

  const applyOverlaySettings = (ui: OverlaySettings) => {
    state.ui = ui
    applyTheme(ui.theme)
    syncSettingsUi()
    layout()
  }

  const loadOverlaySettings = async () => {
    const next = await ask<OverlaySettings>({
      type: 'SIMULATOR_OVERLAY_ACTION',
      action: 'getSettings',
      url: state.live.url,
    })
    if (!next?.theme) return
    applyOverlaySettings(next)
  }

  const patchOverlaySettings = async (patch: Record<string, boolean | string>) => {
    const next = await ask<OverlaySettings>({
      type: 'SIMULATOR_OVERLAY_ACTION',
      action: 'patchSettings',
      patch,
      deviceId: state.live.deviceId,
      url: state.live.url,
    })
    if (!next?.theme) return
    const reloadNeeded = patch.mobileUa !== undefined
    applyOverlaySettings(next)
    if (reloadNeeded) {
      blocked.style.display = 'none'
      iframe.src = state.live.url
    }
  }

  const devicesPanel = shadow.querySelector('[data-panel="devices"]') as HTMLElement

  const positionRailPanel = (panel: HTMLElement, btn: HTMLElement, arrowVar: string, maxHeight: number) => {
    if (!panel.classList.contains('open')) return
    const rootRect = root.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    panel.style.maxHeight = `${maxHeight}px`
    const arrowY = btnRect.top - rootRect.top + btnRect.height / 2
    panel.style.setProperty(arrowVar, `${arrowY}px`)
    const measured = Math.min(panel.getBoundingClientRect().height || maxHeight, maxHeight)
    let top = arrowY - measured / 2
    top = Math.max(12, Math.min(top, rootRect.height - measured - 12))
    panel.style.top = `${top}px`
    panel.style.right = '76px'
    panel.style.transform = 'none'
  }

  const positionDevicesPanel = () => {
    positionRailPanel(
      devicesPanel,
      deviceBtn,
      '--tbx-device-arrow-y',
      Math.min(window.innerHeight * 0.78, 640),
    )
  }

  const positionCapturePanels = () => {
    const capMax = Math.min(window.innerHeight * 0.72, 520)
    if (state.panel === 'shot-menu') positionRailPanel(shotPanel, screenshotBtn, '--tbx-rail-arrow-y', capMax)
    if (state.panel === 'record-menu') positionRailPanel(recordPanel, recordBtn, '--tbx-rail-arrow-y', capMax)
    if (state.panel === 'capture-result') positionRailPanel(capturePanel, screenshotBtn, '--tbx-rail-arrow-y', capMax)
  }

  const positionSettingsPanel = () => {
    positionRailPanel(
      settingsPanel,
      settingsBtn,
      '--tbx-settings-arrow-y',
      Math.min(window.innerHeight * 0.72, 520),
    )
  }

  const layout = () => {
    const live = state.live
    const width = state.rotated ? live.height : live.width
    const height = state.rotated ? live.width : live.height
    const maxW = Math.max(160, window.innerWidth - 108)
    const maxH = Math.max(160, window.innerHeight - 24)
    const mockup = live.mockupUrl && live.mockupInsets ? live.mockupInsets : null
    root.classList.toggle('has-mockup', Boolean(mockup))
    chassis.classList.toggle('landscape', state.rotated)
    root.classList.toggle('landscape', state.rotated)
    if (mockup) {
      const insets = state.rotated
        ? { left: mockup.bottom, top: mockup.left, right: mockup.top, bottom: mockup.right }
        : mockup
      const holeW = 1 - insets.left - insets.right
      const holeH = 1 - insets.top - insets.bottom
      const outerW = width / holeW
      const outerH = height / holeH
      const scale = Math.min(1, maxW / outerW, maxH / outerH)
      const wrapW = Math.round(outerW * scale)
      const wrapH = Math.round(outerH * scale)
      wrap.style.width = `${wrapW}px`
      wrap.style.height = `${wrapH}px`
      screen.style.width = `${holeW * 100}%`
      screen.style.height = `${holeH * 100}%`
      screen.style.left = `${insets.left * 100}%`
      screen.style.top = `${insets.top * 100}%`
      mockupImg.hidden = false
      mockupImg.src = live.mockupUrl ?? ''
      root.style.setProperty('--tbx-mockup-w', `${wrapW}px`)
      root.style.setProperty('--tbx-mockup-h', `${wrapH}px`)
    } else {
      const pad = 20
      const scale = Math.min(1, maxW / (width + pad), maxH / (height + pad))
      wrap.style.width = ''
      wrap.style.height = ''
      screen.style.left = ''
      screen.style.top = ''
      screen.style.width = `${Math.round(width * scale)}px`
      screen.style.height = `${Math.round(height * scale)}px`
      mockupImg.hidden = true
      mockupImg.removeAttribute('src')
    }
    const notchClass = live.notch === 'punch-hole' ? 'punch' : live.notch
    cutout.className = !mockup && live.notch !== 'none' ? `cutout ${notchClass}` : 'cutout'
    safari.hidden = !live.showSafari || state.rotated
    home.hidden = !state.ui.showNavBar || live.navBar !== 'home-indicator'
    androidNav.hidden = !state.ui.showNavBar || live.navBar !== 'android' || state.rotated
    status.style.display =
      !state.ui.showStatusBar || live.statusBar === 'none' ? 'none' : ''
    syncSettingsUi()
    requestAnimationFrame(() => {
      positionDevicesPanel()
      positionCapturePanels()
      positionSettingsPanel()
    })
  }

  const deviceMatchesFilter = (
    device: DeviceRow,
    query: string,
    fav: Set<string>,
    recent: Set<string>,
  ) => {
    if (kindFilter === 'favorites' && !fav.has(device.id)) return false
    if (kindFilter === 'recents' && !recent.has(device.id)) return false
    if (kindFilter !== 'all' && kindFilter !== 'favorites' && kindFilter !== 'recents' && device.kind !== kindFilter) {
      return false
    }
    if (!query) return true
    return `${device.label} ${device.id} ${device.kind} ${device.manufacturer}`.toLowerCase().includes(query)
  }

  const makeDeviceRow = (device: DeviceRow) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'device-row'
    button.dataset.device = device.id
    if (device.id === state.live.deviceId) button.setAttribute('aria-current', 'true')
    button.innerHTML = `
      <span class="device-thumb" data-kind="${escapeHtml(device.kind)}" aria-hidden="true"></span>
      <span class="device-copy">
        <span class="device-name">${escapeHtml(device.label)}</span>
        <span class="device-meta">${escapeHtml(device.manufacturer)} · ${device.width}×${device.height}</span>
      </span>`
    return button
  }

  const countForKind = (id: string, fav: Set<string>, _recent: Set<string>) => {
    if (id === 'favorites') return catalog.devices.filter((d) => fav.has(d.id)).length
    if (id === 'recents') return catalog.recents.filter((rid) => catalog.devices.some((d) => d.id === rid)).length
    if (id === 'all') return catalog.devices.length
    return catalog.devices.filter((d) => d.kind === id).length
  }

  const renderKindTabs = (fav: Set<string>, recent: Set<string>) => {
    const tabs: { id: string; label: string }[] = [
      { id: 'phone', label: 'Phones' },
      { id: 'tablet', label: 'Tablets' },
      { id: 'laptop', label: 'Laptops' },
      { id: 'desktop', label: 'Desktop' },
      { id: 'watch', label: 'Watch' },
      { id: 'special', label: 'Special' },
      { id: 'all', label: 'All' },
      { id: 'favorites', label: 'Stars' },
      { id: 'recents', label: 'Recent' },
    ]
    kindTabs.replaceChildren(
      ...tabs.map((tab) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'kind-tab'
        button.dataset.kind = tab.id
        button.setAttribute('role', 'tab')
        button.setAttribute('aria-pressed', String(kindFilter === tab.id))
        button.setAttribute('aria-selected', String(kindFilter === tab.id))
        const count = countForKind(tab.id, fav, recent)
        button.innerHTML = `${kindIcons[tab.id] ?? kindIcons.all}<span>${tab.label}</span><span class="kind-count">${count}</span>`
        return button
      }),
    )
  }

  const groupByManufacturer = (devices: DeviceRow[]) => {
    const map = new Map<string, DeviceRow[]>()
    for (const device of devices) {
      const key = device.manufacturer || 'Other'
      const bucket = map.get(key) ?? []
      bucket.push(device)
      map.set(key, bucket)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }

  const renderDevices = () => {
    const query = searchInput.value.trim().toLowerCase()
    const fav = new Set(catalog.favorites)
    const recent = new Set(catalog.recents)
    const matches = catalog.devices.filter((device) => deviceMatchesFilter(device, query, fav, recent))

    const fragments: HTMLElement[] = []

    const pushSection = (title: string, devices: DeviceRow[]) => {
      if (!devices.length) return
      const heading = document.createElement('p')
      heading.className = 'device-section'
      heading.textContent = title
      fragments.push(heading)
      for (const device of devices) fragments.push(makeDeviceRow(device))
    }

    if (kindFilter === 'recents' && !query) {
      const recentDevices = catalog.recents
        .map((id) => catalog.devices.find((d) => d.id === id))
        .filter((d): d is DeviceRow => Boolean(d))
      pushSection('Recent devices', recentDevices)
    } else if (kindFilter === 'favorites' && !query) {
      pushSection('Favorite devices', catalog.devices.filter((d) => fav.has(d.id)))
    } else {
      const sorted = [...matches].sort((a, b) => a.label.localeCompare(b.label))
      for (const [manufacturer, group] of groupByManufacturer(sorted)) {
        pushSection(manufacturer, group)
      }
    }

    if (!fragments.length) {
      const empty = document.createElement('p')
      empty.className = 'capture-hint'
      empty.style.padding = '8px 6px'
      empty.textContent = query ? 'No devices match your search.' : 'No devices in this category.'
      fragments.push(empty)
    }

    deviceList.replaceChildren(...fragments)
    renderKindTabs(fav, recent)
    requestAnimationFrame(() => positionDevicesPanel())
  }

  const capturePreview = shadow.querySelector('[data-capture-preview]') as HTMLImageElement
  const captureTitle = shadow.querySelector('[data-capture-title]') as HTMLElement

  const setPanel = (name: typeof state.panel, forceOpen = false) => {
    state.panel = forceOpen ? name : state.panel === name ? '' : name
    for (const panel of shadow.querySelectorAll('[data-panel]')) {
      panel.classList.toggle('open', panel.getAttribute('data-panel') === state.panel)
    }
    deviceBtn.setAttribute('aria-pressed', String(state.panel === 'devices'))
    settingsBtn.setAttribute('aria-pressed', String(state.panel === 'settings'))
    layout()
    if (state.panel === 'devices') {
      void loadDevices()
      requestAnimationFrame(() => positionDevicesPanel())
    } else if (state.panel === 'settings') {
      void loadOverlaySettings()
      requestAnimationFrame(() => {
        positionSettingsPanel()
        requestAnimationFrame(() => positionSettingsPanel())
      })
    } else if (state.panel === 'shot-menu' || state.panel === 'record-menu' || state.panel === 'capture-result') {
      requestAnimationFrame(() => positionCapturePanels())
    }
    screenshotBtn.setAttribute('aria-pressed', String(state.panel === 'shot-menu' || state.panel === 'capture-result'))
  }

  const showCaptureResult = (dataUrl: string, filename: string, kind: 'simulator' | 'viewport') => {
    state.lastCaptureUrl = dataUrl
    state.lastCaptureName = filename
    capturePreview.src = dataUrl
    captureTitle.textContent = kind === 'simulator' ? 'Simulator screenshot ready' : 'Screen capture ready'
    setPanel('capture-result', true)
  }

  const runScreenshot = async (mode: 'simulator' | 'viewport') => {
    setPanel('')
    const result = await ask<{ ok: boolean; dataUrl?: string; filename?: string; kind?: 'simulator' | 'viewport'; error?: string }>({
      type: 'SIMULATOR_OVERLAY_ACTION',
      action: 'screenshot',
      captureMode: mode,
      url: state.live.url,
    })
    if (result?.ok && result.dataUrl && result.filename) {
      showCaptureResult(result.dataUrl, result.filename, result.kind ?? mode)
      return
    }
    setPanel('shot-menu', true)
  }

  const loadDevices = async () => {
    const next = await ask<DeviceList>({ type: 'SIMULATOR_OVERLAY_ACTION', action: 'listDevices' })
    if (!next?.devices) return
    catalog = next
    renderDevices()
  }

  const apply = (next: SimulatorOverlayConfig) => {
    state.live = next
    state.ui = next.ui
    state.rotated = false
    applyTheme(next.ui.theme)
    paintFinish(next)
    if (iframe.getAttribute('src') !== next.url) iframe.src = next.url
    layout()
    if (state.panel === 'devices') renderDevices()
  }
  host.__tbxSimApply = apply
  paintFinish(config)
  syncSettingsUi()
  layout()

  iframe.addEventListener('load', () => {
    try {
      const href = iframe.contentWindow?.location.href ?? ''
      if (href.startsWith('chrome-error:') || href.includes('chromewebdata')) {
        blocked.style.display = 'flex'
      }
    } catch {
      /* cross-origin success */
    }
  })

  const onResize = () => layout()
  window.addEventListener('resize', onResize)

  const currentPreviewUrl = () => {
    try {
      const href = iframe.contentWindow?.location.href
      if (href && !href.startsWith('about:')) return href
    } catch {
      /* cross-origin preview */
    }
    return iframe.src || state.live.url
  }

  const reloadPreview = () => {
    blocked.style.display = 'none'
    try {
      iframe.contentWindow?.location.reload()
      return
    } catch {
      /* fall back below */
    }
    try {
      const url = new URL(currentPreviewUrl())
      url.hash = `tbx-sim-reload=${++state.previewReload}`
      iframe.src = url.href
    } catch {
      state.previewReload += 1
      const base = state.live.url.split('#')[0]
      iframe.src = `${base}#tbx-sim-reload=${state.previewReload}`
    }
  }

  const onKey = (event: KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey
    if (event.key === 'F5' || (mod && !event.shiftKey && event.key.toLowerCase() === 'r')) {
      event.preventDefault()
      event.stopPropagation()
      reloadPreview()
      return
    }
    if (event.key !== 'Escape') return
    event.preventDefault()
    if (state.panel) {
      setPanel('')
      return
    }
    dispose()
  }

  const dispose = () => {
    void ask({ type: 'SIMULATOR_OVERLAY_ACTION', action: 'closed' })
    window.clearInterval(clockId)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('keydown', onKey, true)
    document.documentElement.style.overflow = previousOverflow
    host.remove()
  }
  host.__tbxSimDispose = dispose
  document.addEventListener('keydown', onKey, true)

  shadow.querySelector('[data-act="close"]')?.addEventListener('click', () => dispose())
  shadow.querySelector('[data-act="rotate"]')?.addEventListener('click', () => {
    state.rotated = !state.rotated
    layout()
  })
  shadow.querySelector('[data-act="reload"]')?.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    reloadPreview()
  })
  deviceBtn.addEventListener('click', () => setPanel('devices'))
  settingsBtn.addEventListener('click', () => setPanel('settings'))
  searchInput.addEventListener('input', () => renderDevices())
  kindTabs.addEventListener('click', (event) => {
    const kind = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-kind]')?.dataset.kind
    if (!kind) return
    kindFilter = kind
    renderDevices()
  })
  deviceList.addEventListener('click', (event) => {
    const id = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-device]')?.dataset.device
    if (!id) return
    void ask({
      type: 'SIMULATOR_OVERLAY_ACTION',
      action: 'setDevice',
      deviceId: id,
      url: state.live.url,
    })
    setPanel('')
  })
  shadow.querySelector('[data-panel="settings"]')?.addEventListener('click', (event) => {
    const themeBtn = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-theme-opt]')
    if (themeBtn?.dataset.themeOpt === 'classic' || themeBtn?.dataset.themeOpt === 'dark') {
      void patchOverlaySettings({ theme: themeBtn.dataset.themeOpt })
    }
  })
  shadow.querySelector('[data-panel="settings"]')?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement
    if (input.tagName !== 'INPUT' || !input.dataset.set) return
    const key = input.dataset.set
    if (key === 'safari') {
      state.live = { ...state.live, showSafari: input.checked }
      layout()
      return
    }
    if (key === 'status') {
      void patchOverlaySettings({ showStatusBar: input.checked })
      return
    }
    if (key === 'nav') {
      void patchOverlaySettings({ showNavBar: input.checked })
      return
    }
    if (key === 'mobile-ua') {
      void patchOverlaySettings({ mobileUa: input.checked })
      return
    }
    if (key === 'unblock') {
      void patchOverlaySettings({ unblock: input.checked })
    }
  })
  shadow.querySelector('[data-act="screenshot"]')?.addEventListener('click', () => setPanel('shot-menu', true))
  shadow.querySelector('[data-panel="shot-menu"]')?.addEventListener('click', (event) => {
    const mode = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-shot]')?.dataset.shot
    if (mode === 'simulator' || mode === 'viewport') void runScreenshot(mode)
  })
  recordBtn.addEventListener('click', () => {
    const pressed = recordBtn.getAttribute('aria-pressed') === 'true'
    if (pressed) {
      void ask({ type: 'RECORDER_STOP' })
      recordBtn.setAttribute('aria-pressed', 'false')
      return
    }
    setPanel('record-menu', true)
  })
  shadow.querySelector('[data-panel="record-menu"]')?.addEventListener('click', (event) => {
    const kind = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-record]')?.dataset.record
    if (kind !== 'tab') return
    setPanel('')
    void ask({ type: 'SIMULATOR_OVERLAY_ACTION', action: 'record', url: state.live.url })
    recordBtn.setAttribute('aria-pressed', 'true')
  })
  shadow.querySelector('[data-capture-download]')?.addEventListener('click', () => {
    if (!state.lastCaptureUrl) return
    const link = document.createElement('a')
    link.href = state.lastCaptureUrl
    link.download = state.lastCaptureName || 'simulator.png'
    link.click()
  })
  shadow.querySelector('[data-capture-close]')?.addEventListener('click', () => setPanel(''))
  shadow.querySelector('[data-act="expand"]')?.addEventListener('click', () => {
    void ask({
      type: 'SIMULATOR_OVERLAY_ACTION',
      action: 'expand',
      url: state.live.url,
      deviceId: state.live.deviceId,
    })
  })
  shadow.querySelector('[data-act="compare"]')?.addEventListener('click', () => {
    void ask({
      type: 'SIMULATOR_OVERLAY_ACTION',
      action: 'compare',
      url: state.live.url,
      deviceId: state.live.deviceId,
    })
  })

  document.documentElement.append(host)
  layout()
  ;(shadow.querySelector('[data-act="devices"]') as HTMLButtonElement | null)?.focus({ preventScroll: true })
  return true
}
