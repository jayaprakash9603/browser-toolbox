(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){return Math.min(440,Math.max(300,Math.round(e*.34)))}function n(e,t){let n=Math.max(1,t?.panes??1),r=Math.max(180,e.height-48),i=n>1?20*(n-1):0,a=Math.max(180,e.width-24-74-i);return{maxW:Math.max(140,Math.floor(a/n)),maxH:r,paddingRight:74}}function r(e,t){if(!t)return{width:e.width+20,height:e.height+20};let n=1-t.left-t.right,r=1-t.top-t.bottom;return{width:e.width/n,height:e.height/r}}function i(e,t){return e.width<=0||e.height<=0?1:Math.max(.15,Math.min(t.maxW/e.width,t.maxH/e.height))}function a(e){return{decorStatus:!e.rotated&&e.showStatusBar&&e.statusBar!==`none`,showSafari:!e.rotated&&e.showSafari}}function o(e){return{width:e.width,height:e.height}}function ee(e,t,n){return e&&t===`home-indicator`&&!n}var s=`stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`,c={close:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,devices:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,settings:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,rotate:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,reload:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,screenshot:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,video:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,compare:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,launch:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,help:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`},l={phone:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,tablet:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,laptop:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><path d="M2 17h20"/></svg>`,desktop:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,watch:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><circle cx="12" cy="12" r="6"/><path d="M12 6v-2"/><path d="M12 20v-2"/><path d="M6 12H4"/><path d="M20 12h-2"/></svg>`,special:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,all:c.compare,favorites:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,recents:`<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`};function u(e){return e}function d(e){return l[e]??l.all}function f(e){let s=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let l=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),f=u(c.close),p=u(c.devices),m=u(c.settings),h=u(c.rotate),te=u(c.reload),ne=u(c.screenshot),re=u(c.video),g=u(c.compare),ie=u(c.launch),ae=u(c.help),oe=ne,se=re,ce=m,le=e=>d(e),ue=g,_=document.getElementById(s);if(_){if(e.replace&&_.__tbxSimApply)return _.__tbxSimApply(e),!0;if(_.__tbxSimDispose?.(),_.remove(),!e.replace)return!0}let v=document.createElement(`div`);v.id=s,v.setAttribute(`data-tbx-simulator`,`overlay`),v.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let y=v.attachShadow({mode:`open`}),de=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let b={rotated:!1,live:e,ui:e.ui,panel:``,split:!1,focusPane:0,compare:null,rotatedCompare:!1,lastCaptureUrl:``,lastCaptureName:``,previewReload:0,recordSyncId:0},fe=document.createElement(`style`);fe.textContent=`
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
      padding: 24px 74px 24px 24px;
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
  `,y.append(fe);let x=document.createElement(`div`);x.className=`root`,x.setAttribute(`role`,`dialog`),x.setAttribute(`aria-modal`,`true`),x.setAttribute(`aria-label`,`${e.label} mobile simulator`),x.style.setProperty(`--tbx-fill`,e.finish.fill),x.style.setProperty(`--tbx-ring`,e.finish.ring),x.style.setProperty(`--tbx-button`,e.finish.button),x.classList.toggle(`theme-dark`,e.ui.theme===`dark`),x.classList.toggle(`theme-classic`,e.ui.theme!==`dark`);let pe=()=>`
        <div class="actions">
          <div class="actions-primary">
            <button type="button" class="rail-btn" data-act="close" aria-label="Close simulator"><span class="rail-tip">Close simulator</span>${f}</button>
            <button type="button" class="rail-btn" data-act="devices" aria-label="Change device"><span class="rail-tip">Change device</span>${p}</button>
            <button type="button" class="rail-btn" data-act="settings" aria-label="Settings"><span class="rail-tip">Configuration</span>${m}</button>
          </div>
          <div class="actions-scroll">
            <button type="button" class="rail-btn" data-act="rotate" aria-label="Rotate"><span class="rail-tip">Change orientation</span>${h}</button>
            <button type="button" class="rail-btn" data-act="reload" aria-label="Reload"><span class="rail-tip">Reload page</span>${te}</button>
            <button type="button" class="rail-btn" data-act="screenshot" aria-label="Screenshot"><span class="rail-tip">Take a screenshot</span>${ne}</button>
            <button type="button" class="rail-btn" data-act="record" aria-label="Start recording"><span class="rail-tip">Record video</span>${re}</button>
            <button type="button" class="rail-btn" data-act="compare" aria-label="Compare devices"><span class="rail-tip">Compare devices</span>${g}</button>
            <button type="button" class="rail-btn" data-act="help" aria-label="Help center"><span class="rail-tip">Help center</span>${ae}</button>
            <button type="button" class="rail-btn" data-act="expand" aria-label="Open full simulator"><span class="rail-tip">Open full simulator</span>${ie}</button>
          </div>
        </div>`,me=(t,n,r)=>`
      <section class="sim-pane${t===`0`?` is-focus`:``}" data-pane="${t}" ${r?`hidden`:``}>
        <p class="pane-caption">${n}</p>
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
                <iframe title="${l(e.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
                <div class="blocked">This site blocked the in-page preview.<br/><a class="studio-link" target="_blank" rel="noopener noreferrer">Open full simulator</a></div>
              </div>
              <div class="safari" hidden>
                <div class="url-pill">
                  <span aria-hidden="true">AA</span>
                  <span class="host"></span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>
                </div>
                <div class="safari-tools" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>`;x.innerHTML=`
    <div class="stage">
      ${me(`0`,`Left`,!1)}
      ${me(`1`,`Right`,!0)}
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
              <p class="device-current-name" data-current-device-name>${l(e.label)}</p>
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
        ${ce}
        <h2>Configuration</h2>
      </div>
      <div class="setting-list">
        <div class="setting-card">
          <p class="setting-section">Appearance</p>
          <div class="theme-pick" role="group" aria-label="Simulator theme">
            <button type="button" class="theme-opt" data-theme="classic" aria-pressed="${e.ui.theme!==`dark`}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
              Light
            </button>
            <button type="button" class="theme-opt" data-theme="dark" aria-pressed="${e.ui.theme===`dark`}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
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
        ${oe}
        <h2>Take a screenshot</h2>
      </div>
      <p class="capture-hint">Choose how to export the capture from this tab.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-shot="simulator">
          <span class="menu-option-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Capture with the device</span>
            <span class="menu-option-desc">Frame, status bar, and on-screen chrome</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-shot="viewport">
          <span class="menu-option-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg></span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Capture the entire tab</span>
            <span class="menu-option-desc">Everything visible in this browser tab</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="record-menu">
      <div class="popover-head">
        ${se}
        <h2>Record a screen video</h2>
      </div>
      <div data-record-idle>
        <p class="capture-hint">Record the simulator and page together in this tab.</p>
        <div class="menu-options">
          <button type="button" class="menu-option" data-record="tab">
            <span class="menu-option-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg></span>
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
            <span class="menu-option-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none"/></svg></span>
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
        ${g}
        <h2>Compare devices</h2>
      </div>
      <p class="capture-hint">Split this tab into two matching simulators, or open the full studio grid.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-compare="split">
          <span class="menu-option-icon">${ue}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Split this tab</span>
            <span class="menu-option-desc">Same UI left and right — pick a second device</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-compare="studio">
          <span class="menu-option-icon">${ie}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Open studio comparison</span>
            <span class="menu-option-desc">Multi-device grid in the full simulator</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="capture-result">
      <div class="popover-head">
        ${oe}
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
        ${ae}
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
    ${pe()}
  `,y.append(x);let he=e=>{let t=y.querySelector(`[data-pane="${e}"]`);return{pane:t,wrap:t.querySelector(`.phone-wrap`),inner:t.querySelector(`.phone-inner`),chassis:t.querySelector(`.chassis`),screen:t.querySelector(`.screen`),iframe:t.querySelector(`iframe`),mockupImg:t.querySelector(`.mockup-img`),cutout:t.querySelector(`.cutout`),safari:t.querySelector(`.safari`),home:t.querySelector(`.home`),status:t.querySelector(`.status`),hostLabel:t.querySelector(`.host`),blocked:t.querySelector(`.blocked`),previewLoading:t.querySelector(`[data-preview-loading]`)}},S=he(0),C=he(1),ge=S.iframe,_e=y.querySelector(`.stage`);S.hostLabel.textContent=e.hostname;let w=0,T=(e,t)=>{e.previewLoading.dataset.active=t?`true`:`false`,e.previewLoading.setAttribute(`aria-hidden`,t?`false`:`true`)},ve=e=>{w+=1,T(e,!0)},ye=e=>{w=Math.max(0,w-1),T(e,w!==0&&e.previewLoading.dataset.active===`true`),w===0&&(T(S,!1),T(C,!1))},E=(e,t)=>{e.iframe.getAttribute(`src`)!==t&&(ve(e),e.blocked.style.display=`none`,e.iframe.src=t)},be=e=>{E(S,e),b.split&&E(C,e)};ve(S),ge.src=e.url;for(let t of y.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let xe=()=>{let e=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`});for(let t of y.querySelectorAll(`.clock`))t.textContent=e};xe();let Se=window.setInterval(xe,3e4),D={devices:[],favorites:[],recents:[],current:e.deviceId},O=`phone`,Ce=y.querySelector(`.device-search`),k=y.querySelector(`[data-kind-tabs]`),A=y.querySelector(`[data-device-list]`),we=y.querySelector(`.actions`),j=e=>we.querySelector(`[data-act="${e}"]`)??y.querySelector(`.actions [data-act="${e}"]`),M=(e,t)=>{for(let n of y.querySelectorAll(`.actions [data-act="${e}"]`))n.setAttribute(`aria-pressed`,String(t))},Te=y.querySelector(`[data-panel="shot-menu"]`),N=y.querySelector(`[data-panel="record-menu"]`),Ee=y.querySelector(`[data-panel="capture-result"]`),De=y.querySelector(`[data-panel="settings"]`),Oe=y.querySelector(`[data-panel="compare-menu"]`),ke=y.querySelector(`[data-panel="help"]`),Ae=N.querySelector(`[data-record-idle]`),je=N.querySelector(`[data-record-active]`),P=N.querySelector(`[data-record-status]`),F=async()=>{let e=(await B({type:`RECORDER_STATUS`}))?.session??null,t=!!e&&(e.phase===`pending`||e.phase===`recording`||e.phase===`paused`||e.phase===`stopping`);if(Ae.hidden=t,je.hidden=!t,M(`record`,t||b.panel===`record-menu`),!t){P.textContent=``,P.dataset.phase=`idle`;return}let n=e?.countdownUntil&&e.countdownUntil>Date.now()?Math.ceil((e.countdownUntil-Date.now())/1e3):0;if(n>0){P.textContent=`Recording starts in ${n}s…`,P.dataset.phase=`countdown`;return}if(e?.phase===`stopping`){P.textContent=`Saving recording…`,P.dataset.phase=`recording`;return}P.textContent=e?.phase===`paused`?`Recording paused`:`Recording in progress…`,P.dataset.phase=`recording`},Me=()=>{window.clearInterval(b.recordSyncId),F(),b.recordSyncId=window.setInterval(()=>void F(),400)},I=()=>{window.clearInterval(b.recordSyncId),b.recordSyncId=0},Ne=y.querySelector(`[data-current-device-name]`),Pe=y.querySelector(`[data-current-device-thumb]`),Fe=y.querySelector(`[data-current-device-side]`),Ie=y.querySelector(`[data-device-panel-title]`),Le=()=>b.split&&b.focusPane===1&&b.compare?b.compare:b.live,L=e=>{b.focusPane=e,S.pane.classList.toggle(`is-focus`,e===0),C.pane.classList.toggle(`is-focus`,e===1),z(),b.panel===`devices`&&R()},R=()=>{},z=()=>{let e=Le();Ne.textContent=e.label,Fe&&(Fe.textContent=b.split?b.focusPane===1?`Right device`:`Left device`:`Current device`),Ie&&(Ie.textContent=b.split?`Choose device for this side`:`Change device or compare`);let t=D.devices.find(t=>t.id===e.deviceId);Pe.dataset.kind=t?.kind??`phone`},B=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),V=e=>{x.classList.toggle(`theme-dark`,e===`dark`),x.classList.toggle(`theme-classic`,e!==`dark`)},H=(e,t)=>{e.pane.style.setProperty(`--tbx-fill`,t.finish.fill),e.pane.style.setProperty(`--tbx-ring`,t.finish.ring),e.pane.style.setProperty(`--tbx-button`,t.finish.button),e.iframe.title=t.label,e.hostLabel.textContent=t.hostname},Re=e=>{x.style.setProperty(`--tbx-fill`,e.finish.fill),x.style.setProperty(`--tbx-ring`,e.finish.ring),x.style.setProperty(`--tbx-button`,e.finish.button),x.setAttribute(`aria-label`,`${e.label} mobile simulator`),H(S,e),b.compare&&H(C,b.compare);for(let t of y.querySelectorAll(`.studio-link`))t.href=e.studioUrl},U=()=>{let e=b.ui,t=y.querySelector(`[data-set="safari"]`),n=y.querySelector(`[data-set="status"]`),r=y.querySelector(`[data-set="nav"]`),i=y.querySelector(`[data-set="mobile-ua"]`),a=y.querySelector(`[data-set="unblock"]`);t&&(t.checked=b.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock);for(let t of y.querySelectorAll(`[data-theme]`))t.setAttribute(`aria-pressed`,String(t.dataset.theme===e.theme))},ze=e=>{b.ui=e,V(e.theme),U(),Z()},Be=async()=>{let e=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:b.live.url});e?.theme&&ze(e)},W=async e=>{let t=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:b.live.deviceId,url:b.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;ze(t),n&&be(b.live.url)},G=y.querySelector(`[data-panel="devices"]`),K=(e,t,n,r)=>{if(!e.classList.contains(`open`))return;let i=x.getBoundingClientRect(),a=t.getBoundingClientRect(),o=a.top-i.top+a.height/2,ee=Math.max(12,i.right-a.left+10);e.style.setProperty(n,`${o}px`),e.style.right=`${ee}px`,e.style.left=`auto`,e.style.top=`50%`,e.style.transform=`translateY(-50%)`,e.style.maxHeight=`${r}px`,e.style.height=``},q=e=>{e.addEventListener(`wheel`,t=>{if(t.stopPropagation(),!(e.scrollHeight>e.clientHeight+1)){t.preventDefault();return}let n=e.scrollTop<=0,r=e.scrollTop+e.clientHeight>=e.scrollHeight-1,i=t.deltaY;if(i<0&&n||i>0&&r){t.preventDefault();return}let a=e.scrollTop+i;a!==e.scrollTop&&(e.scrollTop=a,t.preventDefault())},{passive:!1})},J=()=>{if(!G.classList.contains(`open`))return;let e=t(window.innerWidth),n=Math.min(Math.round(window.innerHeight*.88),820),r=x.getBoundingClientRect(),i=j(`devices`).getBoundingClientRect(),a=i.top-r.top+i.height/2,o=Math.max(12,r.right-i.left+10);G.style.setProperty(`--tbx-device-arrow-y`,`${a}px`),G.style.right=`${o}px`,G.style.left=`auto`,G.style.top=`50%`,G.style.transform=`translateY(-50%)`,G.style.width=`${e}px`,G.style.height=`${n}px`,G.style.maxHeight=`${n}px`},Y=()=>{let e=Math.min(window.innerHeight*.72,520);b.panel===`shot-menu`&&K(Te,j(`screenshot`),`--tbx-rail-arrow-y`,e),b.panel===`record-menu`&&K(N,j(`record`),`--tbx-rail-arrow-y`,e),b.panel===`capture-result`&&K(Ee,j(`screenshot`),`--tbx-rail-arrow-y`,e),b.panel===`compare-menu`&&K(Oe,j(`compare`),`--tbx-rail-arrow-y`,e),b.panel===`help`&&K(ke,j(`help`),`--tbx-help-arrow-y`,e)},X=()=>{K(De,j(`settings`),`--tbx-settings-arrow-y`,Math.min(window.innerHeight*.72,520))},Ve=(e,t,n,s)=>{let c=n?t.height:t.width,l=n?t.width:t.height,u=t.mockupUrl&&t.mockupInsets?t.mockupInsets:null,d=u?n?{left:u.bottom,top:u.left,right:u.top,bottom:u.right}:u:null,f=r({width:c,height:l},d),p=i(f,s);if(e.pane.classList.toggle(`has-mockup`,!!u),e.chassis.classList.toggle(`landscape`,n),e.pane.classList.toggle(`landscape`,n),e.pane.style.setProperty(`--tbx-fill`,t.finish.fill),e.pane.style.setProperty(`--tbx-ring`,t.finish.ring),e.pane.style.setProperty(`--tbx-button`,t.finish.button),e.inner.style.width=`${f.width}px`,e.inner.style.height=`${f.height}px`,e.inner.style.transform=`scale(${p})`,e.wrap.style.width=`${Math.round(f.width*p)}px`,e.wrap.style.height=`${Math.round(f.height*p)}px`,d){let n=1-d.left-d.right,r=1-d.top-d.bottom;e.screen.style.width=`${n*100}%`,e.screen.style.height=`${r*100}%`,e.screen.style.left=`${d.left*100}%`,e.screen.style.top=`${d.top*100}%`,e.mockupImg.hidden=!1,e.mockupImg.src=t.mockupUrl??``,e.pane.style.setProperty(`--tbx-mockup-w`,`${f.width}px`),e.pane.style.setProperty(`--tbx-mockup-h`,`${f.height}px`)}else e.screen.style.left=``,e.screen.style.top=``,e.screen.style.width=`${c}px`,e.screen.style.height=`${l}px`,e.mockupImg.hidden=!0,e.mockupImg.removeAttribute(`src`);let m=a({hasMockup:!!u,rotated:n,showStatusBar:b.ui.showStatusBar,statusBar:t.statusBar,showSafari:t.showSafari}),h=o({width:c,height:l}),te=t.notch===`punch-hole`?`punch`:t.notch;e.cutout.className=!u&&t.notch!==`none`?`cutout ${te}`:`cutout`,e.safari.hidden=!m.showSafari,e.screen.classList.toggle(`safari-visible`,m.showSafari),e.home.hidden=!ee(b.ui.showNavBar,t.navBar,n),e.status.style.display=m.decorStatus?``:`none`,e.status.dataset.bar=t.statusBar===`android`?`android`:`ios`,e.iframe.setAttribute(`width`,String(h.width)),e.iframe.setAttribute(`height`,String(h.height)),e.iframe.title=t.label,e.hostLabel.textContent=t.hostname},Z=()=>{let e=b.split&&b.compare?2:1,t=n({width:window.innerWidth,height:window.innerHeight},{panes:e});x.classList.toggle(`is-split`,e===2),x.classList.toggle(`has-mockup`,!!(b.live.mockupUrl&&b.live.mockupInsets)),x.classList.toggle(`landscape`,b.rotated),_e.style.paddingRight=`${t.paddingRight}px`,Ve(S,b.live,b.rotated,t),e===2&&b.compare?(C.pane.hidden=!1,Ve(C,b.compare,b.rotatedCompare,t)):C.pane.hidden=!0,U(),J(),requestAnimationFrame(()=>{J(),Y(),X()})},He=(e,t,n,r)=>O===`favorites`&&!n.has(e.id)||O===`recents`&&!r.has(e.id)||O!==`all`&&O!==`favorites`&&O!==`recents`&&e.kind!==O?!1:!t||`${e.label} ${e.id} ${e.kind} ${e.manufacturer}`.toLowerCase().includes(t),Ue=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===Le().deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`
      ${`<span class="device-thumb" data-kind="${l(e.kind)}" aria-hidden="true"></span>`}
      <span class="device-copy">
        <span class="device-name">${l(e.label)}</span>
        <span class="device-meta">${e.width}×${e.height}</span>
      </span>`,t},We=(e,t,n)=>e===`favorites`?D.devices.filter(e=>t.has(e.id)).length:e===`recents`?D.recents.filter(e=>D.devices.some(t=>t.id===e)).length:e===`all`?D.devices.length:D.devices.filter(t=>t.kind===e).length,Ge=(e,t)=>{k.replaceChildren(...[{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktop`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`},{id:`all`,label:`All`},{id:`favorites`,label:`Stars`},{id:`recents`,label:`Recent`}].map(n=>{let r=document.createElement(`button`);r.type=`button`,r.className=`kind-tab`,r.dataset.kind=n.id,r.setAttribute(`role`,`tab`),r.setAttribute(`aria-pressed`,String(O===n.id)),r.setAttribute(`aria-selected`,String(O===n.id));let i=We(n.id,e,t);return r.innerHTML=`<span class="kind-icon-plate">${le(n.id)}</span><span>${n.label}</span><span class="kind-count">${i}</span>`,r}))},Ke=e=>{let t=new Map;for(let n of e){let e=n.manufacturer||`Other`,r=t.get(e)??[];r.push(n),t.set(e,r)}return[...t.entries()].sort(([e],[t])=>e.localeCompare(t))};R=()=>{let e=Ce.value.trim().toLowerCase(),t=new Set(D.favorites),n=new Set(D.recents),r=D.devices.filter(r=>He(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(Ue(e))};if(O===`recents`&&!e)a(`Recent devices`,D.recents.map(e=>D.devices.find(t=>t.id===e)).filter(e=>!!e));else if(O===`favorites`&&!e)a(`Favorite devices`,D.devices.filter(e=>t.has(e.id)));else{let e=[...r].sort((e,t)=>e.label.localeCompare(t.label));for(let[t,n]of Ke(e))a(t,n)}if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}A.replaceChildren(...i),Ge(t,n),z(),requestAnimationFrame(()=>{J()})};let qe=y.querySelector(`[data-capture-preview]`),Je=y.querySelector(`[data-capture-title]`),Q=(e,t=!1)=>{b.panel=t?e:b.panel===e?``:e;for(let e of y.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===b.panel);M(`devices`,b.panel===`devices`),M(`settings`,b.panel===`settings`),M(`compare`,b.split||b.panel===`compare-menu`),M(`help`,b.panel===`help`),Z(),b.panel===`devices`?(Ze(),requestAnimationFrame(()=>{J()})):b.panel===`settings`?(Be(),requestAnimationFrame(()=>{X(),requestAnimationFrame(()=>X())})):b.panel===`help`?requestAnimationFrame(()=>Y()):b.panel===`record-menu`?(Me(),requestAnimationFrame(()=>Y())):b.panel===`shot-menu`||b.panel===`capture-result`||b.panel===`compare-menu`?(I(),requestAnimationFrame(()=>Y())):I(),M(`screenshot`,b.panel===`shot-menu`||b.panel===`capture-result`),M(`record`,b.panel===`record-menu`),b.panel!==`record-menu`&&F()},Ye=(e,t,n)=>{b.lastCaptureUrl=e,b.lastCaptureName=t,qe.src=e,Je.textContent=n===`simulator`?`Capture with the device`:`Capture the entire tab`,Q(`capture-result`,!0)},Xe=async e=>{Q(``);let t=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:b.live.url});if(t?.ok&&t.dataUrl&&t.filename){Ye(t.dataUrl,t.filename,t.kind??e);return}Q(`shot-menu`,!0)},Ze=async()=>{let e=await B({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(D=e,R())};v.__tbxSimApply=e=>{b.split&&b.focusPane===1?(b.compare=e,b.rotatedCompare=!1,H(C,e),C.iframe.getAttribute(`src`)!==e.url&&E(C,e.url)):(b.live=e,b.ui=e.ui,b.rotated=!1,V(e.ui.theme),Re(e),ge.getAttribute(`src`)!==e.url&&E(S,e.url)),Z(),b.panel===`devices`&&R(),z()},Re(e),U(),z(),Z();let Qe=e=>{e.iframe.addEventListener(`load`,()=>{ye(e);try{let t=e.iframe.contentWindow?.location.href??``;(t.startsWith(`chrome-error:`)||t.includes(`chromewebdata`))&&(e.blocked.style.display=`flex`)}catch{}})};Qe(S),Qe(C);let $e=()=>Z();window.addEventListener(`resize`,$e);let et=(e,t)=>{try{let t=e.iframe.contentWindow?.location.href;if(t&&!t.startsWith(`about:`))return t}catch{}return e.iframe.src||t},tt=(e,t)=>{e.blocked.style.display=`none`,ve(e);try{e.iframe.contentWindow?.location.reload();return}catch{}try{let n=new URL(et(e,t));n.hash=`tbx-sim-reload=${++b.previewReload}`,e.iframe.src=n.href}catch{b.previewReload+=1;let n=t.split(`#`)[0];e.iframe.src=`${n}#tbx-sim-reload=${b.previewReload}`}},nt=()=>{tt(S,b.live.url),b.split&&tt(C,b.compare?.url??b.live.url)},rt=()=>{b.split=!0,b.compare={...b.live},b.rotatedCompare=b.rotated,C.pane.hidden=!1,E(C,b.live.url),L(1),M(`compare`,!0),Z(),Q(`devices`,!0)},it=()=>{b.split=!1,b.compare=null,b.rotatedCompare=!1,b.focusPane=0,C.pane.hidden=!0,S.pane.classList.add(`is-focus`),C.pane.classList.remove(`is-focus`),M(`compare`,!1),Z(),z()},at=e=>{let t=e.metaKey||e.ctrlKey;if(e.key===`F5`||t&&!e.shiftKey&&e.key.toLowerCase()===`r`){e.preventDefault(),e.stopPropagation(),nt();return}if(e.key===`Escape`){if(e.preventDefault(),b.panel){Q(``);return}$()}},$=()=>{B({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(Se),window.removeEventListener(`resize`,$e),I(),document.removeEventListener(`keydown`,at,!0),document.documentElement.style.overflow=de,v.remove()};v.__tbxSimDispose=$,document.addEventListener(`keydown`,at,!0),x.addEventListener(`click`,e=>{let t=e.target?.closest(`.actions [data-act]`);if(!t||!x.contains(t))return;let n=t.dataset.act;if(!n)return;e.preventDefault(),e.stopPropagation();let r=b.split?b.focusPane:0,i=t.closest(`.actions`);i&&(we=i);let a=r===1?C:S,o=r===1?b.compare?.url??b.live.url:b.live.url;if(n===`close`){$();return}if(n===`devices`){b.split&&b.panel===`devices`||Q(`devices`);return}if(n===`settings`){Q(`settings`);return}if(n===`help`){Q(`help`);return}if(n===`rotate`){r===1?b.rotatedCompare=!b.rotatedCompare:b.rotated=!b.rotated,Z();return}if(n===`reload`){e.preventDefault(),e.stopPropagation(),tt(a,o);return}if(n===`screenshot`){e.preventDefault(),e.stopPropagation(),b.panel===`shot-menu`||b.panel===`capture-result`?Q(``):Q(`shot-menu`,!0);return}if(n===`record`){e.preventDefault(),e.stopPropagation(),b.panel===`record-menu`?Q(``):Q(`record-menu`,!0);return}if(n===`compare`){if(b.split){it(),Q(``);return}Q(`compare-menu`);return}n===`expand`&&B({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:o,deviceId:(r===1?b.compare:b.live)?.deviceId??b.live.deviceId})},!0),y.querySelector(`[data-act="report-bug"]`)?.addEventListener(`click`,()=>{try{let e=chrome.runtime.getURL(`options.html#/support`);window.open(e,`_blank`,`noopener`)}catch{}Q(``)});let ot=De.querySelector(`.setting-list`);q(A),q(k);for(let e of y.querySelectorAll(`.actions-scroll`))q(e);return q(ot),Ce.addEventListener(`input`,()=>R()),k.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(O=t,R())}),A.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(B({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:b.live.url}),b.split||Q(``))}),y.querySelector(`[data-panel="settings"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-theme]`)?.dataset.theme;(t===`classic`||t===`dark`)&&b.ui.theme!==t&&(b.ui={...b.ui,theme:t},V(t),U(),W({theme:t}))}),y.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){b.live={...b.live,showSafari:t.checked},b.compare&&={...b.compare,showSafari:t.checked},Z();return}if(n===`status`){W({showStatusBar:t.checked});return}if(n===`nav`){W({showNavBar:t.checked});return}if(n===`mobile-ua`){W({mobileUa:t.checked});return}n===`unblock`&&W({unblock:t.checked})}),y.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&Xe(t)}),y.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-record]`)?.dataset.record;if(t===`tab`){B({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:b.live.url}).then(()=>F());return}t===`stop`&&B({type:`SIMULATOR_OVERLAY_ACTION`,action:`recordStop`,url:b.live.url}).then(()=>{F(),Q(``)})}),chrome.runtime.onMessage.addListener(e=>((e?.type===`RECORDER_FINISHED`||e?.type===`RECORDER_STARTED`||e?.type===`RECORDER_COUNTDOWN_BEGIN`)&&F(),!1)),y.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!b.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=b.lastCaptureUrl,e.download=b.lastCaptureName||`simulator.png`,e.click()}),y.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>Q(``)),S.pane.addEventListener(`click`,()=>{b.split&&L(0)}),C.pane.addEventListener(`click`,()=>{b.split&&L(1)}),y.querySelector(`[data-panel="compare-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-compare]`);if(!t)return;let n=t.dataset.compare;if(Q(``),n===`split`){rt();return}B({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:b.live.url,deviceId:b.live.deviceId})}),document.documentElement.append(v),Z(),y.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=f})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;