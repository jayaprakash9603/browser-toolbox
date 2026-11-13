(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){let t=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let n=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),r=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>`,i=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>`,a=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,o=document.getElementById(t);if(o){if(e.replace&&o.__tbxSimApply)return o.__tbxSimApply(e),!0;if(o.__tbxSimDispose?.(),o.remove(),!e.replace)return!0}let s=document.createElement(`div`);s.id=t,s.setAttribute(`data-tbx-simulator`,`overlay`),s.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let c=s.attachShadow({mode:`open`}),l=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let u={rotated:!1,live:e,ui:e.ui,panel:``,lastCaptureUrl:``,lastCaptureName:``,previewReload:0},d=document.createElement(`style`);d.textContent=`
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
      width: min(320px, 44vw);
      max-height: min(78vh, 640px);
      padding: 0;
      border-radius: 14px;
      border: 1px solid var(--tbx-panel-border);
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
      min-height: 0;
      overflow: hidden;
    }
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
    .device-chips-scroll {
      flex-shrink: 0;
      padding: 0 14px 10px;
      overflow-x: auto;
      overflow-y: hidden;
      overscroll-behavior-x: contain;
      scrollbar-width: thin;
      border-bottom: 1px solid var(--tbx-panel-border);
    }
    .device-chips-scroll .chips { flex-wrap: nowrap; width: max-content; padding-bottom: 2px; }
    .panel[data-panel="devices"] .panel-list {
      flex: 1;
      min-height: 120px;
      max-height: min(52vh, 480px);
      padding: 8px 10px 12px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .device-section {
      margin: 10px 4px 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--tbx-panel-muted);
    }
    .device-section:first-child { margin-top: 2px; }
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
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      width: 100%; padding: 10px; border: 0; border-radius: 10px;
      background: transparent; text-align: left; cursor: pointer; font-size: 13px; color: inherit;
    }
    .device-row:hover, .setting-row:hover { background: var(--tbx-row-hover); }
    .device-row[aria-current="true"] { background: #ccfbf1; color: #0f766e; font-weight: 600; }
    .root.theme-dark .device-row[aria-current="true"] { background: #134e4a; color: #99f6e4; }
    .device-row small { color: var(--tbx-panel-muted); font-weight: 400; }
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
  `,c.append(d);let f=document.createElement(`div`);f.className=`root`,f.setAttribute(`role`,`dialog`),f.setAttribute(`aria-modal`,`true`),f.setAttribute(`aria-label`,`${e.label} mobile simulator`),f.style.setProperty(`--tbx-fill`,e.finish.fill),f.style.setProperty(`--tbx-ring`,e.finish.ring),f.style.setProperty(`--tbx-button`,e.finish.button),f.classList.toggle(`theme-dark`,e.ui.theme===`dark`),f.classList.toggle(`theme-classic`,e.ui.theme!==`dark`),f.innerHTML=`
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
    <div class="panel" data-panel="devices">
      <div class="device-panel-head">
        <h2>Devices</h2>
        <input type="search" class="device-search" placeholder="Search devices" aria-label="Search devices" />
      </div>
      <div class="device-chips-scroll">
        <div class="chips" data-kind-chips></div>
      </div>
      <div class="panel-list" data-device-list></div>
    </div>
    <div class="panel" data-panel="settings" role="dialog" aria-label="Simulator settings">
      <div class="panel-head">
        ${a}
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
        <button type="button" class="round" data-act="close" aria-label="Close simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <button type="button" class="round" data-act="devices" aria-label="Change device"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></button>
        <button type="button" class="round" data-act="settings" aria-label="Settings">${a}</button>
      </div>
      <div class="actions-scroll">
        <button type="button" class="round" data-act="rotate" aria-label="Rotate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg></button>
        <button type="button" class="round" data-act="reload" aria-label="Reload">${r}</button>
        <button type="button" class="round" data-act="screenshot" aria-label="Screenshot"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
        <button type="button" class="round" data-act="record" aria-label="Start recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg></button>
        <button type="button" class="round" data-act="compare" aria-label="Compare devices">${i}</button>
        <button type="button" class="round" data-act="expand" aria-label="Open full simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
      </div>
    </div>
  `,c.append(f);let p=c.querySelector(`.screen`),m=c.querySelector(`iframe`),h=c.querySelector(`.clock`),g=c.querySelector(`.cutout`),ee=c.querySelector(`.safari`),te=c.querySelector(`.home`),ne=c.querySelector(`.android-nav`),_=c.querySelector(`.blocked`),v=c.querySelector(`.host`),y=c.querySelector(`.chassis`),b=c.querySelector(`.status`),x=c.querySelector(`.phone-wrap`),S=c.querySelector(`.mockup-img`);v.textContent=e.hostname,m.src=e.url;for(let t of c.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let C=()=>{h.textContent=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`})};C();let w=window.setInterval(C,3e4),T={devices:[],favorites:[],recents:[],current:e.deviceId},E=`all`,D=c.querySelector(`.device-search`),O=c.querySelector(`[data-kind-chips]`),k=c.querySelector(`[data-device-list]`),A=c.querySelector(`[data-act="devices"]`),j=c.querySelector(`[data-act="screenshot"]`),M=c.querySelector(`[data-act="settings"]`),N=c.querySelector(`[data-act="record"]`),P=c.querySelector(`[data-panel="shot-menu"]`),F=c.querySelector(`[data-panel="record-menu"]`),re=c.querySelector(`[data-panel="capture-result"]`),ie=c.querySelector(`[data-panel="settings"]`),I=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),L=e=>{f.classList.toggle(`theme-dark`,e===`dark`),f.classList.toggle(`theme-classic`,e!==`dark`)},R=e=>{f.style.setProperty(`--tbx-fill`,e.finish.fill),f.style.setProperty(`--tbx-ring`,e.finish.ring),f.style.setProperty(`--tbx-button`,e.finish.button),f.setAttribute(`aria-label`,`${e.label} mobile simulator`),m.title=e.label,v.textContent=e.hostname;for(let t of c.querySelectorAll(`.studio-link`))t.href=e.studioUrl},z=()=>{let e=u.ui;for(let t of c.querySelectorAll(`[data-theme-opt]`))t.setAttribute(`aria-pressed`,String(t.dataset.themeOpt===e.theme));let t=c.querySelector(`[data-set="safari"]`),n=c.querySelector(`[data-set="status"]`),r=c.querySelector(`[data-set="nav"]`),i=c.querySelector(`[data-set="mobile-ua"]`),a=c.querySelector(`[data-set="unblock"]`);t&&(t.checked=u.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock)},B=e=>{u.ui=e,L(e.theme),z(),K()},ae=async()=>{let e=await I({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:u.live.url});e?.theme&&B(e)},V=async e=>{let t=await I({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:u.live.deviceId,url:u.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;B(t),n&&(_.style.display=`none`,m.src=u.live.url)},oe=c.querySelector(`[data-panel="devices"]`),H=(e,t,n,r)=>{if(!e.classList.contains(`open`))return;let i=f.getBoundingClientRect(),a=t.getBoundingClientRect();e.style.maxHeight=`${r}px`;let o=a.top-i.top+a.height/2;e.style.setProperty(n,`${o}px`);let s=Math.min(e.getBoundingClientRect().height||r,r),c=o-s/2;c=Math.max(12,Math.min(c,i.height-s-12)),e.style.top=`${c}px`,e.style.right=`76px`,e.style.transform=`none`},U=()=>{H(oe,A,`--tbx-device-arrow-y`,Math.min(window.innerHeight*.78,640))},W=()=>{let e=Math.min(window.innerHeight*.72,520);u.panel===`shot-menu`&&H(P,j,`--tbx-rail-arrow-y`,e),u.panel===`record-menu`&&H(F,N,`--tbx-rail-arrow-y`,e),u.panel===`capture-result`&&H(re,j,`--tbx-rail-arrow-y`,e)},G=()=>{H(ie,M,`--tbx-settings-arrow-y`,Math.min(window.innerHeight*.72,520))},K=()=>{let e=u.live,t=u.rotated?e.height:e.width,n=u.rotated?e.width:e.height,r=Math.max(160,window.innerWidth-108),i=Math.max(160,window.innerHeight-24),a=e.mockupUrl&&e.mockupInsets?e.mockupInsets:null;if(f.classList.toggle(`has-mockup`,!!a),y.classList.toggle(`landscape`,u.rotated),f.classList.toggle(`landscape`,u.rotated),a){let o=u.rotated?{left:a.bottom,top:a.left,right:a.top,bottom:a.right}:a,s=1-o.left-o.right,c=1-o.top-o.bottom,l=t/s,d=n/c,m=Math.min(1,r/l,i/d),h=Math.round(l*m),g=Math.round(d*m);x.style.width=`${h}px`,x.style.height=`${g}px`,p.style.width=`${s*100}%`,p.style.height=`${c*100}%`,p.style.left=`${o.left*100}%`,p.style.top=`${o.top*100}%`,S.hidden=!1,S.src=e.mockupUrl??``,f.style.setProperty(`--tbx-mockup-w`,`${h}px`),f.style.setProperty(`--tbx-mockup-h`,`${g}px`)}else{let e=Math.min(1,r/(t+20),i/(n+20));x.style.width=``,x.style.height=``,p.style.left=``,p.style.top=``,p.style.width=`${Math.round(t*e)}px`,p.style.height=`${Math.round(n*e)}px`,S.hidden=!0,S.removeAttribute(`src`)}let o=e.notch===`punch-hole`?`punch`:e.notch;g.className=!a&&e.notch!==`none`?`cutout ${o}`:`cutout`,ee.hidden=!e.showSafari||u.rotated,te.hidden=!u.ui.showNavBar||e.navBar!==`home-indicator`,ne.hidden=!u.ui.showNavBar||e.navBar!==`android`||u.rotated,b.style.display=!u.ui.showStatusBar||e.statusBar===`none`?`none`:``,z(),requestAnimationFrame(()=>{U(),W(),G()})},se={phone:`Phones`,tablet:`Tablets`,laptop:`Laptops`,desktop:`Desktops`,watch:`Watch`,special:`Special`},ce=[`phone`,`tablet`,`laptop`,`desktop`,`watch`,`special`],le=(e,t,n,r)=>E===`favorites`&&!n.has(e.id)||E===`recents`&&!r.has(e.id)||E!==`all`&&E!==`favorites`&&E!==`recents`&&e.kind!==E?!1:!t||`${e.label} ${e.id} ${e.kind}`.toLowerCase().includes(t),q=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===u.live.deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`<span>${n(e.label)}</span><small>${e.width}×${e.height}</small>`,t},J=()=>{let e=D.value.trim().toLowerCase(),t=new Set(T.favorites),n=new Set(T.recents),r=T.devices.filter(r=>le(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(q(e))};if(E===`all`&&!e){a(`Favorites`,T.devices.filter(e=>t.has(e.id))),a(`Recent`,T.recents.map(e=>T.devices.find(t=>t.id===e)).filter(e=>!!e));for(let e of ce){let t=T.devices.filter(t=>t.kind===e);t.length&&a(se[e]??e,t)}}else for(let e of r)i.push(q(e));if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}k.replaceChildren(...i),requestAnimationFrame(()=>U()),O.replaceChildren(...[{id:`all`,label:`All`},{id:`favorites`,label:`Favorites`},{id:`recents`,label:`Recents`},{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktops`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`}].map(e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`chip`,t.dataset.kind=e.id,t.textContent=e.label,t.setAttribute(`aria-pressed`,String(E===e.id)),t}))},ue=c.querySelector(`[data-capture-preview]`),de=c.querySelector(`[data-capture-title]`),Y=(e,t=!1)=>{u.panel=t?e:u.panel===e?``:e;for(let e of c.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===u.panel);A.setAttribute(`aria-pressed`,String(u.panel===`devices`)),M.setAttribute(`aria-pressed`,String(u.panel===`settings`)),K(),u.panel===`devices`?(me(),requestAnimationFrame(()=>U())):u.panel===`settings`?(ae(),requestAnimationFrame(()=>{G(),requestAnimationFrame(()=>G())})):(u.panel===`shot-menu`||u.panel===`record-menu`||u.panel===`capture-result`)&&requestAnimationFrame(()=>W()),j.setAttribute(`aria-pressed`,String(u.panel===`shot-menu`||u.panel===`capture-result`))},fe=(e,t,n)=>{u.lastCaptureUrl=e,u.lastCaptureName=t,ue.src=e,de.textContent=n===`simulator`?`Simulator screenshot ready`:`Screen capture ready`,Y(`capture-result`,!0)},pe=async e=>{Y(``);let t=await I({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:u.live.url});if(t?.ok&&t.dataUrl&&t.filename){fe(t.dataUrl,t.filename,t.kind??e);return}Y(`shot-menu`,!0)},me=async()=>{let e=await I({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(T=e,J())};s.__tbxSimApply=e=>{u.live=e,u.ui=e.ui,u.rotated=!1,L(e.ui.theme),R(e),m.getAttribute(`src`)!==e.url&&(m.src=e.url),K(),u.panel===`devices`&&J()},R(e),z(),K(),m.addEventListener(`load`,()=>{try{let e=m.contentWindow?.location.href??``;(e.startsWith(`chrome-error:`)||e.includes(`chromewebdata`))&&(_.style.display=`flex`)}catch{}});let X=()=>K();window.addEventListener(`resize`,X);let he=()=>{try{let e=m.contentWindow?.location.href;if(e&&!e.startsWith(`about:`))return e}catch{}return m.src||u.live.url},Z=()=>{_.style.display=`none`;try{m.contentWindow?.location.reload();return}catch{}try{let e=new URL(he());e.hash=`tbx-sim-reload=${++u.previewReload}`,m.src=e.href}catch{u.previewReload+=1;let e=u.live.url.split(`#`)[0];m.src=`${e}#tbx-sim-reload=${u.previewReload}`}},Q=e=>{let t=e.metaKey||e.ctrlKey;if(e.key===`F5`||t&&!e.shiftKey&&e.key.toLowerCase()===`r`){e.preventDefault(),e.stopPropagation(),Z();return}if(e.key===`Escape`){if(e.preventDefault(),u.panel){Y(``);return}$()}},$=()=>{I({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(w),window.removeEventListener(`resize`,X),document.removeEventListener(`keydown`,Q,!0),document.documentElement.style.overflow=l,s.remove()};return s.__tbxSimDispose=$,document.addEventListener(`keydown`,Q,!0),c.querySelector(`[data-act="close"]`)?.addEventListener(`click`,()=>$()),c.querySelector(`[data-act="rotate"]`)?.addEventListener(`click`,()=>{u.rotated=!u.rotated,K()}),c.querySelector(`[data-act="reload"]`)?.addEventListener(`click`,e=>{e.preventDefault(),e.stopPropagation(),Z()}),A.addEventListener(`click`,()=>Y(`devices`)),M.addEventListener(`click`,()=>Y(`settings`)),D.addEventListener(`input`,()=>J()),O.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(E=t,J())}),k.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(I({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:u.live.url}),Y(``))}),c.querySelector(`[data-panel="settings"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-theme-opt]`);(t?.dataset.themeOpt===`classic`||t?.dataset.themeOpt===`dark`)&&V({theme:t.dataset.themeOpt})}),c.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){u.live={...u.live,showSafari:t.checked},K();return}if(n===`status`){V({showStatusBar:t.checked});return}if(n===`nav`){V({showNavBar:t.checked});return}if(n===`mobile-ua`){V({mobileUa:t.checked});return}n===`unblock`&&V({unblock:t.checked})}),c.querySelector(`[data-act="screenshot"]`)?.addEventListener(`click`,()=>Y(`shot-menu`,!0)),c.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&pe(t)}),N.addEventListener(`click`,()=>{if(N.getAttribute(`aria-pressed`)===`true`){I({type:`RECORDER_STOP`}),N.setAttribute(`aria-pressed`,`false`);return}Y(`record-menu`,!0)}),c.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-record]`)?.dataset.record===`tab`&&(Y(``),I({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:u.live.url}),N.setAttribute(`aria-pressed`,`true`))}),c.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!u.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=u.lastCaptureUrl,e.download=u.lastCaptureName||`simulator.png`,e.click()}),c.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>Y(``)),c.querySelector(`[data-act="expand"]`)?.addEventListener(`click`,()=>{I({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:u.live.url,deviceId:u.live.deviceId})}),c.querySelector(`[data-act="compare"]`)?.addEventListener(`click`,()=>{I({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:u.live.url,deviceId:u.live.deviceId})}),document.documentElement.append(s),K(),c.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=t})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;