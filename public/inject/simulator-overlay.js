(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){return Math.min(440,Math.max(300,Math.round(e*.34)))}function n(e){let t=Math.max(180,e.height-48);return{maxW:Math.max(180,e.width-24-74),maxH:t,paddingRight:74}}function r(e,t){if(!t)return{width:e.width+20,height:e.height+20};let n=1-t.left-t.right,r=1-t.top-t.bottom;return{width:e.width/n,height:e.height/r}}function i(e,t){return e.width<=0||e.height<=0?1:Math.max(.15,Math.min(t.maxW/e.width,t.maxH/e.height))}function a(e){return{decorStatus:!e.rotated&&e.showStatusBar&&e.statusBar!==`none`,showSafari:!e.rotated&&e.showSafari}}function ee(e){return{width:e.width,height:e.height}}function te(e,t,n){return e&&t===`home-indicator`&&!n}var o=`stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`,s={close:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,devices:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,settings:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,rotate:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,reload:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,screenshot:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,video:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,compare:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,launch:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,help:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`},c={phone:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,tablet:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,laptop:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><path d="M2 17h20"/></svg>`,desktop:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,watch:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><circle cx="12" cy="12" r="6"/><path d="M12 6v-2"/><path d="M12 20v-2"/><path d="M6 12H4"/><path d="M20 12h-2"/></svg>`,special:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,all:s.compare,favorites:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,recents:`<svg viewBox="0 0 24 24" width="20" height="20" ${o}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`};function l(e){return e}function u(e){return c[e]??c.all}function d(e){let o=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let c=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),d=l(s.close),f=l(s.devices),p=l(s.settings),ne=l(s.rotate),re=l(s.reload),ie=l(s.screenshot),ae=l(s.video),oe=l(s.compare),se=l(s.launch),ce=l(s.help),m=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>`,le=ie,ue=ae,de=p,fe=e=>u(e),pe=m.replace(`width="16" height="16"`,``),h=document.getElementById(o);if(h){if(e.replace&&h.__tbxSimApply)return h.__tbxSimApply(e),!0;if(h.__tbxSimDispose?.(),h.remove(),!e.replace)return!0}let g=document.createElement(`div`);g.id=o,g.setAttribute(`data-tbx-simulator`,`overlay`),g.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let _=g.attachShadow({mode:`open`}),me=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let v={rotated:!1,live:e,ui:e.ui,panel:``,lastCaptureUrl:``,lastCaptureName:``,previewReload:0,recordSyncId:0},he=document.createElement(`style`);he.textContent=`
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
    .rail-btn svg, .kind-tab svg, .popover-head svg { display: block; flex-shrink: 0; }
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
    }
    .root.theme-dark .panel { box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
    .root.theme-dark .panel.device-picker,
    .root.theme-dark .panel.device-picker .device-main,
    .root.theme-dark .panel.device-picker .device-sidebar {
      color: #e2e8f0;
    }
    .root.theme-dark .panel.device-picker .device-panel-head h2,
    .root.theme-dark .panel.device-picker .device-current-name,
    .root.theme-dark .panel.device-picker .device-name {
      color: #f1f5f9;
    }
    .root.theme-dark .panel.device-picker .device-search-wrap input {
      color: #f1f5f9;
    }
    .root.theme-dark .panel.device-picker .kind-tab { color: #cbd5e1; }
    .stage {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      padding: 24px 92px 24px 24px;
      background: inherit;
    }
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
      box-shadow: 0 1px 0 var(--tbx-ring);
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
    .screen.safari-visible .home {
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
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 5;
      padding: 6px 12px 18px;
      background: linear-gradient(180deg, rgba(247,247,248,0.92) 0%, #f4f4f5 40%, #f4f4f5 100%);
      color: #111827;
    }
    .has-mockup .status {
      mix-blend-mode: normal;
      color: #fff;
      background: var(--tbx-accent);
      align-items: flex-end;
      padding-bottom: 4px;
      box-shadow: none;
      z-index: 7;
    }
    .has-mockup .status[data-bar="ios"] { height: 11.5%; min-height: 38px; padding-top: 0; }
    .has-mockup .status[data-bar="android"] { height: 9.5%; min-height: 32px; }
    .has-mockup .status .status-icons svg { color: #fff; opacity: 0.92; }
    .has-mockup .status .clock { color: #fff; font-weight: 600; }
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
      right: 12px; top: 50%; transform: translateY(-50%);
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
    }
    .rail-btn:hover, .round:hover,
    .rail-btn:focus-visible, .round:focus-visible {
      color: var(--tbx-rail-icon-hover);
      background: rgba(83,159,255,0.08);
    }
    .rail-btn:focus-visible, .round:focus-visible { outline: 2px solid rgba(83,159,255,0.45); outline-offset: 1px; }
    .rail-btn[aria-pressed="true"], .round[aria-pressed="true"] {
      color: var(--tbx-rail-icon-hover);
      background: rgba(83,159,255,0.12);
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
    .panel.open { display: flex; z-index: 11; }
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
    .popover-head svg { flex-shrink: 0; opacity: 0.95; color: var(--tbx-rail-icon); }
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
      right: 58px;
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
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
      align-content: start;
      gap: 6px;
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
    .device-section:first-child { margin-top: 2px; }
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
    .device-thumb[data-kind="phone"] { width: 28px; height: 50px; border-radius: 9px; }
    .device-thumb[data-kind="tablet"] { width: 36px; height: 48px; border-radius: 7px; }
    .device-thumb[data-kind="laptop"] { width: 42px; height: 28px; border-radius: 4px 4px 2px 2px; }
    .device-thumb[data-kind="desktop"] { width: 42px; height: 30px; border-radius: 4px; }
    .device-thumb[data-kind="watch"] { width: 26px; height: 32px; border-radius: 9px; }
    .device-thumb[data-kind="special"] { width: 32px; height: 32px; border-radius: 7px; }
    .device-copy { min-width: 0; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .device-name {
      font-size: 11px;
      font-weight: 600;
      line-height: 1.25;
      text-align: center;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .device-meta { font-size: 9px; color: var(--tbx-panel-muted); text-align: center; }
    .device-row {
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      min-height: 96px;
      padding: 10px 6px 8px;
      border: 1px solid transparent;
    }
    .device-row[aria-current="true"] {
      background: #f0f7ff;
      border-color: var(--tbx-accent);
      color: #1a4d8c;
      box-shadow: 0 0 0 1px var(--tbx-accent);
    }
    .root.theme-dark .device-row[aria-current="true"] {
      background: #163056;
      border-color: #60a5fa;
      color: #dbeafe;
      box-shadow: 0 0 0 1px #60a5fa;
    }
    .panel[data-panel="settings"],
    .panel[data-panel="help"] {
      right: 58px;
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
      overflow: hidden;
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
    .device-row[aria-current="true"]:hover { background: #dbeafe; }
    .root.theme-dark .device-row[aria-current="true"]:hover { background: #1e3a5f; }
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
  `,_.append(he);let y=document.createElement(`div`);y.className=`root`,y.setAttribute(`role`,`dialog`),y.setAttribute(`aria-modal`,`true`),y.setAttribute(`aria-label`,`${e.label} mobile simulator`),y.style.setProperty(`--tbx-fill`,e.finish.fill),y.style.setProperty(`--tbx-ring`,e.finish.ring),y.style.setProperty(`--tbx-button`,e.finish.button),y.classList.toggle(`theme-dark`,e.ui.theme===`dark`),y.classList.toggle(`theme-classic`,e.ui.theme!==`dark`),y.innerHTML=`
    <div class="stage">
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
              <iframe title="${c(e.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
              <div class="preview-loading" data-preview-loading aria-hidden="true">
                <span class="preview-loading-spin" aria-hidden="true"></span>
                <span>Loading…</span>
              </div>
              <div class="status" aria-hidden="true">
                <span class="clock"></span>
                <span class="status-icons"><svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="3" width="2" height="7" rx="0.5"/><rect x="12" y="1" width="2" height="9" rx="0.5" opacity="0.45"/></svg><svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.4 4.2a7 7 0 0 1 10.2 0"/><path d="M3.2 6a4.4 4.4 0 0 1 6.6 0"/><circle cx="6.5" cy="8.4" r="0.9" fill="currentColor" stroke="none"/></svg><svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.6" y="1.2" width="18" height="7.6" rx="1.6" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="2.6" width="13" height="4.8" rx="0.6" fill="currentColor"/><rect x="19.2" y="3.2" width="1.8" height="3.6" rx="0.6" fill="currentColor"/></svg></span>
              </div>
              <div class="cutout"></div>
              <div class="home" hidden></div>
              <div class="android-nav" hidden>
                <span style="width:10px;height:10px;border:1px solid currentColor;border-radius:2px;"></span>
                <span style="width:10px;height:10px;border:1px solid currentColor;border-radius:999px;"></span>
                <span style="width:10px;height:2px;background:currentColor;border-radius:999px;"></span>
              </div>
              <div class="blocked">This site blocked the in-page preview.<br/><a class="studio-link" target="_blank" rel="noopener noreferrer">Open full simulator</a></div>
            </div>
            <div class="safari" hidden>
              <div class="url-pill">
                <span aria-hidden="true">AA</span>
                <span class="host"></span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>
              </div>
              <div class="safari-tools" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${m}
              </div>
            </div>
          </div>
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
              <p class="device-current-name" data-current-device-name>${c(e.label)}</p>
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
        ${de}
        <h2>Configuration</h2>
      </div>
      <div class="setting-list">
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
        ${le}
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
        ${ue}
        <h2>Record a screen video</h2>
      </div>
      <div data-record-idle>
        <p class="capture-hint">Record the simulator and page together in this tab.</p>
        <div class="menu-options">
          <button type="button" class="menu-option" data-record="tab">
            <span class="menu-option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg></span>
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
            <span class="menu-option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none"/></svg></span>
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
        ${m}
        <h2>Compare devices</h2>
      </div>
      <p class="capture-hint">Open comparison tools in the full simulator studio.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-compare="grid">
          <span class="menu-option-icon">${pe}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Compare devices</span>
            <span class="menu-option-desc">Side-by-side device grid in studio</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-compare="visible">
          <span class="menu-option-icon">${pe}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Visible devices in the tab</span>
            <span class="menu-option-desc">Multi-device layout for this preview</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="capture-result">
      <div class="popover-head">
        ${le}
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
        ${ce}
        <h2>Help center</h2>
      </div>
      <p class="capture-hint">One Panel Mobile Simulator — tips for this page.</p>
      <p class="help-section-title">Tips</p>
      <ul class="help-list">
        <li>Scroll inside the device preview with your mouse wheel or trackpad.</li>
        <li>Use <strong>Rotate</strong> to check landscape layouts and safe areas.</li>
        <li>Sites that block embedding show a blank screen — use <strong>Open full simulator</strong> or live tab emulation in Studio.</li>
        <li>Screenshots capture the device frame; tab capture includes the whole page behind the overlay.</li>
      </ul>
      <p class="help-section-title">Support</p>
      <ul class="help-list">
        <li><button type="button" class="help-link" data-act="report-bug">Report a bug</button></li>
        <li><a class="studio-link help-link" href="#">Open full responsive studio</a></li>
      </ul>
    </div>
    <div class="actions">
      <div class="actions-primary">
        <button type="button" class="rail-btn" data-act="close" aria-label="Close simulator"><span class="rail-tip">Close simulator</span>${d}</button>
        <button type="button" class="rail-btn" data-act="devices" aria-label="Change device"><span class="rail-tip">Change device</span>${f}</button>
        <button type="button" class="rail-btn" data-act="settings" aria-label="Settings"><span class="rail-tip">Configuration</span>${p}</button>
      </div>
      <div class="actions-scroll">
        <button type="button" class="rail-btn" data-act="rotate" aria-label="Rotate"><span class="rail-tip">Change orientation</span>${ne}</button>
        <button type="button" class="rail-btn" data-act="reload" aria-label="Reload"><span class="rail-tip">Reload page</span>${re}</button>
        <button type="button" class="rail-btn" data-act="screenshot" aria-label="Screenshot"><span class="rail-tip">Take a screenshot</span>${ie}</button>
        <button type="button" class="rail-btn" data-act="record" aria-label="Start recording"><span class="rail-tip">Record video</span>${ae}</button>
        <button type="button" class="rail-btn" data-act="compare" aria-label="Compare devices"><span class="rail-tip">Compare devices</span>${oe}</button>
        <button type="button" class="rail-btn" data-act="help" aria-label="Help center"><span class="rail-tip">Help center</span>${ce}</button>
        <button type="button" class="rail-btn" data-act="expand" aria-label="Open full simulator"><span class="rail-tip">Open full simulator</span>${se}</button>
      </div>
    </div>
  `,_.append(y);let b=_.querySelector(`.screen`),x=_.querySelector(`iframe`),ge=_.querySelector(`.clock`),_e=_.querySelector(`.cutout`),ve=_.querySelector(`.safari`),ye=_.querySelector(`.home`),be=_.querySelector(`.android-nav`),S=_.querySelector(`.blocked`),xe=_.querySelector(`[data-preview-loading]`),Se=_.querySelector(`.host`),Ce=_.querySelector(`.chassis`),we=_.querySelector(`.status`),Te=_.querySelector(`.phone-wrap`),C=_.querySelector(`.phone-inner`),Ee=_.querySelector(`.stage`),w=_.querySelector(`.mockup-img`);Se.textContent=e.hostname;let T=0,De=e=>{xe.dataset.active=e?`true`:`false`,xe.setAttribute(`aria-hidden`,e?`false`:`true`)},E=()=>{T+=1,De(!0)},Oe=()=>{T=Math.max(0,T-1),T===0&&De(!1)},ke=e=>{x.getAttribute(`src`)!==e&&(E(),S.style.display=`none`,x.src=e)};E(),x.src=e.url;for(let t of _.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let Ae=()=>{ge.textContent=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`})};Ae();let je=window.setInterval(Ae,3e4),D={devices:[],favorites:[],recents:[],current:e.deviceId},O=`phone`,Me=_.querySelector(`.device-search`),k=_.querySelector(`[data-kind-tabs]`),A=_.querySelector(`[data-device-list]`),j=_.querySelector(`[data-act="devices"]`),M=_.querySelector(`[data-act="screenshot"]`),N=_.querySelector(`[data-act="settings"]`),Ne=_.querySelector(`[data-act="compare"]`),P=_.querySelector(`[data-act="help"]`),F=_.querySelector(`[data-act="record"]`),Pe=_.querySelector(`[data-panel="shot-menu"]`),I=_.querySelector(`[data-panel="record-menu"]`),Fe=_.querySelector(`[data-panel="capture-result"]`),Ie=_.querySelector(`[data-panel="settings"]`),Le=_.querySelector(`[data-panel="compare-menu"]`),Re=_.querySelector(`[data-panel="help"]`),ze=I.querySelector(`[data-record-idle]`),Be=I.querySelector(`[data-record-active]`),L=I.querySelector(`[data-record-status]`),R=async()=>{let e=(await V({type:`RECORDER_STATUS`}))?.session??null,t=!!e&&(e.phase===`pending`||e.phase===`recording`||e.phase===`paused`||e.phase===`stopping`);if(ze.hidden=t,Be.hidden=!t,F.setAttribute(`aria-pressed`,String(t)),!t){L.textContent=``,L.dataset.phase=`idle`;return}let n=e?.countdownUntil&&e.countdownUntil>Date.now()?Math.ceil((e.countdownUntil-Date.now())/1e3):0;if(n>0){L.textContent=`Recording starts in ${n}s…`,L.dataset.phase=`countdown`;return}if(e?.phase===`stopping`){L.textContent=`Saving recording…`,L.dataset.phase=`recording`;return}L.textContent=e?.phase===`paused`?`Recording paused`:`Recording in progress…`,L.dataset.phase=`recording`},Ve=()=>{window.clearInterval(v.recordSyncId),R(),v.recordSyncId=window.setInterval(()=>void R(),400)},z=()=>{window.clearInterval(v.recordSyncId),v.recordSyncId=0},He=_.querySelector(`[data-current-device-name]`),Ue=_.querySelector(`[data-current-device-thumb]`),B=()=>{He.textContent=v.live.label;let e=D.devices.find(e=>e.id===v.live.deviceId),t=_.querySelector(`[data-current-device-thumb]`)??Ue;if(e?.thumbUrl&&t){if(t.tagName===`IMG`)t.src=e.thumbUrl;else{let n=document.createElement(`img`);n.className=`device-thumb-img`,n.dataset.currentDeviceThumb=``,n.alt=``,n.setAttribute(`aria-hidden`,`true`),n.src=e.thumbUrl,t.replaceWith(n)}}else t&&(t.dataset.kind=e?.kind??`phone`)},V=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),We=e=>{y.classList.toggle(`theme-dark`,e===`dark`),y.classList.toggle(`theme-classic`,e!==`dark`)},Ge=e=>{y.style.setProperty(`--tbx-fill`,e.finish.fill),y.style.setProperty(`--tbx-ring`,e.finish.ring),y.style.setProperty(`--tbx-button`,e.finish.button),y.setAttribute(`aria-label`,`${e.label} mobile simulator`),x.title=e.label,Se.textContent=e.hostname;for(let t of _.querySelectorAll(`.studio-link`))t.href=e.studioUrl},H=()=>{let e=v.ui,t=_.querySelector(`[data-set="safari"]`),n=_.querySelector(`[data-set="status"]`),r=_.querySelector(`[data-set="nav"]`),i=_.querySelector(`[data-set="mobile-ua"]`),a=_.querySelector(`[data-set="unblock"]`);t&&(t.checked=v.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock)},Ke=e=>{v.ui=e,We(e.theme),H(),X()},qe=async()=>{let e=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:v.live.url});e?.theme&&Ke(e)},U=async e=>{let t=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:v.live.deviceId,url:v.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;Ke(t),n&&ke(v.live.url)},W=_.querySelector(`[data-panel="devices"]`),Je=_.querySelector(`.actions-scroll`),G=(e,t,n,r)=>{if(!e.classList.contains(`open`))return;let i=y.getBoundingClientRect(),a=t.getBoundingClientRect(),ee=a.top-i.top+a.height/2;e.style.setProperty(n,`${ee}px`),e.style.right=`58px`,e.style.top=`50%`,e.style.transform=`translateY(-50%)`,e.style.maxHeight=`${r}px`,e.style.height=``},K=e=>{e.addEventListener(`wheel`,t=>{if(t.stopPropagation(),!(e.scrollHeight>e.clientHeight+1)){t.preventDefault();return}let n=e.scrollTop<=0,r=e.scrollTop+e.clientHeight>=e.scrollHeight-1,i=t.deltaY;if(i<0&&n||i>0&&r){t.preventDefault();return}let a=e.scrollTop+i;a!==e.scrollTop&&(e.scrollTop=a,t.preventDefault())},{passive:!1})},q=()=>{if(!W.classList.contains(`open`))return;let e=t(window.innerWidth),n=Math.min(Math.round(window.innerHeight*.88),820),r=y.getBoundingClientRect(),i=j.getBoundingClientRect(),a=i.top-r.top+i.height/2;W.style.setProperty(`--tbx-device-arrow-y`,`${a}px`),W.style.right=`58px`,W.style.top=`50%`,W.style.transform=`translateY(-50%)`,W.style.width=`${e}px`,W.style.height=`${n}px`,W.style.maxHeight=`${n}px`},J=()=>{let e=Math.min(window.innerHeight*.72,520);v.panel===`shot-menu`&&G(Pe,M,`--tbx-rail-arrow-y`,e),v.panel===`record-menu`&&G(I,F,`--tbx-rail-arrow-y`,e),v.panel===`capture-result`&&G(Fe,M,`--tbx-rail-arrow-y`,e),v.panel===`compare-menu`&&G(Le,Ne,`--tbx-rail-arrow-y`,e),v.panel===`help`&&G(Re,P,`--tbx-help-arrow-y`,e)},Y=()=>{G(Ie,N,`--tbx-settings-arrow-y`,Math.min(window.innerHeight*.72,520))},X=()=>{let e=v.live,t=v.rotated?e.height:e.width,o=v.rotated?e.width:e.height,s=n({width:window.innerWidth,height:window.innerHeight}),c=e.mockupUrl&&e.mockupInsets?e.mockupInsets:null,l=c?v.rotated?{left:c.bottom,top:c.left,right:c.top,bottom:c.right}:c:null,u=r({width:t,height:o},l),d=i(u,s);if(y.classList.toggle(`has-mockup`,!!c),Ce.classList.toggle(`landscape`,v.rotated),y.classList.toggle(`landscape`,v.rotated),Ee.style.paddingRight=`${s.paddingRight}px`,C.style.width=`${u.width}px`,C.style.height=`${u.height}px`,C.style.transform=`scale(${d})`,Te.style.width=`${Math.round(u.width*d)}px`,Te.style.height=`${Math.round(u.height*d)}px`,l){let t=1-l.left-l.right,n=1-l.top-l.bottom;b.style.width=`${t*100}%`,b.style.height=`${n*100}%`,b.style.left=`${l.left*100}%`,b.style.top=`${l.top*100}%`,w.hidden=!1,w.src=e.mockupUrl??``,y.style.setProperty(`--tbx-mockup-w`,`${u.width}px`),y.style.setProperty(`--tbx-mockup-h`,`${u.height}px`)}else b.style.left=``,b.style.top=``,b.style.width=`${t}px`,b.style.height=`${o}px`,w.hidden=!0,w.removeAttribute(`src`);let f=a({hasMockup:!!c,rotated:v.rotated,showStatusBar:v.ui.showStatusBar,statusBar:e.statusBar,showSafari:e.showSafari}),p=ee({width:t,height:o}),ne=e.notch===`punch-hole`?`punch`:e.notch;_e.className=!c&&e.notch!==`none`?`cutout ${ne}`:`cutout`,ve.hidden=!f.showSafari,b.classList.toggle(`safari-visible`,f.showSafari),ye.hidden=!te(v.ui.showNavBar,e.navBar,v.rotated),be.hidden=!v.ui.showNavBar||e.navBar!==`android`||v.rotated,we.style.display=f.decorStatus?``:`none`,we.dataset.bar=e.statusBar===`android`?`android`:`ios`,x.setAttribute(`width`,String(p.width)),x.setAttribute(`height`,String(p.height)),H(),q(),requestAnimationFrame(()=>{q(),J(),Y()})},Ye=(e,t,n,r)=>O===`favorites`&&!n.has(e.id)||O===`recents`&&!r.has(e.id)||O!==`all`&&O!==`favorites`&&O!==`recents`&&e.kind!==O?!1:!t||`${e.label} ${e.id} ${e.kind} ${e.manufacturer}`.toLowerCase().includes(t),Xe=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===v.live.deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`
      ${e.thumbUrl?`<img class="device-thumb-img" src="${c(e.thumbUrl)}" alt="" aria-hidden="true" loading="lazy" />`:`<span class="device-thumb" data-kind="${c(e.kind)}" aria-hidden="true"></span>`}
      <span class="device-copy">
        <span class="device-name">${c(e.label)}</span>
        <span class="device-meta">${e.width}×${e.height}</span>
      </span>`,t},Ze=(e,t,n)=>e===`favorites`?D.devices.filter(e=>t.has(e.id)).length:e===`recents`?D.recents.filter(e=>D.devices.some(t=>t.id===e)).length:e===`all`?D.devices.length:D.devices.filter(t=>t.kind===e).length,Qe=(e,t)=>{k.replaceChildren(...[{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktop`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`},{id:`all`,label:`All`},{id:`favorites`,label:`Stars`},{id:`recents`,label:`Recent`}].map(n=>{let r=document.createElement(`button`);r.type=`button`,r.className=`kind-tab`,r.dataset.kind=n.id,r.setAttribute(`role`,`tab`),r.setAttribute(`aria-pressed`,String(O===n.id)),r.setAttribute(`aria-selected`,String(O===n.id));let i=Ze(n.id,e,t);return r.innerHTML=`<span class="kind-icon-plate">${fe(n.id)}</span><span>${n.label}</span><span class="kind-count">${i}</span>`,r}))},$e=e=>{let t=new Map;for(let n of e){let e=n.manufacturer||`Other`,r=t.get(e)??[];r.push(n),t.set(e,r)}return[...t.entries()].sort(([e],[t])=>e.localeCompare(t))},Z=()=>{let e=Me.value.trim().toLowerCase(),t=new Set(D.favorites),n=new Set(D.recents),r=D.devices.filter(r=>Ye(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(Xe(e))};if(O===`recents`&&!e)a(`Recent devices`,D.recents.map(e=>D.devices.find(t=>t.id===e)).filter(e=>!!e));else if(O===`favorites`&&!e)a(`Favorite devices`,D.devices.filter(e=>t.has(e.id)));else{let e=[...r].sort((e,t)=>e.label.localeCompare(t.label));for(let[t,n]of $e(e))a(t,n)}if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}A.replaceChildren(...i),Qe(t,n),B(),requestAnimationFrame(()=>{q()})},et=_.querySelector(`[data-capture-preview]`),tt=_.querySelector(`[data-capture-title]`),Q=(e,t=!1)=>{v.panel=t?e:v.panel===e?``:e;for(let e of _.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===v.panel);j.setAttribute(`aria-pressed`,String(v.panel===`devices`)),N.setAttribute(`aria-pressed`,String(v.panel===`settings`)),Ne.setAttribute(`aria-pressed`,String(v.panel===`compare-menu`)),P.setAttribute(`aria-pressed`,String(v.panel===`help`)),X(),v.panel===`devices`?(it(),requestAnimationFrame(()=>{q()})):v.panel===`settings`?(qe(),requestAnimationFrame(()=>{Y(),requestAnimationFrame(()=>Y())})):v.panel===`help`?requestAnimationFrame(()=>J()):v.panel===`record-menu`?(Ve(),requestAnimationFrame(()=>J())):v.panel===`shot-menu`||v.panel===`capture-result`||v.panel===`compare-menu`?(z(),requestAnimationFrame(()=>J())):z(),M.setAttribute(`aria-pressed`,String(v.panel===`shot-menu`||v.panel===`capture-result`)),v.panel!==`record-menu`&&R()},nt=(e,t,n)=>{v.lastCaptureUrl=e,v.lastCaptureName=t,et.src=e,tt.textContent=n===`simulator`?`Capture with the device`:`Capture the entire tab`,Q(`capture-result`,!0)},rt=async e=>{Q(``);let t=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:v.live.url});if(t?.ok&&t.dataUrl&&t.filename){nt(t.dataUrl,t.filename,t.kind??e);return}Q(`shot-menu`,!0)},it=async()=>{let e=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(D=e,Z())};g.__tbxSimApply=e=>{v.live=e,v.ui=e.ui,v.rotated=!1,We(e.ui.theme),Ge(e),x.getAttribute(`src`)!==e.url&&ke(e.url),X(),v.panel===`devices`&&Z(),B()},Ge(e),H(),B(),X(),x.addEventListener(`load`,()=>{Oe();try{let e=x.contentWindow?.location.href??``;(e.startsWith(`chrome-error:`)||e.includes(`chromewebdata`))&&(S.style.display=`flex`)}catch{}});let at=()=>X();window.addEventListener(`resize`,at);let ot=()=>{try{let e=x.contentWindow?.location.href;if(e&&!e.startsWith(`about:`))return e}catch{}return x.src||v.live.url},st=()=>{S.style.display=`none`,E();try{x.contentWindow?.location.reload();return}catch{}try{let e=new URL(ot());e.hash=`tbx-sim-reload=${++v.previewReload}`,x.src=e.href}catch{v.previewReload+=1;let e=v.live.url.split(`#`)[0];x.src=`${e}#tbx-sim-reload=${v.previewReload}`}},ct=e=>{let t=e.metaKey||e.ctrlKey;if(e.key===`F5`||t&&!e.shiftKey&&e.key.toLowerCase()===`r`){e.preventDefault(),e.stopPropagation(),st();return}if(e.key===`Escape`){if(e.preventDefault(),v.panel){Q(``);return}$()}},$=()=>{V({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(je),window.removeEventListener(`resize`,at),z(),document.removeEventListener(`keydown`,ct,!0),document.documentElement.style.overflow=me,g.remove()};g.__tbxSimDispose=$,document.addEventListener(`keydown`,ct,!0),_.querySelector(`[data-act="close"]`)?.addEventListener(`click`,()=>$()),_.querySelector(`[data-act="rotate"]`)?.addEventListener(`click`,()=>{v.rotated=!v.rotated,X()}),_.querySelector(`[data-act="reload"]`)?.addEventListener(`click`,e=>{e.preventDefault(),e.stopPropagation(),st()}),j.addEventListener(`click`,()=>Q(`devices`)),N.addEventListener(`click`,()=>Q(`settings`)),P.addEventListener(`click`,()=>Q(`help`)),_.querySelector(`[data-act="report-bug"]`)?.addEventListener(`click`,()=>{try{let e=chrome.runtime.getURL(`options.html#/support`);window.open(e,`_blank`,`noopener`)}catch{}Q(``)});let lt=Ie.querySelector(`.setting-list`);return K(A),K(k),K(Je),K(lt),Me.addEventListener(`input`,()=>Z()),k.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(O=t,Z())}),A.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(V({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:v.live.url}),Q(``))}),_.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){v.live={...v.live,showSafari:t.checked},X();return}if(n===`status`){U({showStatusBar:t.checked});return}if(n===`nav`){U({showNavBar:t.checked});return}if(n===`mobile-ua`){U({mobileUa:t.checked});return}n===`unblock`&&U({unblock:t.checked})}),_.querySelector(`[data-act="screenshot"]`)?.addEventListener(`click`,()=>Q(`shot-menu`,!0)),_.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&rt(t)}),F.addEventListener(`click`,()=>{if(F.getAttribute(`aria-pressed`)===`true`){Q(`record-menu`,!0);return}Q(`record-menu`,!0)}),_.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-record]`)?.dataset.record;if(t===`tab`){V({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:v.live.url}).then(()=>R());return}t===`stop`&&V({type:`SIMULATOR_OVERLAY_ACTION`,action:`recordStop`,url:v.live.url}).then(()=>{R(),Q(``)})}),chrome.runtime.onMessage.addListener(e=>((e?.type===`RECORDER_FINISHED`||e?.type===`RECORDER_STARTED`||e?.type===`RECORDER_COUNTDOWN_BEGIN`)&&R(),!1)),_.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!v.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=v.lastCaptureUrl,e.download=v.lastCaptureName||`simulator.png`,e.click()}),_.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>Q(``)),_.querySelector(`[data-act="expand"]`)?.addEventListener(`click`,()=>{V({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:v.live.url,deviceId:v.live.deviceId})}),_.querySelector(`[data-act="compare"]`)?.addEventListener(`click`,()=>Q(`compare-menu`,!0)),_.querySelector(`[data-panel="compare-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-compare]`)&&(Q(``),V({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:v.live.url,deviceId:v.live.deviceId}))}),document.documentElement.append(g),X(),_.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=d})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;