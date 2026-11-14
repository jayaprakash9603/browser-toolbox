import {
  overlayFitScale,
  overlayOuterSize,
  overlayPickerWidth,
  overlayStageBox,
  SIM_RAIL_GAP,
  SIM_RAIL_PX,
  SIM_STAGE_PAD_LEFT,
  SIM_STAGE_PAD_Y,
  type OverlayInsets,
} from './overlayFit'
import {
  overlayHomeIndicatorVisible,
  overlayIframeLayoutSize,
  overlayPreviewChrome,
} from './overlayViewport'
import { OVERLAY_ICONS, overlayIcon, overlayKindIcon } from './overlayIcons'
import type { SimulatorOverlayConfig, SimulatorOverlayUiSettings, SimulatorOverlayUiTheme } from './overlayTypes'

/** Injected in the page only — bundled to public/inject/simulator-overlay.js. */
export function mountSimulatorOverlay(config: SimulatorOverlayConfig): boolean {
  const HOST_ID = 'tbx-simulator-overlay'
  if (window !== window.top) return false

  document.getElementById('tbx-simulator-veil')?.remove()
  delete document.documentElement.dataset.tbxSimVeil

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
  const railClose = overlayIcon(OVERLAY_ICONS.close)
  const railDevices = overlayIcon(OVERLAY_ICONS.devices)
  const railSettings = overlayIcon(OVERLAY_ICONS.settings)
  const railRotate = overlayIcon(OVERLAY_ICONS.rotate)
  const railReload = overlayIcon(OVERLAY_ICONS.reload)
  const railScreenshot = overlayIcon(OVERLAY_ICONS.screenshot)
  const railVideo = overlayIcon(OVERLAY_ICONS.video)
  const railCompare = overlayIcon(OVERLAY_ICONS.compare)
  const railLaunch = overlayIcon(OVERLAY_ICONS.launch)
  const railHelp = overlayIcon(OVERLAY_ICONS.help)
  const iconSignal =
    '<svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="3" width="2" height="7" rx="0.5"/><rect x="12" y="1" width="2" height="9" rx="0.5" opacity="0.45"/></svg>'
  const iconWifi =
    '<svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.4 4.2a7 7 0 0 1 10.2 0"/><path d="M3.2 6a4.4 4.4 0 0 1 6.6 0"/><circle cx="6.5" cy="8.4" r="0.9" fill="currentColor" stroke="none"/></svg>'
  const iconBattery =
    '<svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.6" y="1.2" width="18" height="7.6" rx="1.6" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="2.6" width="13" height="4.8" rx="0.6" fill="currentColor"/><rect x="19.2" y="3.2" width="1.8" height="3.6" rx="0.6" fill="currentColor"/></svg>'
  const iconRefresh =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>'
  const iconBack =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>'
  const iconForward =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
  const iconShare =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>'
  const iconBook =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  const iconTabs =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>'
  const iconCamera = railScreenshot
  const iconVideo = railVideo
  const iconSettings = railSettings
  const kindGlyph = (id: string) => overlayKindIcon(id)
  const iconShotDevice =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'
  const iconShotTab =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg>'
  const iconRecordTab =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>'
  const iconRecordStop =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none"/></svg>'
  const iconCompareGrid = railCompare
  const iconSun =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
  const iconMoon =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'

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
    panel: '' as '' | 'devices' | 'settings' | 'help' | 'shot-menu' | 'record-menu' | 'capture-result' | 'compare-menu',
    split: false,
    focusPane: 0 as 0 | 1,
    compare: null as SimulatorOverlayConfig | null,
    rotatedCompare: false,
    lastCaptureUrl: '',
    lastCaptureName: '',
    previewReload: 0,
    recordSyncId: 0,
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
    .rail-btn svg, .kind-tab svg, .popover-head svg { display: block; flex-shrink: 0; pointer-events: none; }
    .root {
      pointer-events: auto;
      position: fixed;
      inset: 0;
      border: 0;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #1e293b;
      --tbx-rail-icon: #64748b;
      --tbx-rail-icon-hover: #7c3aed;
      --tbx-kind-icon: #334155;
      --tbx-kind-plate: #f1f5f9;
      --tbx-kind-plate-hover: #e2e8f0;
      --tbx-accent: #7c3aed;
      --tbx-accent-hover: #6d28d9;
      --tbx-accent-pressed: #5b21b6;
      --tbx-panel-bg: #ffffff;
      --tbx-panel-border: #e2e8f0;
      --tbx-panel-muted: #64748b;
      --tbx-row-hover: #f8fafc;
      --tbx-input-bg: #f8fafc;
      --tbx-input-border: #cbd5e1;
      --tbx-hint: #64748b;
      --tbx-menu-bg: #ffffff;
      --tbx-menu-border: #e2e8f0;
      --tbx-scroll-thumb: #94a3b8;
      --tbx-scroll-track: #e2e8f0;
    }
    .root.theme-classic {
      background: #ffffff;
    }
    .panel.device-picker,
    .panel.device-picker .device-main,
    .panel.device-picker .device-sidebar {
      color: #0f172a;
    }
    .panel.device-picker .device-search-wrap input {
      color: #0f172a;
    }
    .panel.device-picker .device-search-wrap input::placeholder {
      color: #94a3b8;
    }
    .panel.device-picker .kind-tab { color: #334155; }
    .panel.device-picker .kind-tab[aria-pressed="true"] { color: #fff; }
    .root.theme-dark {
      background: #0b0f14;
      color: #e2e8f0;
      --tbx-kind-icon: #cbd5e1;
      --tbx-kind-plate: #1e2733;
      --tbx-kind-plate-hover: #283545;
      --tbx-panel-bg: #151b24;
      --tbx-panel-border: #2a3544;
      --tbx-panel-muted: #94a3b8;
      --tbx-row-hover: #1e2733;
      --tbx-input-bg: #0f141c;
      --tbx-input-border: #334155;
      --tbx-hint: #cbd5e1;
      --tbx-menu-bg: #1e2733;
      --tbx-menu-border: #3d4f63;
      --tbx-scroll-thumb: #94a3b8;
      --tbx-scroll-track: #0f141c;
    }
    .root.theme-dark .panel { box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
    .root.theme-dark .panel.device-picker,
    .root.theme-dark .panel.device-picker .device-main,
    .root.theme-dark .panel.device-picker .device-sidebar {
      color: #e2e8f0;
    }
    .root.theme-dark .panel.device-picker .device-panel-head h2,
    .root.theme-dark .panel.device-picker .device-current-name {
      color: #f8fafc;
    }
    .root.theme-dark .panel.device-picker .device-current-label {
      color: #cbd5e1;
    }
    .root.theme-dark .device-current {
      background: #1e2733;
      border-color: #3d4f63;
    }
    .root.theme-dark .panel.device-picker .device-search-wrap input {
      color: #f8fafc;
    }
    .root.theme-dark .panel.device-picker .device-search-wrap input::placeholder {
      color: #94a3b8;
    }
    .root.theme-dark .panel.device-picker .kind-tab { color: #e2e8f0; }
    .stage {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 20px;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      padding: ${SIM_STAGE_PAD_Y}px ${SIM_RAIL_PX + SIM_RAIL_GAP}px ${SIM_STAGE_PAD_Y}px ${SIM_STAGE_PAD_LEFT}px;
      background: inherit;
    }
    .sim-pane {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-width: 0;
      min-height: 0;
      height: auto;
      max-height: 100%;
      flex: 0 1 auto;
      border-radius: 16px;
      outline: none;
      --tbx-fill: inherit;
      --tbx-ring: inherit;
      --tbx-button: inherit;
    }
    .sim-pane[hidden] { display: none !important; }
    .root.is-split .sim-pane {
      flex: 1 1 0;
      height: 100%;
      max-width: calc(50% - 10px);
    }
    .root.is-split .sim-pane.is-focus .phone-wrap {
      outline: 2px solid color-mix(in srgb, var(--tbx-accent) 55%, transparent);
      outline-offset: 10px;
      border-radius: 28px;
    }
    .pane-caption {
      display: none;
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--tbx-panel-muted);
    }
    .root.is-split .pane-caption { display: block; }
    .sim-pane.is-focus .pane-caption { color: var(--tbx-accent); }
    .phone-wrap {
      position: relative;
      flex-shrink: 0;
      overflow: visible;
      filter: none;
    }
    .phone-inner {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: top left;
    }
    .mockup-img {
      pointer-events: none;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 6;
    }
    .sim-pane.has-mockup.landscape .mockup-img {
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
      box-shadow: 0 1px 0 var(--tbx-ring);
    }
    .sim-pane.has-mockup .chassis {
      position: absolute;
      inset: 0;
      padding: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .sim-pane.has-mockup .side { display: none; }
    .sim-pane.has-mockup .screen {
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
    .viewport {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background: #fff;
    }
    .viewport iframe {
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
    .island, .notch, .punch, .pill, .home { pointer-events: none; position: absolute; z-index: 4; background: #0a0a0a; }
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
    .screen.safari-visible .home {
      background: #3a3a3c;
    }
    .safari {
      pointer-events: none;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 5;
      padding: 6px 12px 18px;
      background: linear-gradient(180deg, rgba(247,247,248,0.92) 0%, #f4f4f5 40%, #f4f4f5 100%);
      color: #111827;
    }
    .sim-pane.has-mockup .status {
      mix-blend-mode: normal;
      color: #fff;
      background: var(--tbx-accent);
      align-items: flex-end;
      padding-bottom: 4px;
      box-shadow: none;
      z-index: 7;
    }
    .sim-pane.has-mockup .status[data-bar="ios"] { height: 11.5%; min-height: 38px; padding-top: 0; }
    .sim-pane.has-mockup .status[data-bar="android"] { height: 9.5%; min-height: 32px; }
    .sim-pane.has-mockup .status .status-icons svg { color: #fff; opacity: 0.92; }
    .sim-pane.has-mockup .status .clock { color: #fff; font-weight: 600; }
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
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 4px;
      border-radius: 4px;
      background: #ffffff;
      border: 0;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      z-index: 9;
      max-height: min(92vh, 620px);
      overflow: visible;
      width: 42px;
      pointer-events: auto;
    }
    .actions-primary {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
    }
    .actions-scroll {
      flex: 1;
      min-height: 0;
      width: 100%;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #ececec;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }
    .root.theme-dark .actions-scroll { border-top-color: #2a3544; }
    .root.theme-dark .actions {
      background: rgba(21,27,36,0.96);
      box-shadow: 0 4px 20px rgba(0,0,0,0.45);
    }
    .root.theme-dark {
      --tbx-rail-icon: #9aa0a6;
      --tbx-rail-icon-hover: #a78bfa;
    }
    .rail-btn, .round {
      position: relative;
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; min-width: 32px; min-height: 32px;
      border-radius: 4px;
      border: 0;
      background: transparent;
      color: var(--tbx-rail-icon);
      cursor: pointer;
      text-decoration: none;
      flex-shrink: 0;
      pointer-events: auto;
    }
    .rail-btn:hover, .round:hover,
    .rail-btn:focus-visible, .round:focus-visible {
      color: var(--tbx-rail-icon-hover);
      background: rgba(124, 58, 237, 0.08);
    }
    .rail-btn:focus-visible, .round:focus-visible { outline: 2px solid rgba(124, 58, 237, 0.45); outline-offset: 1px; }
    .rail-btn[aria-pressed="true"], .round[aria-pressed="true"] {
      color: var(--tbx-rail-icon-hover);
      background: rgba(124, 58, 237, 0.12);
    }
    .root.theme-dark .rail-btn:hover, .root.theme-dark .round:hover,
    .root.theme-dark .rail-btn:focus-visible, .root.theme-dark .round:focus-visible {
      background: rgba(167, 139, 250, 0.14);
    }
    .root.theme-dark .rail-btn[aria-pressed="true"], .root.theme-dark .round[aria-pressed="true"] {
      background: rgba(167, 139, 250, 0.18);
    }
  .rail-tip {
      position: absolute;
      right: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--tbx-rail-icon-hover);
      color: #fff;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.25;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 20;
    }
    .rail-tip::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-left-color: var(--tbx-rail-icon-hover);
    }
    .rail-btn:hover .rail-tip, .rail-btn:focus-visible .rail-tip { opacity: 1; }
    .help-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .help-list a, .help-list button.help-link {
      display: block;
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      text-align: left;
      font-size: 13px;
      line-height: 1.35;
      padding: 9px 10px;
      cursor: pointer;
      text-decoration: none;
    }
    .help-list a:hover, .help-list button.help-link:hover {
      background: var(--tbx-row-hover);
      color: var(--tbx-rail-icon-hover);
    }
    .help-section-title {
      margin: 10px 6px 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--tbx-panel-muted);
    }
    .panel.help-center { gap: 4px; }
    .panel {
      display: none; flex-direction: column; gap: 10px;
      position: absolute; z-index: 8;
      background: var(--tbx-panel-bg);
      color: inherit;
    }
    .panel.open { display: flex; z-index: 11; pointer-events: none; }
    .panel.open > * { pointer-events: auto; }
    .panel::after { pointer-events: none; }
    .panel[data-panel="devices"].open { z-index: 12; }
    .panel.rail-popover {
      background: var(--tbx-panel-bg);
      color: inherit;
      box-shadow: 0 16px 40px rgba(15,23,42,0.14);
    }
    .root.theme-dark .panel.rail-popover {
      box-shadow: 0 18px 46px rgba(0,0,0,0.45);
    }
    .panel.rail-popover::after {
      pointer-events: none;
      background: var(--tbx-panel-bg);
      border-right-color: var(--tbx-panel-border);
      border-top-color: var(--tbx-panel-border);
    }
    .panel.rail-popover .capture-hint { color: var(--tbx-hint); }
    .popover-head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--tbx-panel-border);
      margin-bottom: 2px;
    }
    .popover-head h2 { margin: 0; font-size: 15px; font-weight: 700; flex: 1; min-width: 0; }
    .popover-head svg { width: 20px; height: 20px; flex-shrink: 0; opacity: 0.95; color: var(--tbx-rail-icon); }
    .panel.rail-popover .setting-card {
      border: 1px solid var(--tbx-panel-border);
      border-radius: 12px;
      padding: 10px 10px 8px;
      background: var(--tbx-input-bg);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .panel.rail-popover .setting-card .setting-section { margin-top: 0; color: var(--tbx-panel-muted); }
    .panel.rail-popover {
      overflow-x: hidden;
      overflow-y: hidden;
      scrollbar-width: thin;
    }
    .panel.rail-popover .setting-list {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding-right: 2px;
    }
    .panel.rail-popover .setting-switch span:first-child {
      min-width: 0;
    }
    .menu-option {
      display: flex; align-items: flex-start; gap: 12px;
      width: 100%; min-height: 52px; padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--tbx-menu-border);
      background: var(--tbx-menu-bg);
      color: inherit; cursor: pointer; text-align: left;
    }
    .menu-option-icon {
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(124, 58, 237, 0.12);
      color: var(--tbx-accent);
    }
    .panel.device-picker .menu-option-icon { background: rgba(124, 58, 237, 0.12); color: var(--tbx-accent); }
    .menu-option-icon svg { width: 20px; height: 20px; }
    .menu-option-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; padding-top: 2px; }
    .menu-option-title { font-size: 13px; font-weight: 700; line-height: 1.25; }
    .menu-option-desc { font-size: 11px; font-weight: 500; color: var(--tbx-hint); line-height: 1.35; }
    .menu-option:hover {
      border-color: var(--tbx-accent);
      background: var(--tbx-row-hover);
    }
    .capture-result-body {
      display: flex; flex-direction: column; gap: 10px;
      border: 1px solid var(--tbx-panel-border);
      border-radius: 12px;
      padding: 10px;
      background: rgba(15,20,28,0.55);
    }
    .panel[data-panel="devices"] {
      right: ${SIM_RAIL_PX}px;
      width: min(440px, 36vw);
      height: min(88vh, 820px);
      max-height: min(88vh, 820px);
      padding: 0;
      border-radius: 16px;
      border: 1px solid var(--tbx-panel-border);
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
      min-height: 0;
      overflow: hidden;
      flex-direction: row;
      align-items: stretch;
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
    .device-panel-head h2 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .device-current {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid var(--tbx-panel-border);
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    }
    .device-current-thumb {
      flex-shrink: 0;
      border: 2px solid #94a3b8;
      border-radius: 8px;
      background: #fff;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.8);
    }
    .device-current-label {
      margin: 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--tbx-panel-muted);
    }
    .device-current-name {
      margin: 2px 0 0;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .device-search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--tbx-input-border);
      background: var(--tbx-input-bg);
    }
    .device-search-wrap svg { flex-shrink: 0; color: var(--tbx-panel-muted); width: 16px; height: 16px; }
    .device-search-wrap input {
      border: 0; padding: 0; height: auto; background: transparent; flex: 1; min-width: 0;
    }
    .device-search-wrap input:focus { outline: none; }
    .panel.device-picker .kind-tab[aria-pressed="true"] {
      background: var(--tbx-accent);
      border-color: var(--tbx-accent);
      box-shadow: 0 2px 10px rgba(124,58,237,0.35);
    }
    .device-sidebar {
      flex-shrink: 0;
      align-self: stretch;
      width: 76px;
      min-height: 0;
      max-height: 100%;
      padding: 10px 6px;
      border-right: 1px solid var(--tbx-panel-border);
      background: var(--tbx-input-bg);
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: var(--tbx-scroll-thumb) var(--tbx-scroll-track);
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
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
      box-shadow: 0 2px 8px rgba(124,58,237,0.35);
    }
    .kind-tab .kind-icon-plate {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--tbx-kind-plate);
      transition: background 0.12s ease;
    }
    .kind-tab:hover .kind-icon-plate { background: var(--tbx-kind-plate-hover); }
    .kind-tab svg { color: var(--tbx-kind-icon); }
    .kind-tab[aria-pressed="true"] svg { color: #fff; }
    .kind-tab[aria-pressed="true"] .kind-icon-plate { background: transparent; }
    .kind-tab .kind-count { font-size: 8px; font-weight: 700; opacity: 0.85; tabular-nums; }
    .device-thumb-img {
      display: block;
      width: 42px;
      height: auto;
      max-height: 56px;
      object-fit: contain;
      flex-shrink: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
    }
    .device-main {
      flex: 1;
      min-width: 0;
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .panel[data-panel="devices"] .panel-list {
      flex: 1 1 auto;
      min-height: 0;
      padding: 8px 10px 14px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: var(--tbx-scroll-thumb) var(--tbx-scroll-track);
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
      align-content: start;
      gap: 6px;
    }
    .device-sidebar,
    .panel[data-panel="devices"] .panel-list,
    .actions-scroll,
    .setting-list {
      scrollbar-width: thin;
      scrollbar-color: var(--tbx-scroll-thumb) var(--tbx-scroll-track);
    }
    .device-sidebar::-webkit-scrollbar,
    .panel[data-panel="devices"] .panel-list::-webkit-scrollbar,
    .actions-scroll::-webkit-scrollbar,
    .setting-list::-webkit-scrollbar {
      width: 8px;
    }
    .device-sidebar::-webkit-scrollbar-track,
    .panel[data-panel="devices"] .panel-list::-webkit-scrollbar-track,
    .actions-scroll::-webkit-scrollbar-track,
    .setting-list::-webkit-scrollbar-track {
      background: var(--tbx-scroll-track);
      border-radius: 999px;
    }
    .device-sidebar::-webkit-scrollbar-thumb,
    .panel[data-panel="devices"] .panel-list::-webkit-scrollbar-thumb,
    .actions-scroll::-webkit-scrollbar-thumb,
    .setting-list::-webkit-scrollbar-thumb {
      background: var(--tbx-scroll-thumb);
      border-radius: 999px;
      border: 2px solid var(--tbx-scroll-track);
    }
    .panel[data-panel="devices"] .panel-list > .capture-hint {
      grid-column: 1 / -1;
    }
    .device-section {
      grid-column: 1 / -1;
      margin: 10px 2px 2px;
      padding-bottom: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--tbx-panel-muted);
      border-bottom: 1px solid var(--tbx-panel-border);
    }
    .root.theme-dark .device-section { color: #cbd5e1; }
    .device-section:first-child { margin-top: 2px; }
    .device-thumb {
      position: relative;
      flex-shrink: 0;
      border: 2px solid #0f172a;
      border-radius: 9px;
      background: #ffffff;
      box-shadow: none;
    }
    .device-thumb::after {
      content: '';
      position: absolute;
      top: 4px;
      left: 50%;
      width: 10px;
      height: 3px;
      border-radius: 999px;
      background: #0f172a;
      transform: translateX(-50%);
    }
    .root.theme-dark .device-thumb {
      border-color: #e2e8f0;
      background: #0f172a;
    }
    .root.theme-dark .device-thumb::after { background: #e2e8f0; }
    .device-thumb[data-kind="phone"] { width: 28px; height: 50px; border-radius: 9px; }
    .device-thumb[data-kind="tablet"] { width: 36px; height: 48px; border-radius: 7px; }
    .device-thumb[data-kind="tablet"]::after { width: 8px; }
    .device-thumb[data-kind="laptop"] {
      width: 42px; height: 28px; border-radius: 4px 4px 2px 2px;
    }
    .device-thumb[data-kind="laptop"]::after { display: none; }
    .device-thumb[data-kind="desktop"] { width: 42px; height: 30px; border-radius: 4px; }
    .device-thumb[data-kind="desktop"]::after { display: none; }
    .device-thumb[data-kind="watch"] { width: 26px; height: 32px; border-radius: 9px; }
    .device-thumb[data-kind="watch"]::after { width: 8px; top: 5px; }
    .device-thumb[data-kind="special"] { width: 32px; height: 32px; border-radius: 7px; }
    .device-thumb[data-kind="special"]::after { display: none; }
    .device-copy { min-width: 0; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .device-name {
      font-size: 11px;
      font-weight: 600;
      line-height: 1.25;
      text-align: center;
      color: #475569;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .root.theme-dark .device-name { color: #e2e8f0; }
    .device-meta { font-size: 9px; color: #64748b; text-align: center; }
    .root.theme-dark .device-meta { color: #94a3b8; }
    .device-row {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 96px;
      padding: 10px 6px 8px;
      border: 2px solid transparent;
      border-radius: 14px;
      background: transparent;
      box-shadow: none;
      text-align: center;
      cursor: pointer;
      color: inherit;
    }
    .device-row:hover { background: #f1f5f9; }
    .device-row[aria-current="true"] {
      background: #f5f3ff;
      border-color: var(--tbx-accent);
      color: #0f172a;
      box-shadow: none;
    }
    .device-row[aria-current="true"]:hover { background: #ede9fe; }
    .device-row[aria-current="true"] .device-name {
      color: var(--tbx-accent);
      font-weight: 700;
    }
    .device-row[aria-current="true"] .device-meta { color: #94a3b8; }
    .root.theme-dark .device-row {
      background: #1a222d;
      border-color: #2a3544;
    }
    .root.theme-dark .device-row:hover {
      background: #243042;
      border-color: #475569;
    }
    .root.theme-dark .device-row[aria-current="true"] {
      background: #3b0764;
      border-color: #a78bfa;
      color: #f8fafc;
      box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.35);
    }
    .root.theme-dark .device-row[aria-current="true"]:hover { background: #4c1d95; }
    .root.theme-dark .device-row[aria-current="true"] .device-name { color: #f8fafc; }
    .root.theme-dark .device-row[aria-current="true"] .device-meta { color: #e9d5ff; }
    .root.theme-dark .device-row[aria-current="true"] .device-thumb {
      border-color: #f8fafc;
      background: #2e1065;
    }
    .root.theme-dark .device-row[aria-current="true"] .device-thumb::after { background: #f8fafc; }
    .panel[data-panel="settings"],
    .panel[data-panel="help"] {
      right: ${SIM_RAIL_PX}px;
      width: min(318px, calc(100vw - 120px));
      max-width: 318px;
      min-height: 0;
      max-height: min(72vh, 520px);
      padding: 14px;
      border-radius: 14px;
      gap: 10px;
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
    .panel[data-panel="help"]::after {
      content: '';
      position: absolute;
      right: -6px;
      top: var(--tbx-help-arrow-y, 50%);
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
    .panel[data-panel="compare-menu"] {
      right: 76px;
      width: min(318px, calc(100vw - 120px));
      max-width: 318px;
      max-height: min(72vh, 520px);
      padding: 14px;
      border-radius: 14px;
      gap: 10px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      height: auto;
    }
    .panel[data-panel="capture-result"] {
      right: 76px;
      width: min(340px, calc(100vw - 120px));
      max-width: 340px;
      max-height: min(72vh, 520px);
      padding: 14px;
      border-radius: 14px;
      gap: 10px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .panel[data-panel="shot-menu"]::after,
    .panel[data-panel="record-menu"]::after,
    .panel[data-panel="capture-result"]::after,
    .panel[data-panel="compare-menu"]::after {
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
    .record-status {
      margin: 0;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--tbx-panel-border);
      background: var(--tbx-input-bg);
      font-size: 12px;
      font-weight: 600;
      color: var(--tbx-accent);
      text-align: center;
    }
    .record-status[data-phase="countdown"] { animation: tbx-pulse 1s ease-in-out infinite; }
    @keyframes tbx-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.65; }
    }
    .panel[data-panel="capture-result"] img {
      width: 100%; max-height: 46vh; object-fit: contain;
      border-radius: 10px; background: #0b0f14; border: 1px solid var(--tbx-panel-border);
    }
    .menu-options { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    .capture-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .capture-actions .menu-option { flex: 1 1 auto; justify-content: center; align-items: center; min-height: 44px; }
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
    .setting-list { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .setting-section { margin: 4px 0 0; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--tbx-panel-muted); }
    .theme-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0 2px; }
    .theme-opt {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      min-height: 40px; border-radius: 10px; border: 1px solid var(--tbx-input-border);
      background: var(--tbx-input-bg); color: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .theme-opt svg { width: 16px; height: 16px; flex-shrink: 0; }
    .theme-opt:hover { border-color: var(--tbx-accent); color: var(--tbx-accent); }
    .theme-opt:focus-visible { outline: 2px solid var(--tbx-accent); outline-offset: 2px; }
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
    .setting-switch input:focus-visible + .switch-track { outline: 2px solid var(--tbx-accent); outline-offset: 2px; }
    .panel input {
      width: 100%; height: 36px; padding: 0 12px; border-radius: 10px;
      border: 1px solid var(--tbx-input-border); font-size: 13px; background: var(--tbx-input-bg); color: inherit;
    }
    .panel input:focus { outline: 2px solid var(--tbx-accent); border-color: var(--tbx-accent); }
    .panel-list { overflow: auto; flex: 1; display: flex; flex-direction: column; gap: 2px; min-height: 0; }
    .setting-row {
      display: flex; align-items: center;
      width: 100%; border: 0; border-radius: 10px;
      background: transparent; text-align: left; cursor: pointer; color: inherit;
    }
    .setting-row:hover { background: var(--tbx-row-hover); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      border: 1px solid var(--tbx-input-border); background: var(--tbx-input-bg); border-radius: 999px;
      padding: 4px 10px; font-size: 11px; cursor: pointer; color: inherit;
      white-space: nowrap;
    }
    .chip:hover { border-color: var(--tbx-accent); color: var(--tbx-accent); }
    .chip[aria-pressed="true"] { background: var(--tbx-accent); color: #fff; border-color: var(--tbx-accent); }
    .preview-loading {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: #f8fafc;
      color: #64748b;
      font-size: 12px;
      font-weight: 500;
    }
    .preview-loading[data-active='true'] { display: flex; }
    .preview-loading-spin {
      width: 22px;
      height: 22px;
      border: 2px solid #cbd5e1;
      border-top-color: var(--tbx-accent);
      border-radius: 999px;
      animation: tbx-sim-spin 0.75s linear infinite;
    }
    @keyframes tbx-sim-spin { to { transform: rotate(360deg); } }
    .blocked {
      position: absolute; inset: 0; z-index: 5;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 16px; text-align: center;
      background: #f4f4f5; color: #52525b; font-size: 12px;
    }
    .blocked a { color: #4f46e5; }
    .sim-pane.landscape .island { top: 50%; left: 12px; transform: translateY(-50%); width: 14px; height: 32%; }
    .sim-pane.landscape .notch { top: 50%; left: 0; transform: translateY(-50%); width: 16px; height: 22%; border-radius: 0 16px 16px 0; }
    .sim-pane.landscape .punch { top: 50%; left: 10px; transform: translateY(-50%); }
    .sim-pane.landscape .home { bottom: auto; left: auto; right: 8px; top: 50%; transform: translateY(-50%); width: 5px; height: 22%; }
    .sim-pane.landscape .safari { display: none; }
    .sim-pane.landscape .status { padding: 0 16px; height: 28px; }
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

  const paneRailHtml = () => `
        <div class="actions">
          <div class="actions-primary">
            <button type="button" class="rail-btn" data-act="close" aria-label="Close simulator"><span class="rail-tip">Close simulator</span>${railClose}</button>
            <button type="button" class="rail-btn" data-act="devices" aria-label="Change device"><span class="rail-tip">Change device</span>${railDevices}</button>
            <button type="button" class="rail-btn" data-act="settings" aria-label="Settings"><span class="rail-tip">Configuration</span>${railSettings}</button>
          </div>
          <div class="actions-scroll">
            <button type="button" class="rail-btn" data-act="rotate" aria-label="Rotate"><span class="rail-tip">Change orientation</span>${railRotate}</button>
            <button type="button" class="rail-btn" data-act="reload" aria-label="Reload"><span class="rail-tip">Reload page</span>${railReload}</button>
            <button type="button" class="rail-btn" data-act="screenshot" aria-label="Screenshot"><span class="rail-tip">Take a screenshot</span>${railScreenshot}</button>
            <button type="button" class="rail-btn" data-act="record" aria-label="Start recording"><span class="rail-tip">Record video</span>${railVideo}</button>
            <button type="button" class="rail-btn" data-act="compare" aria-label="Compare devices"><span class="rail-tip">Compare devices</span>${railCompare}</button>
            <button type="button" class="rail-btn" data-act="help" aria-label="Help center"><span class="rail-tip">Help center</span>${railHelp}</button>
            <button type="button" class="rail-btn" data-act="expand" aria-label="Open full simulator"><span class="rail-tip">Open full simulator</span>${railLaunch}</button>
          </div>
        </div>`

  const deviceStageHtml = (pane: '0' | '1', caption: string, hidden: boolean) => `
      <section class="sim-pane${pane === '0' ? ' is-focus' : ''}" data-pane="${pane}" ${hidden ? 'hidden' : ''}>
        <p class="pane-caption">${caption}</p>
        <div class="phone-wrap">
          <div class="phone-inner">
          <img class="mockup-img" alt="" hidden />
          <span class="side" style="top:16%;left:-3px;height:7%;border-radius:1px 0 0 1px;"></span>
          <span class="side" style="top:26%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
          <span class="side" style="top:39%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
          <span class="side" style="top:22%;right:-3px;height:14%;border-radius:0 1px 1px 0;"></span>
          <div class="chassis">
            <div class="screen">
              <div class="viewport">
                <iframe title="${escapeHtml(config.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
                <div class="preview-loading" data-preview-loading aria-hidden="true">
                  <span class="preview-loading-spin" aria-hidden="true"></span>
                  <span>Loading…</span>
                </div>
                <div class="status" aria-hidden="true">
                  <span class="clock"></span>
                  <span class="status-icons">${iconSignal}${iconWifi}${iconBattery}</span>
                </div>
                <div class="cutout"></div>
                <div class="home" hidden></div>
                <div class="blocked">This site blocked the in-page preview.<br/><a class="studio-link" target="_blank" rel="noopener noreferrer">Open full simulator</a></div>
              </div>
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
            </div>
          </div>
          </div>
        </div>
      </section>`

  root.innerHTML = `
    <div class="stage">
      ${deviceStageHtml('0', 'Left', false)}
      ${deviceStageHtml('1', 'Right', true)}
    </div>
    <div class="panel device-picker" data-panel="devices" role="dialog" aria-label="Choose device">
      <div class="device-sidebar" data-kind-tabs role="tablist" aria-label="Device categories"></div>
      <div class="device-main">
        <div class="device-panel-head">
          <h2 data-device-panel-title>Change device or compare</h2>
          <div class="device-current">
            <span class="device-current-thumb device-thumb" data-current-device-thumb data-kind="phone" aria-hidden="true"></span>
            <div>
              <p class="device-current-label" data-current-device-side>Current device</p>
              <p class="device-current-name" data-current-device-name>${escapeHtml(config.label)}</p>
            </div>
          </div>
          <div class="device-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" class="device-search" placeholder="Search devices" aria-label="Search devices" />
          </div>
        </div>
        <div class="panel-list" data-device-list></div>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="settings" role="dialog" aria-label="Simulator settings">
      <div class="popover-head">
        ${iconSettings}
        <h2>Configuration</h2>
      </div>
      <div class="setting-list">
        <div class="setting-card">
          <p class="setting-section">Appearance</p>
          <div class="theme-pick" role="group" aria-label="Simulator theme">
            <button type="button" class="theme-opt" data-theme="classic" aria-pressed="${config.ui.theme !== 'dark'}">
              ${iconSun}
              Light
            </button>
            <button type="button" class="theme-opt" data-theme="dark" aria-pressed="${config.ui.theme === 'dark'}">
              ${iconMoon}
              Dark
            </button>
          </div>
        </div>
        <div class="setting-card">
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
        </div>
        <div class="setting-card">
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
        </div>
        <p class="capture-hint">These options also apply in the full simulator studio.</p>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="shot-menu">
      <div class="popover-head">
        ${iconCamera}
        <h2>Take a screenshot</h2>
      </div>
      <p class="capture-hint">Choose how to export the capture from this tab.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-shot="simulator">
          <span class="menu-option-icon">${iconShotDevice}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Capture with the device</span>
            <span class="menu-option-desc">Frame, status bar, and on-screen chrome</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-shot="viewport">
          <span class="menu-option-icon">${iconShotTab}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Capture the entire tab</span>
            <span class="menu-option-desc">Everything visible in this browser tab</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="record-menu">
      <div class="popover-head">
        ${iconVideo}
        <h2>Record a screen video</h2>
      </div>
      <div data-record-idle>
        <p class="capture-hint">Record the simulator and page together in this tab.</p>
        <div class="menu-options">
          <button type="button" class="menu-option" data-record="tab">
            <span class="menu-option-icon">${iconRecordTab}</span>
            <span class="menu-option-copy">
              <span class="menu-option-title">Record this browser tab</span>
              <span class="menu-option-desc">Uses your recorder countdown before capture starts</span>
            </span>
          </button>
        </div>
      </div>
      <div data-record-active hidden>
        <p class="record-status" data-record-status data-phase="idle">Preparing…</p>
        <div class="menu-options">
          <button type="button" class="menu-option" data-record="stop">
            <span class="menu-option-icon">${iconRecordStop}</span>
            <span class="menu-option-copy">
              <span class="menu-option-title">Stop recording</span>
              <span class="menu-option-desc">End capture and open the saved video</span>
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="compare-menu">
      <div class="popover-head">
        ${railCompare}
        <h2>Compare devices</h2>
      </div>
      <p class="capture-hint">Split this tab into two matching simulators, or open the full studio grid.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-compare="split">
          <span class="menu-option-icon">${iconCompareGrid}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Split this tab</span>
            <span class="menu-option-desc">Same UI left and right — pick a second device</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-compare="studio">
          <span class="menu-option-icon">${railLaunch}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Open studio comparison</span>
            <span class="menu-option-desc">Multi-device grid in the full simulator</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="capture-result">
      <div class="popover-head">
        ${iconCamera}
        <h2 data-capture-title>Screenshot ready</h2>
      </div>
      <div class="capture-result-body">
        <img data-capture-preview alt="Screenshot preview" />
        <p class="capture-hint">Right-click the image to copy or save it in large format.</p>
        <div class="capture-actions">
          <button type="button" class="menu-option" data-capture-download>
            <span class="menu-option-title">Download again</span>
          </button>
          <button type="button" class="menu-option" data-capture-close>
            <span class="menu-option-title">Close</span>
          </button>
        </div>
      </div>
    </div>
    <div class="panel rail-popover help-center" data-panel="help">
      <div class="popover-head">
        ${railHelp}
        <h2>Help center</h2>
      </div>
      <p class="capture-hint">One Panel Mobile Simulator — tips for this page.</p>
      <p class="help-section-title">Tips</p>
      <ul class="help-list">
        <li>Scroll inside the device preview with your mouse wheel or trackpad.</li>
        <li>Use <strong>Rotate</strong> to check landscape layouts and safe areas.</li>
        <li>Use <strong>Compare devices</strong> to split this tab — same simulator left and right, then pick a second phone.</li>
        <li>Switch <strong>Light</strong> or <strong>Dark</strong> in Configuration for the simulator canvas. The site inside the phone stays as the page designed it.</li>
        <li>Sites that block embedding show a blank screen — use <strong>Open full simulator</strong> or live tab emulation in Studio.</li>
        <li>Screenshots capture the device frame; tab capture includes the whole page behind the overlay.</li>
      </ul>
      <p class="help-section-title">Support</p>
      <ul class="help-list">
        <li><button type="button" class="help-link" data-act="report-bug">Report a bug</button></li>
        <li><a class="studio-link help-link" href="#">Open full responsive studio</a></li>
      </ul>
    </div>
    ${paneRailHtml()}
  `
  shadow.append(root)

  type PaneEls = {
    pane: HTMLElement
    wrap: HTMLElement
    inner: HTMLElement
    chassis: HTMLElement
    screen: HTMLElement
    iframe: HTMLIFrameElement
    mockupImg: HTMLImageElement
    cutout: HTMLElement
    safari: HTMLElement
    home: HTMLElement
    status: HTMLElement
    hostLabel: HTMLElement
    blocked: HTMLElement
    previewLoading: HTMLElement
  }

  const paneEls = (index: 0 | 1): PaneEls => {
    const pane = shadow.querySelector(`[data-pane="${index}"]`) as HTMLElement
    return {
      pane,
      wrap: pane.querySelector('.phone-wrap') as HTMLElement,
      inner: pane.querySelector('.phone-inner') as HTMLElement,
      chassis: pane.querySelector('.chassis') as HTMLElement,
      screen: pane.querySelector('.screen') as HTMLElement,
      iframe: pane.querySelector('iframe') as HTMLIFrameElement,
      mockupImg: pane.querySelector('.mockup-img') as HTMLImageElement,
      cutout: pane.querySelector('.cutout') as HTMLElement,
      safari: pane.querySelector('.safari') as HTMLElement,
      home: pane.querySelector('.home') as HTMLElement,
      status: pane.querySelector('.status') as HTMLElement,
      hostLabel: pane.querySelector('.host') as HTMLElement,
      blocked: pane.querySelector('.blocked') as HTMLElement,
      previewLoading: pane.querySelector('[data-preview-loading]') as HTMLElement,
    }
  }

  const left = paneEls(0)
  const right = paneEls(1)
  const iframe = left.iframe
  const stage = shadow.querySelector('.stage') as HTMLElement

  left.hostLabel.textContent = config.hostname
  let previewLoads = 0
  const setPreviewLoading = (els: PaneEls, active: boolean) => {
    els.previewLoading.dataset.active = active ? 'true' : 'false'
    els.previewLoading.setAttribute('aria-hidden', active ? 'false' : 'true')
  }
  const beginPreviewLoad = (els: PaneEls) => {
    previewLoads += 1
    setPreviewLoading(els, true)
  }
  const endPreviewLoad = (els: PaneEls) => {
    previewLoads = Math.max(0, previewLoads - 1)
    setPreviewLoading(els, previewLoads === 0 ? false : els.previewLoading.dataset.active === 'true')
    if (previewLoads === 0) {
      setPreviewLoading(left, false)
      setPreviewLoading(right, false)
    }
  }
  const setPanePreviewUrl = (els: PaneEls, url: string) => {
    if (els.iframe.getAttribute('src') === url) return
    beginPreviewLoad(els)
    els.blocked.style.display = 'none'
    els.iframe.src = url
  }
  const setPreviewUrl = (url: string) => {
    setPanePreviewUrl(left, url)
    if (state.split) setPanePreviewUrl(right, url)
  }
  beginPreviewLoad(left)
  iframe.src = config.url
  for (const link of shadow.querySelectorAll<HTMLAnchorElement>('.studio-link')) {
    link.href = config.studioUrl
  }

  const tick = () => {
    const label = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    for (const el of shadow.querySelectorAll('.clock')) el.textContent = label
  }
  tick()
  const clockId = window.setInterval(tick, 30_000)

  type DeviceRow = {
    id: string
    label: string
    kind: string
    manufacturer: string
    width: number
    height: number
    thumbUrl?: string
  }
  type DeviceList = { devices: DeviceRow[]; favorites: string[]; recents: string[]; current: string }
  let catalog: DeviceList = { devices: [], favorites: [], recents: [], current: config.deviceId }
  let kindFilter = 'phone'
  const searchInput = shadow.querySelector('.device-search') as HTMLInputElement
  const kindTabs = shadow.querySelector('[data-kind-tabs]') as HTMLElement
  const deviceList = shadow.querySelector('[data-device-list]') as HTMLElement
  let activeRail = shadow.querySelector('.actions') as HTMLElement
  const railControl = (act: string) =>
    (activeRail.querySelector(`[data-act="${act}"]`) as HTMLButtonElement) ??
    (shadow.querySelector(`.actions [data-act="${act}"]`) as HTMLButtonElement)
  const setRailPressed = (act: string, pressed: boolean) => {
    for (const btn of shadow.querySelectorAll(`.actions [data-act="${act}"]`)) {
      btn.setAttribute('aria-pressed', String(pressed))
    }
  }
  const shotPanel = shadow.querySelector('[data-panel="shot-menu"]') as HTMLElement
  const recordPanel = shadow.querySelector('[data-panel="record-menu"]') as HTMLElement
  const capturePanel = shadow.querySelector('[data-panel="capture-result"]') as HTMLElement
  const settingsPanel = shadow.querySelector('[data-panel="settings"]') as HTMLElement
  const comparePanel = shadow.querySelector('[data-panel="compare-menu"]') as HTMLElement
  const helpPanel = shadow.querySelector('[data-panel="help"]') as HTMLElement
  const recordIdle = recordPanel.querySelector('[data-record-idle]') as HTMLElement
  const recordActive = recordPanel.querySelector('[data-record-active]') as HTMLElement
  const recordStatus = recordPanel.querySelector('[data-record-status]') as HTMLElement

  type RecorderSessionLite = {
    phase: string
    countdownUntil?: number
  }

  const syncRecordUi = async () => {
    const res = await ask<{ session: RecorderSessionLite | null }>({ type: 'RECORDER_STATUS' })
    const session = res?.session ?? null
    const active =
      Boolean(session) &&
      (session!.phase === 'pending' ||
        session!.phase === 'recording' ||
        session!.phase === 'paused' ||
        session!.phase === 'stopping')
    recordIdle.hidden = active
    recordActive.hidden = !active
    setRailPressed('record', active || state.panel === 'record-menu')
    if (!active) {
      recordStatus.textContent = ''
      recordStatus.dataset.phase = 'idle'
      return
    }
    const countdownLeft =
      session?.countdownUntil && session.countdownUntil > Date.now()
        ? Math.ceil((session.countdownUntil - Date.now()) / 1000)
        : 0
    if (countdownLeft > 0) {
      recordStatus.textContent = `Recording starts in ${countdownLeft}s…`
      recordStatus.dataset.phase = 'countdown'
      return
    }
    if (session?.phase === 'stopping') {
      recordStatus.textContent = 'Saving recording…'
      recordStatus.dataset.phase = 'recording'
      return
    }
    recordStatus.textContent = session?.phase === 'paused' ? 'Recording paused' : 'Recording in progress…'
    recordStatus.dataset.phase = 'recording'
  }

  const startRecordSync = () => {
    window.clearInterval(state.recordSyncId)
    void syncRecordUi()
    state.recordSyncId = window.setInterval(() => void syncRecordUi(), 400)
  }

  const stopRecordSync = () => {
    window.clearInterval(state.recordSyncId)
    state.recordSyncId = 0
  }
  const currentDeviceName = shadow.querySelector('[data-current-device-name]') as HTMLElement
  const currentDeviceThumb = shadow.querySelector('[data-current-device-thumb]') as HTMLElement
  const currentDeviceSide = shadow.querySelector('[data-current-device-side]') as HTMLElement
  const devicePanelTitle = shadow.querySelector('[data-device-panel-title]') as HTMLElement

  const focusedLive = () =>
    state.split && state.focusPane === 1 && state.compare ? state.compare : state.live

  const setFocusPane = (index: 0 | 1) => {
    state.focusPane = index
    left.pane.classList.toggle('is-focus', index === 0)
    right.pane.classList.toggle('is-focus', index === 1)
    syncCurrentDevice()
    if (state.panel === 'devices') renderDevices()
  }

  let renderDevices: () => void = () => {}

  const syncCurrentDevice = () => {
    const live = focusedLive()
    currentDeviceName.textContent = live.label
    if (currentDeviceSide) {
      currentDeviceSide.textContent = state.split
        ? state.focusPane === 1
          ? 'Right device'
          : 'Left device'
        : 'Current device'
    }
    if (devicePanelTitle) {
      devicePanelTitle.textContent = state.split ? 'Choose device for this side' : 'Change device or compare'
    }
    const fromCatalog = catalog.devices.find((d) => d.id === live.deviceId)
    currentDeviceThumb.dataset.kind = fromCatalog?.kind ?? 'phone'
  }

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

  const paintPaneFinish = (els: PaneEls, next: SimulatorOverlayConfig) => {
    els.pane.style.setProperty('--tbx-fill', next.finish.fill)
    els.pane.style.setProperty('--tbx-ring', next.finish.ring)
    els.pane.style.setProperty('--tbx-button', next.finish.button)
    els.iframe.title = next.label
    els.hostLabel.textContent = next.hostname
  }

  const paintFinish = (next: SimulatorOverlayConfig) => {
    root.style.setProperty('--tbx-fill', next.finish.fill)
    root.style.setProperty('--tbx-ring', next.finish.ring)
    root.style.setProperty('--tbx-button', next.finish.button)
    root.setAttribute('aria-label', `${next.label} mobile simulator`)
    paintPaneFinish(left, next)
    if (state.compare) paintPaneFinish(right, state.compare)
    for (const link of shadow.querySelectorAll<HTMLAnchorElement>('.studio-link')) {
      link.href = next.studioUrl
    }
  }

  type OverlaySettings = SimulatorOverlayUiSettings

  const syncSettingsUi = () => {
    const ui = state.ui
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
    for (const btn of shadow.querySelectorAll<HTMLButtonElement>('[data-theme]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.theme === ui.theme))
    }
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
      setPreviewUrl(state.live.url)
    }
  }

  const devicesPanel = shadow.querySelector('[data-panel="devices"]') as HTMLElement

  /** Vertically centered beside the rail that opened it. */
  const positionCenteredRailPopover = (
    panel: HTMLElement,
    btn: HTMLElement,
    arrowVar: string,
    maxHeight: number,
  ) => {
    if (!panel.classList.contains('open')) return
    const rootRect = root.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const arrowY = btnRect.top - rootRect.top + btnRect.height / 2
    const fromRight = Math.max(12, rootRect.right - btnRect.left + 10)
    panel.style.setProperty(arrowVar, `${arrowY}px`)
    panel.style.right = `${fromRight}px`
    panel.style.left = 'auto'
    panel.style.top = '50%'
    panel.style.transform = 'translateY(-50%)'
    panel.style.maxHeight = `${maxHeight}px`
    panel.style.height = ''
  }

  /** Wheel on page is suppressed while the overlay is open; keep scroll inside popover rails. */
  const bindOverlayWheelScroll = (el: HTMLElement) => {
    el.addEventListener(
      'wheel',
      (event) => {
        event.stopPropagation()
        const canScroll = el.scrollHeight > el.clientHeight + 1
        if (!canScroll) {
          event.preventDefault()
          return
        }
        const atTop = el.scrollTop <= 0
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
        const delta = event.deltaY
        if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
          event.preventDefault()
          return
        }
        const nextTop = el.scrollTop + delta
        if (nextTop !== el.scrollTop) {
          el.scrollTop = nextTop
          event.preventDefault()
        }
      },
      { passive: false },
    )
  }

  const positionDevicesPanel = () => {
    if (!devicesPanel.classList.contains('open')) return
    const pickerWidth = overlayPickerWidth(window.innerWidth)
    const maxH = Math.min(Math.round(window.innerHeight * 0.88), 820)
    const rootRect = root.getBoundingClientRect()
    const btnRect = railControl('devices').getBoundingClientRect()
    const arrowY = btnRect.top - rootRect.top + btnRect.height / 2
    const fromRight = Math.max(12, rootRect.right - btnRect.left + 10)
    devicesPanel.style.setProperty('--tbx-device-arrow-y', `${arrowY}px`)
    devicesPanel.style.right = `${fromRight}px`
    devicesPanel.style.left = 'auto'
    devicesPanel.style.top = '50%'
    devicesPanel.style.transform = 'translateY(-50%)'
    devicesPanel.style.width = `${pickerWidth}px`
    devicesPanel.style.height = `${maxH}px`
    devicesPanel.style.maxHeight = `${maxH}px`
  }

  const positionCapturePanels = () => {
    const capMax = Math.min(window.innerHeight * 0.72, 520)
    if (state.panel === 'shot-menu') positionCenteredRailPopover(shotPanel, railControl('screenshot'), '--tbx-rail-arrow-y', capMax)
    if (state.panel === 'record-menu') positionCenteredRailPopover(recordPanel, railControl('record'), '--tbx-rail-arrow-y', capMax)
    if (state.panel === 'capture-result') positionCenteredRailPopover(capturePanel, railControl('screenshot'), '--tbx-rail-arrow-y', capMax)
    if (state.panel === 'compare-menu') positionCenteredRailPopover(comparePanel, railControl('compare'), '--tbx-rail-arrow-y', capMax)
    if (state.panel === 'help') positionCenteredRailPopover(helpPanel, railControl('help'), '--tbx-help-arrow-y', capMax)
  }

  const positionSettingsPanel = () => {
    positionCenteredRailPopover(
      settingsPanel,
      railControl('settings'),
      '--tbx-settings-arrow-y',
      Math.min(window.innerHeight * 0.72, 520),
    )
  }

  const layoutPane = (
    els: PaneEls,
    live: SimulatorOverlayConfig,
    rotated: boolean,
    box: ReturnType<typeof overlayStageBox>,
  ) => {
    const width = rotated ? live.height : live.width
    const height = rotated ? live.width : live.height
    const mockup = live.mockupUrl && live.mockupInsets ? live.mockupInsets : null
    const insets: OverlayInsets | null = mockup
      ? rotated
        ? { left: mockup.bottom, top: mockup.left, right: mockup.top, bottom: mockup.right }
        : mockup
      : null
    const outer = overlayOuterSize({ width, height }, insets)
    const scale = overlayFitScale(outer, box)
    els.pane.classList.toggle('has-mockup', Boolean(mockup))
    els.chassis.classList.toggle('landscape', rotated)
    els.pane.classList.toggle('landscape', rotated)
    els.pane.style.setProperty('--tbx-fill', live.finish.fill)
    els.pane.style.setProperty('--tbx-ring', live.finish.ring)
    els.pane.style.setProperty('--tbx-button', live.finish.button)
    els.inner.style.width = `${outer.width}px`
    els.inner.style.height = `${outer.height}px`
    els.inner.style.transform = `scale(${scale})`
    els.wrap.style.width = `${Math.round(outer.width * scale)}px`
    els.wrap.style.height = `${Math.round(outer.height * scale)}px`
    if (insets) {
      const holeW = 1 - insets.left - insets.right
      const holeH = 1 - insets.top - insets.bottom
      els.screen.style.width = `${holeW * 100}%`
      els.screen.style.height = `${holeH * 100}%`
      els.screen.style.left = `${insets.left * 100}%`
      els.screen.style.top = `${insets.top * 100}%`
      els.mockupImg.hidden = false
      els.mockupImg.src = live.mockupUrl ?? ''
      els.pane.style.setProperty('--tbx-mockup-w', `${outer.width}px`)
      els.pane.style.setProperty('--tbx-mockup-h', `${outer.height}px`)
    } else {
      els.screen.style.left = ''
      els.screen.style.top = ''
      els.screen.style.width = `${width}px`
      els.screen.style.height = `${height}px`
      els.mockupImg.hidden = true
      els.mockupImg.removeAttribute('src')
    }
    const chrome = overlayPreviewChrome({
      hasMockup: Boolean(mockup),
      rotated,
      showStatusBar: state.ui.showStatusBar,
      statusBar: live.statusBar,
      showSafari: live.showSafari,
    })
    const layoutSize = overlayIframeLayoutSize({ width, height })
    const notchClass = live.notch === 'punch-hole' ? 'punch' : live.notch
    els.cutout.className = !mockup && live.notch !== 'none' ? `cutout ${notchClass}` : 'cutout'
    els.safari.hidden = !chrome.showSafari
    els.screen.classList.toggle('safari-visible', chrome.showSafari)
    els.home.hidden = !overlayHomeIndicatorVisible(state.ui.showNavBar, live.navBar, rotated)
    els.status.style.display = chrome.decorStatus ? '' : 'none'
    els.status.dataset.bar = live.statusBar === 'android' ? 'android' : 'ios'
    els.iframe.setAttribute('width', String(layoutSize.width))
    els.iframe.setAttribute('height', String(layoutSize.height))
    els.iframe.title = live.label
    els.hostLabel.textContent = live.hostname
  }

  const layout = () => {
    const panes = state.split && state.compare ? 2 : 1
    const box = overlayStageBox({ width: window.innerWidth, height: window.innerHeight }, { panes })
    root.classList.toggle('is-split', panes === 2)
    root.classList.toggle('has-mockup', Boolean(state.live.mockupUrl && state.live.mockupInsets))
    root.classList.toggle('landscape', state.rotated)
    stage.style.paddingRight = `${box.paddingRight}px`
    layoutPane(left, state.live, state.rotated, box)
    if (panes === 2 && state.compare) {
      right.pane.hidden = false
      layoutPane(right, state.compare, state.rotatedCompare, box)
    } else {
      right.pane.hidden = true
    }
    syncSettingsUi()
    positionDevicesPanel()
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
    if (device.id === focusedLive().deviceId) button.setAttribute('aria-current', 'true')
    const thumb = `<span class="device-thumb" data-kind="${escapeHtml(device.kind)}" aria-hidden="true"></span>`
    button.innerHTML = `
      ${thumb}
      <span class="device-copy">
        <span class="device-name">${escapeHtml(device.label)}</span>
        <span class="device-meta">${device.width}×${device.height}</span>
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
        button.innerHTML = `<span class="kind-icon-plate">${kindGlyph(tab.id)}</span><span>${tab.label}</span><span class="kind-count">${count}</span>`
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

  renderDevices = () => {
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
    syncCurrentDevice()
    requestAnimationFrame(() => {
      positionDevicesPanel()
    })
  }

  const capturePreview = shadow.querySelector('[data-capture-preview]') as HTMLImageElement
  const captureTitle = shadow.querySelector('[data-capture-title]') as HTMLElement

  const setPanel = (name: typeof state.panel, forceOpen = false) => {
    state.panel = forceOpen ? name : state.panel === name ? '' : name
    for (const panel of shadow.querySelectorAll('[data-panel]')) {
      panel.classList.toggle('open', panel.getAttribute('data-panel') === state.panel)
    }
    setRailPressed('devices', state.panel === 'devices')
    setRailPressed('settings', state.panel === 'settings')
    setRailPressed('compare', state.split || state.panel === 'compare-menu')
    setRailPressed('help', state.panel === 'help')
    layout()
    if (state.panel === 'devices') {
      void loadDevices()
      requestAnimationFrame(() => {
      positionDevicesPanel()
    })
    } else if (state.panel === 'settings') {
      void loadOverlaySettings()
      requestAnimationFrame(() => {
        positionSettingsPanel()
        requestAnimationFrame(() => positionSettingsPanel())
      })
    } else if (state.panel === 'help') {
      requestAnimationFrame(() => positionCapturePanels())
    } else if (state.panel === 'record-menu') {
      startRecordSync()
      requestAnimationFrame(() => positionCapturePanels())
    } else if (
      state.panel === 'shot-menu' ||
      state.panel === 'capture-result' ||
      state.panel === 'compare-menu'
    ) {
      stopRecordSync()
      requestAnimationFrame(() => positionCapturePanels())
    } else {
      stopRecordSync()
    }
    setRailPressed('screenshot', state.panel === 'shot-menu' || state.panel === 'capture-result')
    setRailPressed('record', state.panel === 'record-menu')
    if (state.panel !== 'record-menu') void syncRecordUi()
  }

  const showCaptureResult = (dataUrl: string, filename: string, kind: 'simulator' | 'viewport') => {
    state.lastCaptureUrl = dataUrl
    state.lastCaptureName = filename
    capturePreview.src = dataUrl
    captureTitle.textContent = kind === 'simulator' ? 'Capture with the device' : 'Capture the entire tab'
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
    const targetRight = state.split && state.focusPane === 1
    if (targetRight) {
      state.compare = next
      state.rotatedCompare = false
      paintPaneFinish(right, next)
      if (right.iframe.getAttribute('src') !== next.url) setPanePreviewUrl(right, next.url)
    } else {
      state.live = next
      state.ui = next.ui
      state.rotated = false
      applyTheme(next.ui.theme)
      paintFinish(next)
      if (iframe.getAttribute('src') !== next.url) setPanePreviewUrl(left, next.url)
    }
    layout()
    if (state.panel === 'devices') renderDevices()
    syncCurrentDevice()
  }
  host.__tbxSimApply = apply
  paintFinish(config)
  syncSettingsUi()
  syncCurrentDevice()
  layout()

  const bindPreviewLoad = (els: PaneEls) => {
    els.iframe.addEventListener('load', () => {
      endPreviewLoad(els)
      try {
        const href = els.iframe.contentWindow?.location.href ?? ''
        if (href.startsWith('chrome-error:') || href.includes('chromewebdata')) {
          els.blocked.style.display = 'flex'
        }
      } catch {
        /* cross-origin success */
      }
    })
  }
  bindPreviewLoad(left)
  bindPreviewLoad(right)

  const onResize = () => layout()
  window.addEventListener('resize', onResize)

  const panePreviewUrl = (els: PaneEls, fallback: string) => {
    try {
      const href = els.iframe.contentWindow?.location.href
      if (href && !href.startsWith('about:')) return href
    } catch {
      /* cross-origin preview */
    }
    return els.iframe.src || fallback
  }

  const reloadPane = (els: PaneEls, fallbackUrl: string) => {
    els.blocked.style.display = 'none'
    beginPreviewLoad(els)
    try {
      els.iframe.contentWindow?.location.reload()
      return
    } catch {
      /* fall back below */
    }
    try {
      const url = new URL(panePreviewUrl(els, fallbackUrl))
      url.hash = `tbx-sim-reload=${++state.previewReload}`
      els.iframe.src = url.href
    } catch {
      state.previewReload += 1
      const base = fallbackUrl.split('#')[0]
      els.iframe.src = `${base}#tbx-sim-reload=${state.previewReload}`
    }
  }

  const reloadPreview = () => {
    reloadPane(left, state.live.url)
    if (state.split) reloadPane(right, state.compare?.url ?? state.live.url)
  }

  const enterSplit = () => {
    state.split = true
    state.compare = { ...state.live }
    state.rotatedCompare = state.rotated
    right.pane.hidden = false
    setPanePreviewUrl(right, state.live.url)
    setFocusPane(1)
    setRailPressed('compare', true)
    layout()
    setPanel('devices', true)
  }

  const exitSplit = () => {
    state.split = false
    state.compare = null
    state.rotatedCompare = false
    state.focusPane = 0
    right.pane.hidden = true
    left.pane.classList.add('is-focus')
    right.pane.classList.remove('is-focus')
    setRailPressed('compare', false)
    layout()
    syncCurrentDevice()
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
    stopRecordSync()
    document.removeEventListener('keydown', onKey, true)
    document.documentElement.style.overflow = previousOverflow
    host.remove()
  }
  host.__tbxSimDispose = dispose
  document.addEventListener('keydown', onKey, true)

  root.addEventListener(
    'click',
    (event) => {
    const btn = (event.target as HTMLElement | null)?.closest<HTMLElement>('.actions [data-act]')
    if (!btn || !root.contains(btn)) return
    const act = btn.dataset.act
    if (!act) return
    event.preventDefault()
    event.stopPropagation()
    const paneIndex = state.split ? state.focusPane : 0
    const rail = btn.closest('.actions')
    if (rail) activeRail = rail as HTMLElement
    const els = paneIndex === 1 ? right : left
    const liveUrl = paneIndex === 1 ? (state.compare?.url ?? state.live.url) : state.live.url
    if (act === 'close') {
      dispose()
      return
    }
    if (act === 'devices') {
      if (!(state.split && state.panel === 'devices')) setPanel('devices')
      return
    }
    if (act === 'settings') {
      setPanel('settings')
      return
    }
    if (act === 'help') {
      setPanel('help')
      return
    }
    if (act === 'rotate') {
      if (paneIndex === 1) state.rotatedCompare = !state.rotatedCompare
      else state.rotated = !state.rotated
      layout()
      return
    }
    if (act === 'reload') {
      event.preventDefault()
      event.stopPropagation()
      reloadPane(els, liveUrl)
      return
    }
    if (act === 'screenshot') {
      event.preventDefault()
      event.stopPropagation()
      if (state.panel === 'shot-menu' || state.panel === 'capture-result') setPanel('')
      else setPanel('shot-menu', true)
      return
    }
    if (act === 'record') {
      event.preventDefault()
      event.stopPropagation()
      if (state.panel === 'record-menu') setPanel('')
      else setPanel('record-menu', true)
      return
    }
    if (act === 'compare') {
      if (state.split) {
        exitSplit()
        setPanel('')
        return
      }
      setPanel('compare-menu')
      return
    }
    if (act === 'expand') {
      void ask({
        type: 'SIMULATOR_OVERLAY_ACTION',
        action: 'expand',
        url: liveUrl,
        deviceId: (paneIndex === 1 ? state.compare : state.live)?.deviceId ?? state.live.deviceId,
      })
    }
    },
    true,
  )
  shadow.querySelector('[data-act="report-bug"]')?.addEventListener('click', () => {
    try {
      const supportUrl = chrome.runtime.getURL('options.html#/support')
      window.open(supportUrl, '_blank', 'noopener')
    } catch {
      /* extension page unavailable */
    }
    setPanel('')
  })
  const settingsScroll = settingsPanel.querySelector('.setting-list') as HTMLElement
  bindOverlayWheelScroll(deviceList)
  bindOverlayWheelScroll(kindTabs)
  for (const railScroll of shadow.querySelectorAll<HTMLElement>('.actions-scroll')) {
    bindOverlayWheelScroll(railScroll)
  }
  bindOverlayWheelScroll(settingsScroll)

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
    if (!state.split) setPanel('')
  })
  shadow.querySelector('[data-panel="settings"]')?.addEventListener('click', (event) => {
    const theme = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-theme]')?.dataset.theme
    if (theme !== 'classic' && theme !== 'dark') return
    if (state.ui.theme === theme) return
    state.ui = { ...state.ui, theme }
    applyTheme(theme)
    syncSettingsUi()
    void patchOverlaySettings({ theme })
  })
  shadow.querySelector('[data-panel="settings"]')?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement
    if (input.tagName !== 'INPUT' || !input.dataset.set) return
    const key = input.dataset.set
    if (key === 'safari') {
      state.live = { ...state.live, showSafari: input.checked }
      if (state.compare) state.compare = { ...state.compare, showSafari: input.checked }
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
  shadow.querySelector('[data-panel="shot-menu"]')?.addEventListener('click', (event) => {
    const mode = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-shot]')?.dataset.shot
    if (mode === 'simulator' || mode === 'viewport') void runScreenshot(mode)
  })
  shadow.querySelector('[data-panel="record-menu"]')?.addEventListener('click', (event) => {
    const kind = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-record]')?.dataset.record
    if (kind === 'tab') {
      void ask({ type: 'SIMULATOR_OVERLAY_ACTION', action: 'record', url: state.live.url }).then(() => syncRecordUi())
      return
    }
    if (kind === 'stop') {
      void ask({ type: 'SIMULATOR_OVERLAY_ACTION', action: 'recordStop', url: state.live.url }).then(() => {
        void syncRecordUi()
        setPanel('')
      })
    }
  })
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'RECORDER_FINISHED' || message?.type === 'RECORDER_STARTED' || message?.type === 'RECORDER_COUNTDOWN_BEGIN') {
      void syncRecordUi()
    }
    return false
  })
  shadow.querySelector('[data-capture-download]')?.addEventListener('click', () => {
    if (!state.lastCaptureUrl) return
    const link = document.createElement('a')
    link.href = state.lastCaptureUrl
    link.download = state.lastCaptureName || 'simulator.png'
    link.click()
  })
  shadow.querySelector('[data-capture-close]')?.addEventListener('click', () => setPanel(''))
  left.pane.addEventListener('click', () => {
    if (state.split) setFocusPane(0)
  })
  right.pane.addEventListener('click', () => {
    if (state.split) setFocusPane(1)
  })
  shadow.querySelector('[data-panel="compare-menu"]')?.addEventListener('click', (event) => {
    const picked = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-compare]')
    if (!picked) return
    const mode = picked.dataset.compare
    setPanel('')
    if (mode === 'split') {
      enterSplit()
      return
    }
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
