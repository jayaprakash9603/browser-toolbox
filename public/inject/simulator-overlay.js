(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){let t=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let n=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),r=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>`,i=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>`,a=document.getElementById(t);if(a){if(e.replace&&a.__tbxSimApply)return a.__tbxSimApply(e),!0;if(a.__tbxSimDispose?.(),a.remove(),!e.replace)return!0}let o=document.createElement(`div`);o.id=t,o.setAttribute(`data-tbx-simulator`,`overlay`),o.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let s=o.attachShadow({mode:`open`}),c=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let l={rotated:!1,live:e,ui:e.ui,panel:``,lastCaptureUrl:``,lastCaptureName:``},u=document.createElement(`style`);u.textContent=`
    :host { all: initial; }
    * { box-sizing: border-box; }
    button { font: inherit; }
    .root {
      pointer-events: auto;
      position: fixed;
      inset: 0;
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
    }
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
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 10px 8px;
      border-radius: 999px;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(15,23,42,0.08);
      box-shadow: 0 8px 28px rgba(15,23,42,0.1);
      z-index: 9;
    }
    .root.theme-dark .actions {
      background: rgba(21,27,36,0.94);
      border-color: #2a3544;
      box-shadow: 0 8px 28px rgba(0,0,0,0.35);
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
    .panel.open { display: flex; }
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
    .panel[data-panel="settings"],
    .panel[data-panel="shot-menu"],
    .panel[data-panel="record-menu"],
    .panel[data-panel="capture-result"] {
      right: 76px; top: 50%; transform: translateY(-50%);
      width: 260px; max-height: min(70vh, 480px);
      padding: 14px; border-radius: 14px;
      border: 1px solid var(--tbx-panel-border);
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
    }
    .panel[data-panel="settings"] {
      width: min(292px, 42vw);
      gap: 12px;
    }
    .panel[data-panel="settings"]::after {
      content: '';
      position: absolute;
      right: -6px;
      top: 50%;
      width: 10px;
      height: 10px;
      transform: translateY(-50%) rotate(45deg);
      background: var(--tbx-panel-bg);
      border-right: 1px solid var(--tbx-panel-border);
      border-top: 1px solid var(--tbx-panel-border);
    }
    .panel[data-panel="capture-result"] {
      width: min(340px, 42vw);
    }
    .panel[data-panel="capture-result"] img {
      width: 100%; max-height: 46vh; object-fit: contain;
      border-radius: 10px; background: #f1f5f9; border: 1px solid #e2e8f0;
    }
    .capture-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .capture-actions .setting-row { flex: 1 1 auto; justify-content: center; font-weight: 600; }
    .capture-hint { margin: 0; font-size: 11px; color: var(--tbx-panel-muted); line-height: 1.4; }
    .panel h2 { margin: 0; font-size: 13px; font-weight: 700; }
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
  `,s.append(u);let d=document.createElement(`div`);d.className=`root`,d.setAttribute(`role`,`dialog`),d.setAttribute(`aria-modal`,`true`),d.setAttribute(`aria-label`,`${e.label} mobile simulator`),d.style.setProperty(`--tbx-fill`,e.finish.fill),d.style.setProperty(`--tbx-ring`,e.finish.ring),d.style.setProperty(`--tbx-button`,e.finish.button),d.classList.toggle(`theme-dark`,e.ui.theme===`dark`),d.classList.toggle(`theme-classic`,e.ui.theme!==`dark`),d.innerHTML=`
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
    <div class="panel" data-panel="settings">
      <h2>Settings</h2>
      <div class="setting-list">
        <p class="setting-section">Appearance</p>
        <div class="theme-pick" role="group" aria-label="Canvas theme">
          <button type="button" class="theme-opt" data-theme-opt="classic">Classic</button>
          <button type="button" class="theme-opt" data-theme-opt="dark">Dark</button>
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
      <button type="button" class="setting-row" data-shot="simulator">Simulator screenshot</button>
      <button type="button" class="setting-row" data-shot="viewport">Visible screen</button>
    </div>
    <div class="panel" data-panel="record-menu">
      <h2>Record</h2>
      <p class="capture-hint">Recording includes the simulator frame and the page inside this tab.</p>
      <button type="button" class="setting-row" data-record="tab">Start tab recording</button>
    </div>
    <div class="panel" data-panel="capture-result">
      <h2 data-capture-title>Screenshot ready</h2>
      <img data-capture-preview alt="Screenshot preview" />
      <div class="capture-actions">
        <button type="button" class="setting-row" data-capture-download>Download again</button>
        <button type="button" class="setting-row" data-capture-close>Close</button>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="round" data-act="close" aria-label="Close simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <button type="button" class="round" data-act="devices" aria-label="Change device"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></button>
      <button type="button" class="round" data-act="rotate" aria-label="Rotate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg></button>
      <button type="button" class="round" data-act="reload" aria-label="Reload">${r}</button>
      <button type="button" class="round" data-act="screenshot" aria-label="Screenshot"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
      <button type="button" class="round" data-act="record" aria-label="Start recording"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg></button>
      <button type="button" class="round" data-act="compare" aria-label="Compare devices">${i}</button>
      <button type="button" class="round" data-act="settings" aria-label="Settings"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg></button>
      <button type="button" class="round" data-act="expand" aria-label="Open full simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
    </div>
  `,s.append(d);let f=s.querySelector(`.screen`),p=s.querySelector(`iframe`),m=s.querySelector(`.clock`),h=s.querySelector(`.cutout`),g=s.querySelector(`.safari`),_=s.querySelector(`.home`),v=s.querySelector(`.android-nav`),y=s.querySelector(`.blocked`),b=s.querySelector(`.host`),x=s.querySelector(`.chassis`),ee=s.querySelector(`.status`),S=s.querySelector(`.phone-wrap`),C=s.querySelector(`.mockup-img`);b.textContent=e.hostname,p.src=e.url;for(let t of s.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let w=()=>{m.textContent=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`})};w();let T=window.setInterval(w,3e4),E={devices:[],favorites:[],recents:[],current:e.deviceId},D=`all`,O=s.querySelector(`.device-search`),k=s.querySelector(`[data-kind-chips]`),A=s.querySelector(`[data-device-list]`),j=s.querySelector(`[data-act="devices"]`),M=s.querySelector(`[data-act="settings"]`),N=s.querySelector(`[data-act="record"]`),P=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),F=e=>{d.classList.toggle(`theme-dark`,e===`dark`),d.classList.toggle(`theme-classic`,e!==`dark`)},I=e=>{d.style.setProperty(`--tbx-fill`,e.finish.fill),d.style.setProperty(`--tbx-ring`,e.finish.ring),d.style.setProperty(`--tbx-button`,e.finish.button),d.setAttribute(`aria-label`,`${e.label} mobile simulator`),p.title=e.label,b.textContent=e.hostname;for(let t of s.querySelectorAll(`.studio-link`))t.href=e.studioUrl},L=()=>{let e=l.ui;for(let t of s.querySelectorAll(`[data-theme-opt]`))t.setAttribute(`aria-pressed`,String(t.dataset.themeOpt===e.theme));let t=s.querySelector(`[data-set="safari"]`),n=s.querySelector(`[data-set="status"]`),r=s.querySelector(`[data-set="nav"]`),i=s.querySelector(`[data-set="mobile-ua"]`),a=s.querySelector(`[data-set="unblock"]`);t&&(t.checked=l.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock)},R=e=>{l.ui=e,F(e.theme),L(),U()},z=async()=>{let e=await P({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:l.live.url});e?.theme&&R(e)},B=async e=>{let t=await P({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:l.live.deviceId,url:l.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;R(t),n&&(y.style.display=`none`,p.src=l.live.url)},V=s.querySelector(`[data-panel="devices"]`),H=()=>{if(!V.classList.contains(`open`))return;let e=d.getBoundingClientRect(),t=j.getBoundingClientRect(),n=Math.min(window.innerHeight*.78,640);V.style.maxHeight=`${n}px`;let r=t.top-e.top+t.height/2;V.style.setProperty(`--tbx-device-arrow-y`,`${r}px`);let i=Math.min(V.getBoundingClientRect().height||n,n),a=r-i/2;a=Math.max(12,Math.min(a,e.height-i-12)),V.style.top=`${a}px`,V.style.right=`76px`,V.style.transform=`none`},U=()=>{let e=l.live,t=l.rotated?e.height:e.width,n=l.rotated?e.width:e.height,r=Math.max(160,window.innerWidth-108),i=Math.max(160,window.innerHeight-24),a=e.mockupUrl&&e.mockupInsets?e.mockupInsets:null;if(d.classList.toggle(`has-mockup`,!!a),x.classList.toggle(`landscape`,l.rotated),d.classList.toggle(`landscape`,l.rotated),a){let o=l.rotated?{left:a.bottom,top:a.left,right:a.top,bottom:a.right}:a,s=1-o.left-o.right,c=1-o.top-o.bottom,u=t/s,p=n/c,m=Math.min(1,r/u,i/p),h=Math.round(u*m),g=Math.round(p*m);S.style.width=`${h}px`,S.style.height=`${g}px`,f.style.width=`${s*100}%`,f.style.height=`${c*100}%`,f.style.left=`${o.left*100}%`,f.style.top=`${o.top*100}%`,C.hidden=!1,C.src=e.mockupUrl??``,d.style.setProperty(`--tbx-mockup-w`,`${h}px`),d.style.setProperty(`--tbx-mockup-h`,`${g}px`)}else{let e=Math.min(1,r/(t+20),i/(n+20));S.style.width=``,S.style.height=``,f.style.left=``,f.style.top=``,f.style.width=`${Math.round(t*e)}px`,f.style.height=`${Math.round(n*e)}px`,C.hidden=!0,C.removeAttribute(`src`)}let o=e.notch===`punch-hole`?`punch`:e.notch;h.className=!a&&e.notch!==`none`?`cutout ${o}`:`cutout`,g.hidden=!e.showSafari||l.rotated,_.hidden=!l.ui.showNavBar||e.navBar!==`home-indicator`,v.hidden=!l.ui.showNavBar||e.navBar!==`android`||l.rotated,ee.style.display=!l.ui.showStatusBar||e.statusBar===`none`?`none`:``,L(),requestAnimationFrame(()=>H())},W={phone:`Phones`,tablet:`Tablets`,laptop:`Laptops`,desktop:`Desktops`,watch:`Watch`,special:`Special`},G=[`phone`,`tablet`,`laptop`,`desktop`,`watch`,`special`],K=(e,t,n,r)=>D===`favorites`&&!n.has(e.id)||D===`recents`&&!r.has(e.id)||D!==`all`&&D!==`favorites`&&D!==`recents`&&e.kind!==D?!1:!t||`${e.label} ${e.id} ${e.kind}`.toLowerCase().includes(t),q=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===l.live.deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`<span>${n(e.label)}</span><small>${e.width}×${e.height}</small>`,t},J=()=>{let e=O.value.trim().toLowerCase(),t=new Set(E.favorites),n=new Set(E.recents),r=E.devices.filter(r=>K(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(q(e))};if(D===`all`&&!e){a(`Favorites`,E.devices.filter(e=>t.has(e.id))),a(`Recent`,E.recents.map(e=>E.devices.find(t=>t.id===e)).filter(e=>!!e));for(let e of G){let t=E.devices.filter(t=>t.kind===e);t.length&&a(W[e]??e,t)}}else for(let e of r)i.push(q(e));if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}A.replaceChildren(...i),requestAnimationFrame(()=>H()),k.replaceChildren(...[{id:`all`,label:`All`},{id:`favorites`,label:`Favorites`},{id:`recents`,label:`Recents`},{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktops`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`}].map(e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`chip`,t.dataset.kind=e.id,t.textContent=e.label,t.setAttribute(`aria-pressed`,String(D===e.id)),t}))},Y=s.querySelector(`[data-capture-preview]`),te=s.querySelector(`[data-capture-title]`),X=(e,t=!1)=>{l.panel=t?e:l.panel===e?``:e;for(let e of s.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===l.panel);j.setAttribute(`aria-pressed`,String(l.panel===`devices`)),M.setAttribute(`aria-pressed`,String(l.panel===`settings`)),U(),l.panel===`devices`?(ie(),requestAnimationFrame(()=>H())):l.panel===`settings`&&z()},ne=(e,t,n)=>{l.lastCaptureUrl=e,l.lastCaptureName=t,Y.src=e,te.textContent=n===`simulator`?`Simulator screenshot ready`:`Screen capture ready`,X(`capture-result`,!0)},re=async e=>{X(``);let t=await P({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:l.live.url});if(t?.ok&&t.dataUrl&&t.filename){ne(t.dataUrl,t.filename,t.kind??e);return}X(`shot-menu`,!0)},ie=async()=>{let e=await P({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(E=e,J())};o.__tbxSimApply=e=>{l.live=e,l.ui=e.ui,l.rotated=!1,F(e.ui.theme),I(e),p.getAttribute(`src`)!==e.url&&(p.src=e.url),U(),l.panel===`devices`&&J()},I(e),L(),U(),p.addEventListener(`load`,()=>{try{let e=p.contentWindow?.location.href??``;(e.startsWith(`chrome-error:`)||e.includes(`chromewebdata`))&&(y.style.display=`flex`)}catch{}});let Z=()=>U();window.addEventListener(`resize`,Z);let Q=e=>{if(e.key===`Escape`){if(e.preventDefault(),l.panel){X(``);return}$()}},$=()=>{P({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(T),window.removeEventListener(`resize`,Z),document.removeEventListener(`keydown`,Q,!0),document.documentElement.style.overflow=c,o.remove()};return o.__tbxSimDispose=$,document.addEventListener(`keydown`,Q,!0),s.querySelector(`[data-act="close"]`)?.addEventListener(`click`,()=>$()),s.querySelector(`[data-act="rotate"]`)?.addEventListener(`click`,()=>{l.rotated=!l.rotated,U()}),s.querySelector(`[data-act="reload"]`)?.addEventListener(`click`,()=>{y.style.display=`none`,p.src=l.live.url}),j.addEventListener(`click`,()=>X(`devices`)),M.addEventListener(`click`,()=>X(`settings`)),O.addEventListener(`input`,()=>J()),k.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(D=t,J())}),A.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(P({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:l.live.url}),X(``))}),s.querySelector(`[data-panel="settings"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-theme-opt]`);(t?.dataset.themeOpt===`classic`||t?.dataset.themeOpt===`dark`)&&B({theme:t.dataset.themeOpt})}),s.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){l.live={...l.live,showSafari:t.checked},U();return}if(n===`status`){B({showStatusBar:t.checked});return}if(n===`nav`){B({showNavBar:t.checked});return}if(n===`mobile-ua`){B({mobileUa:t.checked});return}n===`unblock`&&B({unblock:t.checked})}),s.querySelector(`[data-act="screenshot"]`)?.addEventListener(`click`,()=>X(`shot-menu`,!0)),s.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&re(t)}),N.addEventListener(`click`,()=>{if(N.getAttribute(`aria-pressed`)===`true`){P({type:`RECORDER_STOP`}),N.setAttribute(`aria-pressed`,`false`);return}X(`record-menu`,!0)}),s.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-record]`)?.dataset.record===`tab`&&(X(``),P({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:l.live.url}),N.setAttribute(`aria-pressed`,`true`))}),s.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!l.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=l.lastCaptureUrl,e.download=l.lastCaptureName||`simulator.png`,e.click()}),s.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>X(``)),s.querySelector(`[data-act="expand"]`)?.addEventListener(`click`,()=>{P({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:l.live.url,deviceId:l.live.deviceId})}),s.querySelector(`[data-act="compare"]`)?.addEventListener(`click`,()=>{P({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:l.live.url,deviceId:l.live.deviceId})}),document.documentElement.append(o),U(),s.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=t})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;