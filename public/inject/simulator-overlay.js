(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){return Math.min(440,Math.max(300,Math.round(e*.34)))}function n(e){let t=Math.max(180,e.height-48);return{maxW:Math.max(180,e.width-24-74),maxH:t,paddingRight:74}}function r(e,t){if(!t)return{width:e.width+20,height:e.height+20};let n=1-t.left-t.right,r=1-t.top-t.bottom;return{width:e.width/n,height:e.height/r}}function i(e,t){return e.width<=0||e.height<=0?1:Math.max(.15,Math.min(t.maxW/e.width,t.maxH/e.height))}function a(e){return{decorStatus:!e.rotated&&e.showStatusBar&&e.statusBar!==`none`,showSafari:!e.rotated&&e.showSafari}}function ee(e){return{width:e.width,height:e.height}}function te(e,t,n){return e&&t===`home-indicator`&&!n}var o={close:``,devices:``,settings:``,rotate:``,reload:``,screenshot:``,video:``,compare:``,launch:``,help:``,message:``,faq:``};function s(){let e=`simulator/fonts/icomoon.ttf`;try{if(typeof chrome<`u`&&chrome.runtime?.getURL)return chrome.runtime.getURL(e)}catch{}return`/${e}`}function c(e){return`<i class="mdi" aria-hidden="true">${e}</i>`}function l(e){let l=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let u=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),d=s(),f=c(o.close),p=c(o.devices),m=c(o.settings),ne=c(o.rotate),re=c(o.reload),ie=c(o.screenshot),ae=c(o.video),oe=c(o.compare),se=c(o.launch),ce=c(o.help),h=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>`,le=ie,ue=ae,de=m,fe={all:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,favorites:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.3 6.2 21l1.6-6.6L2 9.3l6.8-.5L12 2l3.2 6.8 6.8.5-5.8 5.1 1.6 6.6z"/></svg>`,recents:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,phone:`<svg  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>`,tablet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></svg>`,laptop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="12" rx="1"/><path d="M2 19h20"/></svg>`,desktop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="1"/><path d="M8 22h8M12 18v4"/></svg>`,watch:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2h6M9 22h6"/></svg>`,special:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`},pe=h.replace(`width="16" height="16"`,``),g=document.getElementById(l);if(g){if(e.replace&&g.__tbxSimApply)return g.__tbxSimApply(e),!0;if(g.__tbxSimDispose?.(),g.remove(),!e.replace)return!0}let _=document.createElement(`div`);_.id=l,_.setAttribute(`data-tbx-simulator`,`overlay`),_.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let v=_.attachShadow({mode:`open`}),me=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let y={rotated:!1,live:e,ui:e.ui,panel:``,lastCaptureUrl:``,lastCaptureName:``,previewReload:0,recordSyncId:0},he=document.createElement(`style`);he.textContent=`
    @font-face {
      font-family: 'tbx-sim-icomoon';
      src: url('${d}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
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
    .mdi, [class*='mdi-'] {
      font-family: 'tbx-sim-icomoon' !important;
      speak: never;
      font-style: normal;
      font-weight: normal;
      font-variant: normal;
      text-transform: none;
      line-height: 1;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .root {
      pointer-events: auto;
      position: fixed;
      inset: 0;
      border: 0;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: #484848;
      --tbx-rail-icon: #b6b6b6;
      --tbx-rail-icon-hover: #539fff;
      --tbx-accent: #539fff;
      --tbx-accent-hover: #3a8ef0;
      --tbx-accent-pressed: #2f7ed6;
      --tbx-panel-bg: #fff;
      --tbx-panel-border: #e8e8e8;
      --tbx-panel-muted: #7a7a7a;
      --tbx-row-hover: #f5f5f6;
      --tbx-input-bg: #fafafa;
      --tbx-input-border: #dbdbdb;
      --tbx-hint: #7a7a7a;
      --tbx-menu-bg: #fafafa;
      --tbx-menu-border: #e0e0e0;
    }
    .root.theme-classic {
      background: transparent;
    }
    .root.theme-dark {
      background: transparent;
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
      background: transparent;
    }
    .phone-wrap {
      position: relative;
      flex-shrink: 0;
      overflow: visible;
      filter: drop-shadow(0 18px 40px rgba(0,0,0,0.22));
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
      width: 36px;
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
      --tbx-rail-icon-hover: #539fff;
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
    .rail-btn .mdi, .round .mdi { font-size: 17px; line-height: 1; }
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
    .popover-head svg, .popover-head .mdi { flex-shrink: 0; opacity: 0.95; color: var(--tbx-rail-icon); font-size: 18px; }
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
      box-shadow: 0 2px 10px rgba(83,159,255,0.35);
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
  `,v.append(he);let b=document.createElement(`div`);b.className=`root`,b.setAttribute(`role`,`dialog`),b.setAttribute(`aria-modal`,`true`),b.setAttribute(`aria-label`,`${e.label} mobile simulator`),b.style.setProperty(`--tbx-fill`,e.finish.fill),b.style.setProperty(`--tbx-ring`,e.finish.ring),b.style.setProperty(`--tbx-button`,e.finish.button),b.classList.toggle(`theme-dark`,e.ui.theme===`dark`),b.classList.toggle(`theme-classic`,e.ui.theme!==`dark`),b.innerHTML=`
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
              <iframe title="${u(e.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${h}
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
              <p class="device-current-name" data-current-device-name>${u(e.label)}</p>
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
        ${h}
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
      <p class="capture-hint">Quick answers and support for the mobile simulator.</p>
      <p class="help-section-title">Frequently asked questions</p>
      <ul class="help-list">
        <li><a href="https://www.webmobilefirst.com/en/faq/" target="_blank" rel="noopener">All FAQs</a></li>
        <li><a href="https://www.webmobilefirst.com/en/faq/#scroll" target="_blank" rel="noopener">Scroll inside the device</a></li>
        <li><a href="https://www.webmobilefirst.com/en/faq/#media-queries" target="_blank" rel="noopener">Media queries &amp; responsive</a></li>
        <li><a href="https://www.webmobilefirst.com/en/faq/#shortcuts" target="_blank" rel="noopener">Keyboard shortcuts</a></li>
      </ul>
      <p class="help-section-title">Support</p>
      <ul class="help-list">
        <li><a href="https://www.webmobilefirst.com/en/contact/" target="_blank" rel="noopener">Contact &amp; help center</a></li>
        <li><button type="button" class="help-link" data-act="report-bug">Report a bug</button></li>
        <li><a class="studio-link help-link" href="#">Open full responsive studio</a></li>
      </ul>
    </div>
    <div class="actions">
      <div class="actions-primary">
        <button type="button" class="rail-btn" data-act="close" aria-label="Close simulator"><span class="rail-tip">Close simulator</span>${f}</button>
        <button type="button" class="rail-btn" data-act="devices" aria-label="Change device"><span class="rail-tip">Change device</span>${p}</button>
        <button type="button" class="rail-btn" data-act="settings" aria-label="Settings"><span class="rail-tip">Configuration</span>${m}</button>
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
  `,v.append(b);let x=v.querySelector(`.screen`),S=v.querySelector(`iframe`),ge=v.querySelector(`.clock`),_e=v.querySelector(`.cutout`),ve=v.querySelector(`.safari`),ye=v.querySelector(`.home`),be=v.querySelector(`.android-nav`),C=v.querySelector(`.blocked`),xe=v.querySelector(`[data-preview-loading]`),Se=v.querySelector(`.host`),Ce=v.querySelector(`.chassis`),we=v.querySelector(`.status`),Te=v.querySelector(`.phone-wrap`),w=v.querySelector(`.phone-inner`),Ee=v.querySelector(`.stage`),T=v.querySelector(`.mockup-img`);Se.textContent=e.hostname;let E=0,De=e=>{xe.dataset.active=e?`true`:`false`,xe.setAttribute(`aria-hidden`,e?`false`:`true`)},D=()=>{E+=1,De(!0)},Oe=()=>{E=Math.max(0,E-1),E===0&&De(!1)},ke=e=>{S.getAttribute(`src`)!==e&&(D(),C.style.display=`none`,S.src=e)};D(),S.src=e.url;for(let t of v.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let Ae=()=>{ge.textContent=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`})};Ae();let je=window.setInterval(Ae,3e4),O={devices:[],favorites:[],recents:[],current:e.deviceId},k=`phone`,Me=v.querySelector(`.device-search`),A=v.querySelector(`[data-kind-tabs]`),j=v.querySelector(`[data-device-list]`),M=v.querySelector(`[data-act="devices"]`),N=v.querySelector(`[data-act="screenshot"]`),P=v.querySelector(`[data-act="settings"]`),Ne=v.querySelector(`[data-act="compare"]`),Pe=v.querySelector(`[data-act="help"]`),F=v.querySelector(`[data-act="record"]`),Fe=v.querySelector(`[data-panel="shot-menu"]`),I=v.querySelector(`[data-panel="record-menu"]`),Ie=v.querySelector(`[data-panel="capture-result"]`),Le=v.querySelector(`[data-panel="settings"]`),Re=v.querySelector(`[data-panel="compare-menu"]`),ze=v.querySelector(`[data-panel="help"]`),Be=I.querySelector(`[data-record-idle]`),Ve=I.querySelector(`[data-record-active]`),L=I.querySelector(`[data-record-status]`),R=async()=>{let e=(await V({type:`RECORDER_STATUS`}))?.session??null,t=!!e&&(e.phase===`pending`||e.phase===`recording`||e.phase===`paused`||e.phase===`stopping`);if(Be.hidden=t,Ve.hidden=!t,F.setAttribute(`aria-pressed`,String(t)),!t){L.textContent=``,L.dataset.phase=`idle`;return}let n=e?.countdownUntil&&e.countdownUntil>Date.now()?Math.ceil((e.countdownUntil-Date.now())/1e3):0;if(n>0){L.textContent=`Recording starts in ${n}s…`,L.dataset.phase=`countdown`;return}if(e?.phase===`stopping`){L.textContent=`Saving recording…`,L.dataset.phase=`recording`;return}L.textContent=e?.phase===`paused`?`Recording paused`:`Recording in progress…`,L.dataset.phase=`recording`},He=()=>{window.clearInterval(y.recordSyncId),R(),y.recordSyncId=window.setInterval(()=>void R(),400)},z=()=>{window.clearInterval(y.recordSyncId),y.recordSyncId=0},Ue=v.querySelector(`[data-current-device-name]`),We=v.querySelector(`[data-current-device-thumb]`),B=()=>{Ue.textContent=y.live.label;let e=O.devices.find(e=>e.id===y.live.deviceId);We.dataset.kind=e?.kind??`phone`},V=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),Ge=e=>{b.classList.toggle(`theme-dark`,e===`dark`),b.classList.toggle(`theme-classic`,e!==`dark`)},Ke=e=>{b.style.setProperty(`--tbx-fill`,e.finish.fill),b.style.setProperty(`--tbx-ring`,e.finish.ring),b.style.setProperty(`--tbx-button`,e.finish.button),b.setAttribute(`aria-label`,`${e.label} mobile simulator`),S.title=e.label,Se.textContent=e.hostname;for(let t of v.querySelectorAll(`.studio-link`))t.href=e.studioUrl},H=()=>{let e=y.ui;for(let t of v.querySelectorAll(`[data-theme-opt]`))t.setAttribute(`aria-pressed`,String(t.dataset.themeOpt===e.theme));let t=v.querySelector(`[data-set="safari"]`),n=v.querySelector(`[data-set="status"]`),r=v.querySelector(`[data-set="nav"]`),i=v.querySelector(`[data-set="mobile-ua"]`),a=v.querySelector(`[data-set="unblock"]`);t&&(t.checked=y.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock)},qe=e=>{y.ui=e,Ge(e.theme),H(),X()},Je=async()=>{let e=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:y.live.url});e?.theme&&qe(e)},U=async e=>{let t=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:y.live.deviceId,url:y.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;qe(t),n&&ke(y.live.url)},W=v.querySelector(`[data-panel="devices"]`),Ye=v.querySelector(`.actions-scroll`),G=(e,t,n,r)=>{if(!e.classList.contains(`open`))return;let i=b.getBoundingClientRect(),a=t.getBoundingClientRect(),ee=a.top-i.top+a.height/2;e.style.setProperty(n,`${ee}px`),e.style.right=`58px`,e.style.top=`50%`,e.style.transform=`translateY(-50%)`,e.style.maxHeight=`${r}px`,e.style.height=``},K=e=>{e.addEventListener(`wheel`,t=>{if(t.stopPropagation(),!(e.scrollHeight>e.clientHeight+1)){t.preventDefault();return}let n=e.scrollTop<=0,r=e.scrollTop+e.clientHeight>=e.scrollHeight-1,i=t.deltaY;if(i<0&&n||i>0&&r){t.preventDefault();return}let a=e.scrollTop+i;a!==e.scrollTop&&(e.scrollTop=a,t.preventDefault())},{passive:!1})},q=()=>{if(!W.classList.contains(`open`))return;let e=t(window.innerWidth),n=Math.min(Math.round(window.innerHeight*.88),820),r=b.getBoundingClientRect(),i=M.getBoundingClientRect(),a=i.top-r.top+i.height/2;W.style.setProperty(`--tbx-device-arrow-y`,`${a}px`),W.style.right=`58px`,W.style.top=`50%`,W.style.transform=`translateY(-50%)`,W.style.width=`${e}px`,W.style.height=`${n}px`,W.style.maxHeight=`${n}px`},J=()=>{let e=Math.min(window.innerHeight*.72,520);y.panel===`shot-menu`&&G(Fe,N,`--tbx-rail-arrow-y`,e),y.panel===`record-menu`&&G(I,F,`--tbx-rail-arrow-y`,e),y.panel===`capture-result`&&G(Ie,N,`--tbx-rail-arrow-y`,e),y.panel===`compare-menu`&&G(Re,Ne,`--tbx-rail-arrow-y`,e),y.panel===`help`&&G(ze,Pe,`--tbx-help-arrow-y`,e)},Y=()=>{G(Le,P,`--tbx-settings-arrow-y`,Math.min(window.innerHeight*.72,520))},X=()=>{let e=y.live,t=y.rotated?e.height:e.width,o=y.rotated?e.width:e.height,s=n({width:window.innerWidth,height:window.innerHeight}),c=e.mockupUrl&&e.mockupInsets?e.mockupInsets:null,l=c?y.rotated?{left:c.bottom,top:c.left,right:c.top,bottom:c.right}:c:null,u=r({width:t,height:o},l),d=i(u,s);if(b.classList.toggle(`has-mockup`,!!c),Ce.classList.toggle(`landscape`,y.rotated),b.classList.toggle(`landscape`,y.rotated),Ee.style.paddingRight=`${s.paddingRight}px`,w.style.width=`${u.width}px`,w.style.height=`${u.height}px`,w.style.transform=`scale(${d})`,Te.style.width=`${Math.round(u.width*d)}px`,Te.style.height=`${Math.round(u.height*d)}px`,l){let t=1-l.left-l.right,n=1-l.top-l.bottom;x.style.width=`${t*100}%`,x.style.height=`${n*100}%`,x.style.left=`${l.left*100}%`,x.style.top=`${l.top*100}%`,T.hidden=!1,T.src=e.mockupUrl??``,b.style.setProperty(`--tbx-mockup-w`,`${u.width}px`),b.style.setProperty(`--tbx-mockup-h`,`${u.height}px`)}else x.style.left=``,x.style.top=``,x.style.width=`${t}px`,x.style.height=`${o}px`,T.hidden=!0,T.removeAttribute(`src`);let f=a({hasMockup:!!c,rotated:y.rotated,showStatusBar:y.ui.showStatusBar,statusBar:e.statusBar,showSafari:e.showSafari}),p=ee({width:t,height:o}),m=e.notch===`punch-hole`?`punch`:e.notch;_e.className=!c&&e.notch!==`none`?`cutout ${m}`:`cutout`,ve.hidden=!f.showSafari,x.classList.toggle(`safari-visible`,f.showSafari),ye.hidden=!te(y.ui.showNavBar,e.navBar,y.rotated),be.hidden=!y.ui.showNavBar||e.navBar!==`android`||y.rotated,we.style.display=f.decorStatus?``:`none`,we.dataset.bar=e.statusBar===`android`?`android`:`ios`,S.setAttribute(`width`,String(p.width)),S.setAttribute(`height`,String(p.height)),H(),q(),requestAnimationFrame(()=>{q(),J(),Y()})},Xe=(e,t,n,r)=>k===`favorites`&&!n.has(e.id)||k===`recents`&&!r.has(e.id)||k!==`all`&&k!==`favorites`&&k!==`recents`&&e.kind!==k?!1:!t||`${e.label} ${e.id} ${e.kind} ${e.manufacturer}`.toLowerCase().includes(t),Ze=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===y.live.deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`
      <span class="device-thumb" data-kind="${u(e.kind)}" aria-hidden="true"></span>
      <span class="device-copy">
        <span class="device-name">${u(e.label)}</span>
        <span class="device-meta">${e.width}×${e.height}</span>
      </span>`,t},Qe=(e,t,n)=>e===`favorites`?O.devices.filter(e=>t.has(e.id)).length:e===`recents`?O.recents.filter(e=>O.devices.some(t=>t.id===e)).length:e===`all`?O.devices.length:O.devices.filter(t=>t.kind===e).length,$e=(e,t)=>{A.replaceChildren(...[{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktop`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`},{id:`all`,label:`All`},{id:`favorites`,label:`Stars`},{id:`recents`,label:`Recent`}].map(n=>{let r=document.createElement(`button`);r.type=`button`,r.className=`kind-tab`,r.dataset.kind=n.id,r.setAttribute(`role`,`tab`),r.setAttribute(`aria-pressed`,String(k===n.id)),r.setAttribute(`aria-selected`,String(k===n.id));let i=Qe(n.id,e,t);return r.innerHTML=`${fe[n.id]??fe.all}<span>${n.label}</span><span class="kind-count">${i}</span>`,r}))},et=e=>{let t=new Map;for(let n of e){let e=n.manufacturer||`Other`,r=t.get(e)??[];r.push(n),t.set(e,r)}return[...t.entries()].sort(([e],[t])=>e.localeCompare(t))},Z=()=>{let e=Me.value.trim().toLowerCase(),t=new Set(O.favorites),n=new Set(O.recents),r=O.devices.filter(r=>Xe(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(Ze(e))};if(k===`recents`&&!e)a(`Recent devices`,O.recents.map(e=>O.devices.find(t=>t.id===e)).filter(e=>!!e));else if(k===`favorites`&&!e)a(`Favorite devices`,O.devices.filter(e=>t.has(e.id)));else{let e=[...r].sort((e,t)=>e.label.localeCompare(t.label));for(let[t,n]of et(e))a(t,n)}if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}j.replaceChildren(...i),$e(t,n),B(),requestAnimationFrame(()=>{q()})},tt=v.querySelector(`[data-capture-preview]`),nt=v.querySelector(`[data-capture-title]`),Q=(e,t=!1)=>{y.panel=t?e:y.panel===e?``:e;for(let e of v.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===y.panel);M.setAttribute(`aria-pressed`,String(y.panel===`devices`)),P.setAttribute(`aria-pressed`,String(y.panel===`settings`)),Ne.setAttribute(`aria-pressed`,String(y.panel===`compare-menu`)),Pe.setAttribute(`aria-pressed`,String(y.panel===`help`)),X(),y.panel===`devices`?(at(),requestAnimationFrame(()=>{q()})):y.panel===`settings`?(Je(),requestAnimationFrame(()=>{Y(),requestAnimationFrame(()=>Y())})):y.panel===`help`?requestAnimationFrame(()=>J()):y.panel===`record-menu`?(He(),requestAnimationFrame(()=>J())):y.panel===`shot-menu`||y.panel===`capture-result`||y.panel===`compare-menu`?(z(),requestAnimationFrame(()=>J())):z(),N.setAttribute(`aria-pressed`,String(y.panel===`shot-menu`||y.panel===`capture-result`)),y.panel!==`record-menu`&&R()},rt=(e,t,n)=>{y.lastCaptureUrl=e,y.lastCaptureName=t,tt.src=e,nt.textContent=n===`simulator`?`Capture with the device`:`Capture the entire tab`,Q(`capture-result`,!0)},it=async e=>{Q(``);let t=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:y.live.url});if(t?.ok&&t.dataUrl&&t.filename){rt(t.dataUrl,t.filename,t.kind??e);return}Q(`shot-menu`,!0)},at=async()=>{let e=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(O=e,Z())};_.__tbxSimApply=e=>{y.live=e,y.ui=e.ui,y.rotated=!1,Ge(e.ui.theme),Ke(e),S.getAttribute(`src`)!==e.url&&ke(e.url),X(),y.panel===`devices`&&Z(),B()},Ke(e),H(),B(),X(),S.addEventListener(`load`,()=>{Oe();try{let e=S.contentWindow?.location.href??``;(e.startsWith(`chrome-error:`)||e.includes(`chromewebdata`))&&(C.style.display=`flex`)}catch{}});let ot=()=>X();window.addEventListener(`resize`,ot);let st=()=>{try{let e=S.contentWindow?.location.href;if(e&&!e.startsWith(`about:`))return e}catch{}return S.src||y.live.url},ct=()=>{C.style.display=`none`,D();try{S.contentWindow?.location.reload();return}catch{}try{let e=new URL(st());e.hash=`tbx-sim-reload=${++y.previewReload}`,S.src=e.href}catch{y.previewReload+=1;let e=y.live.url.split(`#`)[0];S.src=`${e}#tbx-sim-reload=${y.previewReload}`}},lt=e=>{let t=e.metaKey||e.ctrlKey;if(e.key===`F5`||t&&!e.shiftKey&&e.key.toLowerCase()===`r`){e.preventDefault(),e.stopPropagation(),ct();return}if(e.key===`Escape`){if(e.preventDefault(),y.panel){Q(``);return}$()}},$=()=>{V({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(je),window.removeEventListener(`resize`,ot),z(),document.removeEventListener(`keydown`,lt,!0),document.documentElement.style.overflow=me,_.remove()};_.__tbxSimDispose=$,document.addEventListener(`keydown`,lt,!0),v.querySelector(`[data-act="close"]`)?.addEventListener(`click`,()=>$()),v.querySelector(`[data-act="rotate"]`)?.addEventListener(`click`,()=>{y.rotated=!y.rotated,X()}),v.querySelector(`[data-act="reload"]`)?.addEventListener(`click`,e=>{e.preventDefault(),e.stopPropagation(),ct()}),M.addEventListener(`click`,()=>Q(`devices`)),P.addEventListener(`click`,()=>Q(`settings`)),Pe.addEventListener(`click`,()=>Q(`help`)),v.querySelector(`[data-act="report-bug"]`)?.addEventListener(`click`,()=>{try{let e=chrome.runtime.getURL(`options.html#/support`);window.open(e,`_blank`,`noopener`)}catch{window.open(`https://www.webmobilefirst.com/en/contact/`,`_blank`,`noopener`)}Q(``)});let ut=Le.querySelector(`.setting-list`);return K(j),K(A),K(Ye),K(ut),Me.addEventListener(`input`,()=>Z()),A.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(k=t,Z())}),j.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(V({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:y.live.url}),Q(``))}),v.querySelector(`[data-panel="settings"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-theme-opt]`);(t?.dataset.themeOpt===`classic`||t?.dataset.themeOpt===`dark`)&&U({theme:t.dataset.themeOpt})}),v.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){y.live={...y.live,showSafari:t.checked},X();return}if(n===`status`){U({showStatusBar:t.checked});return}if(n===`nav`){U({showNavBar:t.checked});return}if(n===`mobile-ua`){U({mobileUa:t.checked});return}n===`unblock`&&U({unblock:t.checked})}),v.querySelector(`[data-act="screenshot"]`)?.addEventListener(`click`,()=>Q(`shot-menu`,!0)),v.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&it(t)}),F.addEventListener(`click`,()=>{if(F.getAttribute(`aria-pressed`)===`true`){Q(`record-menu`,!0);return}Q(`record-menu`,!0)}),v.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-record]`)?.dataset.record;if(t===`tab`){V({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:y.live.url}).then(()=>R());return}t===`stop`&&V({type:`SIMULATOR_OVERLAY_ACTION`,action:`recordStop`,url:y.live.url}).then(()=>{R(),Q(``)})}),chrome.runtime.onMessage.addListener(e=>((e?.type===`RECORDER_FINISHED`||e?.type===`RECORDER_STARTED`||e?.type===`RECORDER_COUNTDOWN_BEGIN`)&&R(),!1)),v.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!y.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=y.lastCaptureUrl,e.download=y.lastCaptureName||`simulator.png`,e.click()}),v.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>Q(``)),v.querySelector(`[data-act="expand"]`)?.addEventListener(`click`,()=>{V({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:y.live.url,deviceId:y.live.deviceId})}),v.querySelector(`[data-act="compare"]`)?.addEventListener(`click`,()=>Q(`compare-menu`,!0)),v.querySelector(`[data-panel="compare-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-compare]`)&&(Q(``),V({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:y.live.url,deviceId:y.live.deviceId}))}),document.documentElement.append(_),X(),v.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=l})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;