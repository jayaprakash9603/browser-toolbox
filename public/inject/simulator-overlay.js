(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){let t=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let n=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),r=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>`,i=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>`,a=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>`,o=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,s=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,c=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,l={all:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,favorites:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.3 6.2 21l1.6-6.6L2 9.3l6.8-.5L12 2l3.2 6.8 6.8.5-5.8 5.1 1.6 6.6z"/></svg>`,recents:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,phone:a.replace(`width="16" height="16"`,``),tablet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></svg>`,laptop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="12" rx="1"/><path d="M2 19h20"/></svg>`,desktop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="1"/><path d="M8 22h8M12 18v4"/></svg>`,watch:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2h6M9 22h6"/></svg>`,special:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`},u=i.replace(`width="16" height="16"`,``),d=document.getElementById(t);if(d){if(e.replace&&d.__tbxSimApply)return d.__tbxSimApply(e),!0;if(d.__tbxSimDispose?.(),d.remove(),!e.replace)return!0}let f=document.createElement(`div`);f.id=t,f.setAttribute(`data-tbx-simulator`,`overlay`),f.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let p=f.attachShadow({mode:`open`}),ee=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let m={rotated:!1,live:e,ui:e.ui,panel:``,lastCaptureUrl:``,lastCaptureName:``,previewReload:0},te=document.createElement(`style`);te.textContent=`
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
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
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
    .panel.rail-popover {
      --tbx-panel-bg: #1a222d;
      --tbx-panel-border: #3a4659;
      --tbx-panel-muted: #94a3b8;
      --tbx-row-hover: #243041;
      --tbx-input-bg: #0f141c;
      --tbx-input-border: #3d4f63;
      --tbx-hint: #9aa8bb;
      --tbx-menu-bg: #232d3b;
      --tbx-menu-border: #3d4f63;
      background: var(--tbx-panel-bg);
      color: #e8edf4;
      box-shadow: 0 18px 46px rgba(0,0,0,0.45);
    }
    .panel.rail-popover::after {
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
    .popover-head h2 { margin: 0; font-size: 15px; font-weight: 700; flex: 1; }
    .popover-head svg { flex-shrink: 0; opacity: 0.95; color: #cbd5e1; }
    .panel.rail-popover .setting-card {
      border: 1px solid var(--tbx-panel-border);
      border-radius: 12px;
      padding: 10px 10px 8px;
      background: rgba(15,20,28,0.55);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .panel.rail-popover .setting-card .setting-section { margin-top: 0; color: #cbd5e1; }
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
      color: #e8edf4;
      min-width: 0;
    }
    .panel.rail-popover .theme-opt {
      background: #232d3b;
      border-color: #3d4f63;
      color: #e8edf4;
    }
    .panel.rail-popover .theme-opt:hover { border-color: #5eead4; color: #99f6e4; }
    .panel.rail-popover .theme-opt[aria-pressed="true"] {
      background: var(--tbx-accent);
      border-color: var(--tbx-accent);
      color: #fff;
    }
    .panel.rail-popover .switch-track { background: #3d4f63; }
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
      background: rgba(13,148,136,0.14);
      color: #5eead4;
    }
    .panel.device-picker .menu-option-icon { background: rgba(13,148,136,0.12); color: var(--tbx-accent); }
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
      background: #2563eb;
      border-color: #2563eb;
      box-shadow: 0 2px 10px rgba(37,99,235,0.35);
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
      box-shadow: 0 2px 8px rgba(13,148,136,0.35);
    }
    .kind-tab svg { width: 18px; height: 18px; flex-shrink: 0; }
    .kind-tab .kind-count { font-size: 8px; font-weight: 700; opacity: 0.85; tabular-nums; }
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
      padding: 6px 10px 12px;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
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
    .panel[data-panel="shot-menu"],
    .panel[data-panel="record-menu"],
    .panel[data-panel="capture-result"],
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
    .panel[data-panel="capture-result"] {
      width: min(340px, 44vw);
    }
    .panel[data-panel="capture-result"] img {
      width: 100%; max-height: 46vh; object-fit: contain;
      border-radius: 10px; background: #0b0f14; border: 1px solid var(--tbx-panel-border);
    }
    .menu-options { display: flex; flex-direction: column; gap: 8px; }
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
    .landscape .island { top: 50%; left: 12px; transform: translateY(-50%); width: 14px; height: 32%; }
    .landscape .notch { top: 50%; left: 0; transform: translateY(-50%); width: 16px; height: 22%; border-radius: 0 16px 16px 0; }
    .landscape .punch { top: 50%; left: 10px; transform: translateY(-50%); }
    .landscape .home { bottom: auto; left: auto; right: 8px; top: 50%; transform: translateY(-50%); width: 5px; height: 22%; }
    .landscape .safari { display: none; }
    .landscape .status { padding: 0 16px; height: 28px; }
  `,p.append(te);let h=document.createElement(`div`);h.className=`root`,h.setAttribute(`role`,`dialog`),h.setAttribute(`aria-modal`,`true`),h.setAttribute(`aria-label`,`${e.label} mobile simulator`),h.style.setProperty(`--tbx-fill`,e.finish.fill),h.style.setProperty(`--tbx-ring`,e.finish.ring),h.style.setProperty(`--tbx-button`,e.finish.button),h.classList.toggle(`theme-dark`,e.ui.theme===`dark`),h.classList.toggle(`theme-classic`,e.ui.theme!==`dark`),h.innerHTML=`
    <div class="stage">
      <div class="phone-wrap">
        <img class="mockup-img" alt="" hidden />
        <span class="side" style="top:16%;left:-3px;height:7%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:26%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:39%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:22%;right:-3px;height:14%;border-radius:0 1px 1px 0;"></span>
        <div class="chassis">
          <div class="screen">
            <iframe title="${n(e.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <div class="preview-loading" data-preview-loading aria-hidden="true">
              <span class="preview-loading-spin" aria-hidden="true"></span>
              <span>Loading…</span>
            </div>
            <div class="status" aria-hidden="true">
              <span class="clock"></span>
              <span class="status-icons"><svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="3" width="2" height="7" rx="0.5"/><rect x="12" y="1" width="2" height="9" rx="0.5" opacity="0.45"/></svg><svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.4 4.2a7 7 0 0 1 10.2 0"/><path d="M3.2 6a4.4 4.4 0 0 1 6.6 0"/><circle cx="6.5" cy="8.4" r="0.9" fill="currentColor" stroke="none"/></svg><svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.6" y="1.2" width="18" height="7.6" rx="1.6" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="2.6" width="13" height="4.8" rx="0.6" fill="currentColor"/><rect x="19.2" y="3.2" width="1.8" height="3.6" rx="0.6" fill="currentColor"/></svg></span>
            </div>
            <div class="cutout"></div>
            <div class="safari" hidden>
              <div class="url-pill">
                <span aria-hidden="true">AA</span>
                <span class="host"></span>
                ${r}
              </div>
              <div class="safari-tools" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${i}
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
    <div class="panel device-picker" data-panel="devices" role="dialog" aria-label="Choose device">
      <div class="device-sidebar" data-kind-tabs role="tablist" aria-label="Device categories"></div>
      <div class="device-main">
        <div class="device-panel-head">
          <h2>Change device or compare</h2>
          <div class="device-current">
            <span class="device-current-thumb device-thumb" data-current-device-thumb data-kind="phone" aria-hidden="true"></span>
            <div>
              <p class="device-current-label">Current device</p>
              <p class="device-current-name" data-current-device-name>${n(e.label)}</p>
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
        ${c}
        <h2>Configuration</h2>
      </div>
      <div class="setting-list">
        <div class="setting-card">
          <p class="setting-section">Display</p>
          <div class="theme-pick" role="group" aria-label="Simulator canvas theme">
            <button type="button" class="theme-opt" data-theme-opt="classic" aria-label="Classic light canvas">Classic</button>
            <button type="button" class="theme-opt" data-theme-opt="dark" aria-label="Dark canvas">Dark</button>
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
        ${o}
        <h2>Take a screenshot</h2>
      </div>
      <p class="capture-hint">Choose how to export the capture from this tab.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-shot="simulator">
          <span class="menu-option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Capture with the device</span>
            <span class="menu-option-desc">Frame, status bar, and on-screen chrome</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-shot="viewport">
          <span class="menu-option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg></span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Capture the entire tab</span>
            <span class="menu-option-desc">Everything visible in this browser tab</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="record-menu">
      <div class="popover-head">
        ${s}
        <h2>Record a screen video</h2>
      </div>
      <p class="capture-hint">Record the simulator and page together in this tab.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-record="tab">
          <span class="menu-option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg></span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Record this browser tab</span>
            <span class="menu-option-desc">Starts tab capture with the device visible</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="compare-menu">
      <div class="popover-head">
        ${i}
        <h2>Compare devices</h2>
      </div>
      <p class="capture-hint">Open comparison tools in the full simulator studio.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-compare="grid">
          <span class="menu-option-icon">${u}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Compare devices</span>
            <span class="menu-option-desc">Side-by-side device grid in studio</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-compare="visible">
          <span class="menu-option-icon">${u}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Visible devices in the tab</span>
            <span class="menu-option-desc">Multi-device layout for this preview</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="capture-result">
      <div class="popover-head">
        ${o}
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
    <div class="actions">
      <div class="actions-primary">
        <button type="button" class="round" data-act="close" aria-label="Close simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <button type="button" class="round" data-act="devices" aria-label="Change device">${a}</button>
        <button type="button" class="round" data-act="settings" aria-label="Settings">${c}</button>
      </div>
      <div class="actions-scroll">
        <button type="button" class="round" data-act="rotate" aria-label="Rotate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg></button>
        <button type="button" class="round" data-act="reload" aria-label="Reload">${r}</button>
        <button type="button" class="round" data-act="screenshot" aria-label="Screenshot">${o}</button>
        <button type="button" class="round" data-act="record" aria-label="Start recording">${s}</button>
        <button type="button" class="round" data-act="compare" aria-label="Compare devices">${i}</button>
        <button type="button" class="round" data-act="expand" aria-label="Open full simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
      </div>
    </div>
  `,p.append(h);let g=p.querySelector(`.screen`),_=p.querySelector(`iframe`),ne=p.querySelector(`.clock`),re=p.querySelector(`.cutout`),ie=p.querySelector(`.safari`),ae=p.querySelector(`.home`),oe=p.querySelector(`.android-nav`),v=p.querySelector(`.blocked`),y=p.querySelector(`[data-preview-loading]`),b=p.querySelector(`.host`),se=p.querySelector(`.chassis`),ce=p.querySelector(`.status`),x=p.querySelector(`.phone-wrap`),S=p.querySelector(`.mockup-img`);b.textContent=e.hostname;let C=0,w=e=>{y.dataset.active=e?`true`:`false`,y.setAttribute(`aria-hidden`,e?`false`:`true`)},T=()=>{C+=1,w(!0)},le=()=>{C=Math.max(0,C-1),C===0&&w(!1)},E=e=>{_.getAttribute(`src`)!==e&&(T(),v.style.display=`none`,_.src=e)};T(),_.src=e.url;for(let t of p.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let D=()=>{ne.textContent=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`})};D();let ue=window.setInterval(D,3e4),O={devices:[],favorites:[],recents:[],current:e.deviceId},k=`phone`,A=p.querySelector(`.device-search`),j=p.querySelector(`[data-kind-tabs]`),M=p.querySelector(`[data-device-list]`),N=p.querySelector(`[data-act="devices"]`),P=p.querySelector(`[data-act="screenshot"]`),F=p.querySelector(`[data-act="settings"]`),I=p.querySelector(`[data-act="compare"]`),L=p.querySelector(`[data-act="record"]`),de=p.querySelector(`[data-panel="shot-menu"]`),fe=p.querySelector(`[data-panel="record-menu"]`),pe=p.querySelector(`[data-panel="capture-result"]`),R=p.querySelector(`[data-panel="settings"]`),me=p.querySelector(`[data-panel="compare-menu"]`),he=p.querySelector(`[data-current-device-name]`),ge=p.querySelector(`[data-current-device-thumb]`),z=()=>{he.textContent=m.live.label;let e=O.devices.find(e=>e.id===m.live.deviceId);ge.dataset.kind=e?.kind??`phone`},B=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),V=e=>{h.classList.toggle(`theme-dark`,e===`dark`),h.classList.toggle(`theme-classic`,e!==`dark`)},H=e=>{h.style.setProperty(`--tbx-fill`,e.finish.fill),h.style.setProperty(`--tbx-ring`,e.finish.ring),h.style.setProperty(`--tbx-button`,e.finish.button),h.setAttribute(`aria-label`,`${e.label} mobile simulator`),_.title=e.label,b.textContent=e.hostname;for(let t of p.querySelectorAll(`.studio-link`))t.href=e.studioUrl},U=()=>{let e=m.ui;for(let t of p.querySelectorAll(`[data-theme-opt]`))t.setAttribute(`aria-pressed`,String(t.dataset.themeOpt===e.theme));let t=p.querySelector(`[data-set="safari"]`),n=p.querySelector(`[data-set="status"]`),r=p.querySelector(`[data-set="nav"]`),i=p.querySelector(`[data-set="mobile-ua"]`),a=p.querySelector(`[data-set="unblock"]`);t&&(t.checked=m.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock)},W=e=>{m.ui=e,V(e.theme),U(),X()},_e=async()=>{let e=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:m.live.url});e?.theme&&W(e)},G=async e=>{let t=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:m.live.deviceId,url:m.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;W(t),n&&E(m.live.url)},ve=p.querySelector(`[data-panel="devices"]`),ye=p.querySelector(`.actions-scroll`),K=(e,t,n,r,i={})=>{if(!e.classList.contains(`open`))return;let a=h.getBoundingClientRect(),o=t.getBoundingClientRect(),s=o.top-a.top+o.height/2;if(e.style.setProperty(n,`${s}px`),e.style.right=`76px`,e.style.top=`50%`,e.style.transform=`translateY(-50%)`,e.style.maxHeight=`${r}px`,i.lockHeight){let t=Math.min(e.getBoundingClientRect().height||r,r);e.style.height=`${t}px`}else e.style.height=``},be=(e,t,n,r)=>{K(e,t,n,r,{lockHeight:!0})},q=e=>{e.addEventListener(`wheel`,t=>{if(t.stopPropagation(),!(e.scrollHeight>e.clientHeight+1)){t.preventDefault();return}let n=e.scrollTop<=0,r=e.scrollTop+e.clientHeight>=e.scrollHeight-1,i=t.deltaY;if(i<0&&n||i>0&&r){t.preventDefault();return}let a=e.scrollTop+i;a!==e.scrollTop&&(e.scrollTop=a,t.preventDefault())},{passive:!1})},J=()=>{be(ve,N,`--tbx-device-arrow-y`,Math.min(window.innerHeight*.78,640))},xe=()=>{let e=Math.min(window.innerHeight*.72,520);m.panel===`shot-menu`&&K(de,P,`--tbx-rail-arrow-y`,e),m.panel===`record-menu`&&K(fe,L,`--tbx-rail-arrow-y`,e),m.panel===`capture-result`&&K(pe,P,`--tbx-rail-arrow-y`,e),m.panel===`compare-menu`&&K(me,I,`--tbx-rail-arrow-y`,e)},Y=()=>{K(R,F,`--tbx-settings-arrow-y`,Math.min(window.innerHeight*.72,520))},X=()=>{let e=m.live,t=m.rotated?e.height:e.width,n=m.rotated?e.width:e.height,r=Math.max(160,window.innerWidth-108),i=Math.max(160,window.innerHeight-24),a=e.mockupUrl&&e.mockupInsets?e.mockupInsets:null;if(h.classList.toggle(`has-mockup`,!!a),se.classList.toggle(`landscape`,m.rotated),h.classList.toggle(`landscape`,m.rotated),a){let o=m.rotated?{left:a.bottom,top:a.left,right:a.top,bottom:a.right}:a,s=1-o.left-o.right,c=1-o.top-o.bottom,l=t/s,u=n/c,d=Math.min(1,r/l,i/u),f=Math.round(l*d),p=Math.round(u*d);x.style.width=`${f}px`,x.style.height=`${p}px`,g.style.width=`${s*100}%`,g.style.height=`${c*100}%`,g.style.left=`${o.left*100}%`,g.style.top=`${o.top*100}%`,S.hidden=!1,S.src=e.mockupUrl??``,h.style.setProperty(`--tbx-mockup-w`,`${f}px`),h.style.setProperty(`--tbx-mockup-h`,`${p}px`)}else{let e=Math.min(1,r/(t+20),i/(n+20));x.style.width=``,x.style.height=``,g.style.left=``,g.style.top=``,g.style.width=`${Math.round(t*e)}px`,g.style.height=`${Math.round(n*e)}px`,S.hidden=!0,S.removeAttribute(`src`)}let o=e.notch===`punch-hole`?`punch`:e.notch;re.className=!a&&e.notch!==`none`?`cutout ${o}`:`cutout`,ie.hidden=!e.showSafari||m.rotated,ae.hidden=!m.ui.showNavBar||e.navBar!==`home-indicator`,oe.hidden=!m.ui.showNavBar||e.navBar!==`android`||m.rotated,ce.style.display=!m.ui.showStatusBar||e.statusBar===`none`?`none`:``,U(),requestAnimationFrame(()=>{J(),xe(),Y()})},Se=(e,t,n,r)=>k===`favorites`&&!n.has(e.id)||k===`recents`&&!r.has(e.id)||k!==`all`&&k!==`favorites`&&k!==`recents`&&e.kind!==k?!1:!t||`${e.label} ${e.id} ${e.kind} ${e.manufacturer}`.toLowerCase().includes(t),Ce=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===m.live.deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`
      <span class="device-thumb" data-kind="${n(e.kind)}" aria-hidden="true"></span>
      <span class="device-copy">
        <span class="device-name">${n(e.label)}</span>
        <span class="device-meta">${n(e.manufacturer)} · ${e.width}×${e.height}</span>
      </span>`,t},we=(e,t,n)=>e===`favorites`?O.devices.filter(e=>t.has(e.id)).length:e===`recents`?O.recents.filter(e=>O.devices.some(t=>t.id===e)).length:e===`all`?O.devices.length:O.devices.filter(t=>t.kind===e).length,Te=(e,t)=>{j.replaceChildren(...[{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktop`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`},{id:`all`,label:`All`},{id:`favorites`,label:`Stars`},{id:`recents`,label:`Recent`}].map(n=>{let r=document.createElement(`button`);r.type=`button`,r.className=`kind-tab`,r.dataset.kind=n.id,r.setAttribute(`role`,`tab`),r.setAttribute(`aria-pressed`,String(k===n.id)),r.setAttribute(`aria-selected`,String(k===n.id));let i=we(n.id,e,t);return r.innerHTML=`${l[n.id]??l.all}<span>${n.label}</span><span class="kind-count">${i}</span>`,r}))},Ee=e=>{let t=new Map;for(let n of e){let e=n.manufacturer||`Other`,r=t.get(e)??[];r.push(n),t.set(e,r)}return[...t.entries()].sort(([e],[t])=>e.localeCompare(t))},Z=()=>{let e=A.value.trim().toLowerCase(),t=new Set(O.favorites),n=new Set(O.recents),r=O.devices.filter(r=>Se(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(Ce(e))};if(k===`recents`&&!e)a(`Recent devices`,O.recents.map(e=>O.devices.find(t=>t.id===e)).filter(e=>!!e));else if(k===`favorites`&&!e)a(`Favorite devices`,O.devices.filter(e=>t.has(e.id)));else{let e=[...r].sort((e,t)=>e.label.localeCompare(t.label));for(let[t,n]of Ee(e))a(t,n)}if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}M.replaceChildren(...i),Te(t,n),z(),requestAnimationFrame(()=>{J()})},De=p.querySelector(`[data-capture-preview]`),Oe=p.querySelector(`[data-capture-title]`),Q=(e,t=!1)=>{m.panel=t?e:m.panel===e?``:e;for(let e of p.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===m.panel);N.setAttribute(`aria-pressed`,String(m.panel===`devices`)),F.setAttribute(`aria-pressed`,String(m.panel===`settings`)),I.setAttribute(`aria-pressed`,String(m.panel===`compare-menu`)),X(),m.panel===`devices`?(je(),requestAnimationFrame(()=>{J()})):m.panel===`settings`?(_e(),requestAnimationFrame(()=>{Y(),requestAnimationFrame(()=>Y())})):(m.panel===`shot-menu`||m.panel===`record-menu`||m.panel===`capture-result`||m.panel===`compare-menu`)&&requestAnimationFrame(()=>xe()),P.setAttribute(`aria-pressed`,String(m.panel===`shot-menu`||m.panel===`capture-result`))},ke=(e,t,n)=>{m.lastCaptureUrl=e,m.lastCaptureName=t,De.src=e,Oe.textContent=n===`simulator`?`Capture with the device`:`Capture the entire tab`,Q(`capture-result`,!0)},Ae=async e=>{Q(``);let t=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:m.live.url});if(t?.ok&&t.dataUrl&&t.filename){ke(t.dataUrl,t.filename,t.kind??e);return}Q(`shot-menu`,!0)},je=async()=>{let e=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(O=e,Z())};f.__tbxSimApply=e=>{m.live=e,m.ui=e.ui,m.rotated=!1,V(e.ui.theme),H(e),_.getAttribute(`src`)!==e.url&&E(e.url),X(),m.panel===`devices`&&Z(),z()},H(e),U(),z(),X(),_.addEventListener(`load`,()=>{le();try{let e=_.contentWindow?.location.href??``;(e.startsWith(`chrome-error:`)||e.includes(`chromewebdata`))&&(v.style.display=`flex`)}catch{}});let Me=()=>X();window.addEventListener(`resize`,Me);let Ne=()=>{try{let e=_.contentWindow?.location.href;if(e&&!e.startsWith(`about:`))return e}catch{}return _.src||m.live.url},Pe=()=>{v.style.display=`none`,T();try{_.contentWindow?.location.reload();return}catch{}try{let e=new URL(Ne());e.hash=`tbx-sim-reload=${++m.previewReload}`,_.src=e.href}catch{m.previewReload+=1;let e=m.live.url.split(`#`)[0];_.src=`${e}#tbx-sim-reload=${m.previewReload}`}},Fe=e=>{let t=e.metaKey||e.ctrlKey;if(e.key===`F5`||t&&!e.shiftKey&&e.key.toLowerCase()===`r`){e.preventDefault(),e.stopPropagation(),Pe();return}if(e.key===`Escape`){if(e.preventDefault(),m.panel){Q(``);return}$()}},$=()=>{B({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(ue),window.removeEventListener(`resize`,Me),document.removeEventListener(`keydown`,Fe,!0),document.documentElement.style.overflow=ee,f.remove()};f.__tbxSimDispose=$,document.addEventListener(`keydown`,Fe,!0),p.querySelector(`[data-act="close"]`)?.addEventListener(`click`,()=>$()),p.querySelector(`[data-act="rotate"]`)?.addEventListener(`click`,()=>{m.rotated=!m.rotated,X()}),p.querySelector(`[data-act="reload"]`)?.addEventListener(`click`,e=>{e.preventDefault(),e.stopPropagation(),Pe()}),N.addEventListener(`click`,()=>Q(`devices`)),F.addEventListener(`click`,()=>Q(`settings`));let Ie=R.querySelector(`.setting-list`);return q(M),q(j),q(ye),q(Ie),A.addEventListener(`input`,()=>Z()),j.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(k=t,Z())}),M.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(B({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:m.live.url}),Q(``))}),p.querySelector(`[data-panel="settings"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-theme-opt]`);(t?.dataset.themeOpt===`classic`||t?.dataset.themeOpt===`dark`)&&G({theme:t.dataset.themeOpt})}),p.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){m.live={...m.live,showSafari:t.checked},X();return}if(n===`status`){G({showStatusBar:t.checked});return}if(n===`nav`){G({showNavBar:t.checked});return}if(n===`mobile-ua`){G({mobileUa:t.checked});return}n===`unblock`&&G({unblock:t.checked})}),p.querySelector(`[data-act="screenshot"]`)?.addEventListener(`click`,()=>Q(`shot-menu`,!0)),p.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&Ae(t)}),L.addEventListener(`click`,()=>{if(L.getAttribute(`aria-pressed`)===`true`){B({type:`RECORDER_STOP`}),L.setAttribute(`aria-pressed`,`false`);return}Q(`record-menu`,!0)}),p.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-record]`)?.dataset.record===`tab`&&(Q(``),B({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:m.live.url}),L.setAttribute(`aria-pressed`,`true`))}),p.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!m.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=m.lastCaptureUrl,e.download=m.lastCaptureName||`simulator.png`,e.click()}),p.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>Q(``)),p.querySelector(`[data-act="expand"]`)?.addEventListener(`click`,()=>{B({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:m.live.url,deviceId:m.live.deviceId})}),p.querySelector(`[data-act="compare"]`)?.addEventListener(`click`,()=>Q(`compare-menu`,!0)),p.querySelector(`[data-panel="compare-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-compare]`)&&(Q(``),B({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:m.live.url,deviceId:m.live.deviceId}))}),document.documentElement.append(f),X(),p.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=t})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;