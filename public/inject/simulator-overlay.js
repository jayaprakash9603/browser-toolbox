(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=.15;function n(e){return Math.min(440,Math.max(300,Math.round(e*.34)))}function r(e,t){let r=t?n(e.width):0,i=92+(r?r+20:0),a=Math.max(180,e.height-48),o=Math.max(180,e.width-24-92),s=Math.max(180,e.width-24-i),c=t&&s>=280;return{maxW:c?s:o,maxH:a,pickerWidth:r,paddingRight:c?i:92,dockPicker:c}}function i(e,t){if(!t)return{width:e.width+20,height:e.height+20};let n=1-t.left-t.right,r=1-t.top-t.bottom;return{width:e.width/n,height:e.height/r}}function a(e,n){return e.width<=0||e.height<=0?1:Math.max(t,Math.min(n.maxW/e.width,n.maxH/e.height))}function o(e){let t=`tbx-simulator-overlay`;if(window!==window.top)return!1;document.getElementById(`tbx-simulator-veil`)?.remove(),delete document.documentElement.dataset.tbxSimVeil;let o=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),s=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>`,c=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>`,l=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>`,u=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,d=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,f=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,ee={all:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,favorites:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.3 6.2 21l1.6-6.6L2 9.3l6.8-.5L12 2l3.2 6.8 6.8.5-5.8 5.1 1.6 6.6z"/></svg>`,recents:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,phone:l.replace(`width="16" height="16"`,``),tablet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></svg>`,laptop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="12" rx="1"/><path d="M2 19h20"/></svg>`,desktop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="1"/><path d="M8 22h8M12 18v4"/></svg>`,watch:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2h6M9 22h6"/></svg>`,special:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`},te=c.replace(`width="16" height="16"`,``),p=document.getElementById(t);if(p){if(e.replace&&p.__tbxSimApply)return p.__tbxSimApply(e),!0;if(p.__tbxSimDispose?.(),p.remove(),!e.replace)return!0}let m=document.createElement(`div`);m.id=t,m.setAttribute(`data-tbx-simulator`,`overlay`),m.style.cssText=`all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;`;let h=m.attachShadow({mode:`open`}),ne=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`;let g={rotated:!1,live:e,ui:e.ui,panel:``,lastCaptureUrl:``,lastCaptureName:``,previewReload:0,recordSyncId:0},_=document.createElement(`style`);_.textContent=`
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
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      padding: 24px 92px 24px 24px;
    }
    .phone-wrap {
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
      filter: drop-shadow(0 28px 64px rgba(15,23,42,0.18));
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
    .popover-head svg { flex-shrink: 0; opacity: 0.95; color: var(--tbx-panel-muted); }
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
      right: 76px;
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
      background: #eff6ff;
      border-color: #2563eb;
      color: #1e3a8a;
      box-shadow: 0 0 0 1px #2563eb;
    }
    .root.theme-dark .device-row[aria-current="true"] {
      background: #163056;
      border-color: #60a5fa;
      color: #dbeafe;
      box-shadow: 0 0 0 1px #60a5fa;
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
  `,h.append(_);let v=document.createElement(`div`);v.className=`root`,v.setAttribute(`role`,`dialog`),v.setAttribute(`aria-modal`,`true`),v.setAttribute(`aria-label`,`${e.label} mobile simulator`),v.style.setProperty(`--tbx-fill`,e.finish.fill),v.style.setProperty(`--tbx-ring`,e.finish.ring),v.style.setProperty(`--tbx-button`,e.finish.button),v.classList.toggle(`theme-dark`,e.ui.theme===`dark`),v.classList.toggle(`theme-classic`,e.ui.theme!==`dark`),v.innerHTML=`
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
            <iframe title="${o(e.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
                ${s}
              </div>
              <div class="safari-tools" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${c}
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
              <p class="device-current-name" data-current-device-name>${o(e.label)}</p>
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
        ${f}
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
        ${u}
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
        ${d}
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
        ${c}
        <h2>Compare devices</h2>
      </div>
      <p class="capture-hint">Open comparison tools in the full simulator studio.</p>
      <div class="menu-options">
        <button type="button" class="menu-option" data-compare="grid">
          <span class="menu-option-icon">${te}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Compare devices</span>
            <span class="menu-option-desc">Side-by-side device grid in studio</span>
          </span>
        </button>
        <button type="button" class="menu-option" data-compare="visible">
          <span class="menu-option-icon">${te}</span>
          <span class="menu-option-copy">
            <span class="menu-option-title">Visible devices in the tab</span>
            <span class="menu-option-desc">Multi-device layout for this preview</span>
          </span>
        </button>
      </div>
    </div>
    <div class="panel rail-popover" data-panel="capture-result">
      <div class="popover-head">
        ${u}
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
        <button type="button" class="round" data-act="devices" aria-label="Change device">${l}</button>
        <button type="button" class="round" data-act="settings" aria-label="Settings">${f}</button>
      </div>
      <div class="actions-scroll">
        <button type="button" class="round" data-act="rotate" aria-label="Rotate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg></button>
        <button type="button" class="round" data-act="reload" aria-label="Reload">${s}</button>
        <button type="button" class="round" data-act="screenshot" aria-label="Screenshot">${u}</button>
        <button type="button" class="round" data-act="record" aria-label="Start recording">${d}</button>
        <button type="button" class="round" data-act="compare" aria-label="Compare devices">${c}</button>
        <button type="button" class="round" data-act="expand" aria-label="Open full simulator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
      </div>
    </div>
  `,h.append(v);let y=h.querySelector(`.screen`),b=h.querySelector(`iframe`),re=h.querySelector(`.clock`),ie=h.querySelector(`.cutout`),ae=h.querySelector(`.safari`),oe=h.querySelector(`.home`),se=h.querySelector(`.android-nav`),x=h.querySelector(`.blocked`),ce=h.querySelector(`[data-preview-loading]`),le=h.querySelector(`.host`),ue=h.querySelector(`.chassis`),de=h.querySelector(`.status`),fe=h.querySelector(`.phone-wrap`),S=h.querySelector(`.phone-inner`),pe=h.querySelector(`.stage`),C=h.querySelector(`.mockup-img`);le.textContent=e.hostname;let w=0,T=e=>{ce.dataset.active=e?`true`:`false`,ce.setAttribute(`aria-hidden`,e?`false`:`true`)},E=()=>{w+=1,T(!0)},me=()=>{w=Math.max(0,w-1),w===0&&T(!1)},D=e=>{b.getAttribute(`src`)!==e&&(E(),x.style.display=`none`,b.src=e)};E(),b.src=e.url;for(let t of h.querySelectorAll(`.studio-link`))t.href=e.studioUrl;let he=()=>{re.textContent=new Date().toLocaleTimeString(void 0,{hour:`numeric`,minute:`2-digit`})};he();let ge=window.setInterval(he,3e4),O={devices:[],favorites:[],recents:[],current:e.deviceId},k=`phone`,_e=h.querySelector(`.device-search`),A=h.querySelector(`[data-kind-tabs]`),j=h.querySelector(`[data-device-list]`),M=h.querySelector(`[data-act="devices"]`),N=h.querySelector(`[data-act="screenshot"]`),P=h.querySelector(`[data-act="settings"]`),ve=h.querySelector(`[data-act="compare"]`),F=h.querySelector(`[data-act="record"]`),ye=h.querySelector(`[data-panel="shot-menu"]`),I=h.querySelector(`[data-panel="record-menu"]`),be=h.querySelector(`[data-panel="capture-result"]`),xe=h.querySelector(`[data-panel="settings"]`),Se=h.querySelector(`[data-panel="compare-menu"]`),Ce=I.querySelector(`[data-record-idle]`),we=I.querySelector(`[data-record-active]`),L=I.querySelector(`[data-record-status]`),R=async()=>{let e=(await V({type:`RECORDER_STATUS`}))?.session??null,t=!!e&&(e.phase===`pending`||e.phase===`recording`||e.phase===`paused`||e.phase===`stopping`);if(Ce.hidden=t,we.hidden=!t,F.setAttribute(`aria-pressed`,String(t)),!t){L.textContent=``,L.dataset.phase=`idle`;return}let n=e?.countdownUntil&&e.countdownUntil>Date.now()?Math.ceil((e.countdownUntil-Date.now())/1e3):0;if(n>0){L.textContent=`Recording starts in ${n}s…`,L.dataset.phase=`countdown`;return}if(e?.phase===`stopping`){L.textContent=`Saving recording…`,L.dataset.phase=`recording`;return}L.textContent=e?.phase===`paused`?`Recording paused`:`Recording in progress…`,L.dataset.phase=`recording`},Te=()=>{window.clearInterval(g.recordSyncId),R(),g.recordSyncId=window.setInterval(()=>void R(),400)},z=()=>{window.clearInterval(g.recordSyncId),g.recordSyncId=0},Ee=h.querySelector(`[data-current-device-name]`),De=h.querySelector(`[data-current-device-thumb]`),B=()=>{Ee.textContent=g.live.label;let e=O.devices.find(e=>e.id===g.live.deviceId);De.dataset.kind=e?.kind??`phone`},V=e=>new Promise(t=>{try{chrome.runtime.sendMessage(e,e=>{t(e&&e.ok!==!1?e.data??e:null)})}catch{t(null)}}),Oe=e=>{v.classList.toggle(`theme-dark`,e===`dark`),v.classList.toggle(`theme-classic`,e!==`dark`)},ke=e=>{v.style.setProperty(`--tbx-fill`,e.finish.fill),v.style.setProperty(`--tbx-ring`,e.finish.ring),v.style.setProperty(`--tbx-button`,e.finish.button),v.setAttribute(`aria-label`,`${e.label} mobile simulator`),b.title=e.label,le.textContent=e.hostname;for(let t of h.querySelectorAll(`.studio-link`))t.href=e.studioUrl},H=()=>{let e=g.ui;for(let t of h.querySelectorAll(`[data-theme-opt]`))t.setAttribute(`aria-pressed`,String(t.dataset.themeOpt===e.theme));let t=h.querySelector(`[data-set="safari"]`),n=h.querySelector(`[data-set="status"]`),r=h.querySelector(`[data-set="nav"]`),i=h.querySelector(`[data-set="mobile-ua"]`),a=h.querySelector(`[data-set="unblock"]`);t&&(t.checked=g.live.showSafari),n&&(n.checked=e.showStatusBar),r&&(r.checked=e.showNavBar),i&&(i.checked=e.mobileUa),a&&(a.checked=e.unblock)},Ae=e=>{g.ui=e,Oe(e.theme),H(),X()},je=async()=>{let e=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`getSettings`,url:g.live.url});e?.theme&&Ae(e)},U=async e=>{let t=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`patchSettings`,patch:e,deviceId:g.live.deviceId,url:g.live.url});if(!t?.theme)return;let n=e.mobileUa!==void 0;Ae(t),n&&D(g.live.url)},W=h.querySelector(`[data-panel="devices"]`),Me=h.querySelector(`.actions-scroll`),G=(e,t,n,r)=>{if(!e.classList.contains(`open`))return;let i=v.getBoundingClientRect(),a=t.getBoundingClientRect(),o=a.top-i.top+a.height/2;e.style.setProperty(n,`${o}px`),e.style.right=`76px`,e.style.top=`50%`,e.style.transform=`translateY(-50%)`,e.style.maxHeight=`${r}px`,e.style.height=``},K=e=>{e.addEventListener(`wheel`,t=>{if(t.stopPropagation(),!(e.scrollHeight>e.clientHeight+1)){t.preventDefault();return}let n=e.scrollTop<=0,r=e.scrollTop+e.clientHeight>=e.scrollHeight-1,i=t.deltaY;if(i<0&&n||i>0&&r){t.preventDefault();return}let a=e.scrollTop+i;a!==e.scrollTop&&(e.scrollTop=a,t.preventDefault())},{passive:!1})},q=()=>{if(!W.classList.contains(`open`))return;let e=n(window.innerWidth),t=Math.min(Math.round(window.innerHeight*.88),820),r=v.getBoundingClientRect(),i=M.getBoundingClientRect(),a=i.top-r.top+i.height/2;W.style.setProperty(`--tbx-device-arrow-y`,`${a}px`),W.style.right=`76px`,W.style.top=`50%`,W.style.transform=`translateY(-50%)`,W.style.width=`${e}px`,W.style.height=`${t}px`,W.style.maxHeight=`${t}px`},J=()=>{let e=Math.min(window.innerHeight*.72,520);g.panel===`shot-menu`&&G(ye,N,`--tbx-rail-arrow-y`,e),g.panel===`record-menu`&&G(I,F,`--tbx-rail-arrow-y`,e),g.panel===`capture-result`&&G(be,N,`--tbx-rail-arrow-y`,e),g.panel===`compare-menu`&&G(Se,ve,`--tbx-rail-arrow-y`,e)},Y=()=>{G(xe,P,`--tbx-settings-arrow-y`,Math.min(window.innerHeight*.72,520))},X=()=>{let e=g.live,t=g.rotated?e.height:e.width,n=g.rotated?e.width:e.height,o=g.panel===`devices`,s=r({width:window.innerWidth,height:window.innerHeight},o),c=e.mockupUrl&&e.mockupInsets?e.mockupInsets:null,l=c?g.rotated?{left:c.bottom,top:c.left,right:c.top,bottom:c.right}:c:null,u=i({width:t,height:n},l),d=a(u,s);if(v.classList.toggle(`has-mockup`,!!c),v.classList.toggle(`picker-open`,o),ue.classList.toggle(`landscape`,g.rotated),v.classList.toggle(`landscape`,g.rotated),pe.style.paddingRight=`${s.paddingRight}px`,S.style.width=`${u.width}px`,S.style.height=`${u.height}px`,S.style.transform=`scale(${d})`,fe.style.width=`${Math.round(u.width*d)}px`,fe.style.height=`${Math.round(u.height*d)}px`,l){let t=1-l.left-l.right,n=1-l.top-l.bottom;y.style.width=`${t*100}%`,y.style.height=`${n*100}%`,y.style.left=`${l.left*100}%`,y.style.top=`${l.top*100}%`,C.hidden=!1,C.src=e.mockupUrl??``,v.style.setProperty(`--tbx-mockup-w`,`${u.width}px`),v.style.setProperty(`--tbx-mockup-h`,`${u.height}px`)}else y.style.left=``,y.style.top=``,y.style.width=`${t}px`,y.style.height=`${n}px`,C.hidden=!0,C.removeAttribute(`src`);let f=e.notch===`punch-hole`?`punch`:e.notch;ie.className=!c&&e.notch!==`none`?`cutout ${f}`:`cutout`,ae.hidden=!e.showSafari||g.rotated,oe.hidden=!g.ui.showNavBar||e.navBar!==`home-indicator`,se.hidden=!g.ui.showNavBar||e.navBar!==`android`||g.rotated,de.style.display=!g.ui.showStatusBar||e.statusBar===`none`?`none`:``,H(),q(),requestAnimationFrame(()=>{q(),J(),Y()})},Ne=(e,t,n,r)=>k===`favorites`&&!n.has(e.id)||k===`recents`&&!r.has(e.id)||k!==`all`&&k!==`favorites`&&k!==`recents`&&e.kind!==k?!1:!t||`${e.label} ${e.id} ${e.kind} ${e.manufacturer}`.toLowerCase().includes(t),Pe=e=>{let t=document.createElement(`button`);return t.type=`button`,t.className=`device-row`,t.dataset.device=e.id,e.id===g.live.deviceId&&t.setAttribute(`aria-current`,`true`),t.innerHTML=`
      <span class="device-thumb" data-kind="${o(e.kind)}" aria-hidden="true"></span>
      <span class="device-copy">
        <span class="device-name">${o(e.label)}</span>
        <span class="device-meta">${e.width}×${e.height}</span>
      </span>`,t},Fe=(e,t,n)=>e===`favorites`?O.devices.filter(e=>t.has(e.id)).length:e===`recents`?O.recents.filter(e=>O.devices.some(t=>t.id===e)).length:e===`all`?O.devices.length:O.devices.filter(t=>t.kind===e).length,Ie=(e,t)=>{A.replaceChildren(...[{id:`phone`,label:`Phones`},{id:`tablet`,label:`Tablets`},{id:`laptop`,label:`Laptops`},{id:`desktop`,label:`Desktop`},{id:`watch`,label:`Watch`},{id:`special`,label:`Special`},{id:`all`,label:`All`},{id:`favorites`,label:`Stars`},{id:`recents`,label:`Recent`}].map(n=>{let r=document.createElement(`button`);r.type=`button`,r.className=`kind-tab`,r.dataset.kind=n.id,r.setAttribute(`role`,`tab`),r.setAttribute(`aria-pressed`,String(k===n.id)),r.setAttribute(`aria-selected`,String(k===n.id));let i=Fe(n.id,e,t);return r.innerHTML=`${ee[n.id]??ee.all}<span>${n.label}</span><span class="kind-count">${i}</span>`,r}))},Le=e=>{let t=new Map;for(let n of e){let e=n.manufacturer||`Other`,r=t.get(e)??[];r.push(n),t.set(e,r)}return[...t.entries()].sort(([e],[t])=>e.localeCompare(t))},Z=()=>{let e=_e.value.trim().toLowerCase(),t=new Set(O.favorites),n=new Set(O.recents),r=O.devices.filter(r=>Ne(r,e,t,n)),i=[],a=(e,t)=>{if(!t.length)return;let n=document.createElement(`p`);n.className=`device-section`,n.textContent=e,i.push(n);for(let e of t)i.push(Pe(e))};if(k===`recents`&&!e)a(`Recent devices`,O.recents.map(e=>O.devices.find(t=>t.id===e)).filter(e=>!!e));else if(k===`favorites`&&!e)a(`Favorite devices`,O.devices.filter(e=>t.has(e.id)));else{let e=[...r].sort((e,t)=>e.label.localeCompare(t.label));for(let[t,n]of Le(e))a(t,n)}if(!i.length){let t=document.createElement(`p`);t.className=`capture-hint`,t.style.padding=`8px 6px`,t.textContent=e?`No devices match your search.`:`No devices in this category.`,i.push(t)}j.replaceChildren(...i),Ie(t,n),B(),requestAnimationFrame(()=>{q()})},Re=h.querySelector(`[data-capture-preview]`),ze=h.querySelector(`[data-capture-title]`),Q=(e,t=!1)=>{g.panel=t?e:g.panel===e?``:e;for(let e of h.querySelectorAll(`[data-panel]`))e.classList.toggle(`open`,e.getAttribute(`data-panel`)===g.panel);M.setAttribute(`aria-pressed`,String(g.panel===`devices`)),P.setAttribute(`aria-pressed`,String(g.panel===`settings`)),ve.setAttribute(`aria-pressed`,String(g.panel===`compare-menu`)),X(),g.panel===`devices`?(He(),requestAnimationFrame(()=>{q()})):g.panel===`settings`?(je(),requestAnimationFrame(()=>{Y(),requestAnimationFrame(()=>Y())})):g.panel===`record-menu`?(Te(),requestAnimationFrame(()=>J())):g.panel===`shot-menu`||g.panel===`capture-result`||g.panel===`compare-menu`?(z(),requestAnimationFrame(()=>J())):z(),N.setAttribute(`aria-pressed`,String(g.panel===`shot-menu`||g.panel===`capture-result`)),g.panel!==`record-menu`&&R()},Be=(e,t,n)=>{g.lastCaptureUrl=e,g.lastCaptureName=t,Re.src=e,ze.textContent=n===`simulator`?`Capture with the device`:`Capture the entire tab`,Q(`capture-result`,!0)},Ve=async e=>{Q(``);let t=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`screenshot`,captureMode:e,url:g.live.url});if(t?.ok&&t.dataUrl&&t.filename){Be(t.dataUrl,t.filename,t.kind??e);return}Q(`shot-menu`,!0)},He=async()=>{let e=await V({type:`SIMULATOR_OVERLAY_ACTION`,action:`listDevices`});e?.devices&&(O=e,Z())};m.__tbxSimApply=e=>{g.live=e,g.ui=e.ui,g.rotated=!1,Oe(e.ui.theme),ke(e),b.getAttribute(`src`)!==e.url&&D(e.url),X(),g.panel===`devices`&&Z(),B()},ke(e),H(),B(),X(),b.addEventListener(`load`,()=>{me();try{let e=b.contentWindow?.location.href??``;(e.startsWith(`chrome-error:`)||e.includes(`chromewebdata`))&&(x.style.display=`flex`)}catch{}});let Ue=()=>X();window.addEventListener(`resize`,Ue);let We=()=>{try{let e=b.contentWindow?.location.href;if(e&&!e.startsWith(`about:`))return e}catch{}return b.src||g.live.url},Ge=()=>{x.style.display=`none`,E();try{b.contentWindow?.location.reload();return}catch{}try{let e=new URL(We());e.hash=`tbx-sim-reload=${++g.previewReload}`,b.src=e.href}catch{g.previewReload+=1;let e=g.live.url.split(`#`)[0];b.src=`${e}#tbx-sim-reload=${g.previewReload}`}},Ke=e=>{let t=e.metaKey||e.ctrlKey;if(e.key===`F5`||t&&!e.shiftKey&&e.key.toLowerCase()===`r`){e.preventDefault(),e.stopPropagation(),Ge();return}if(e.key===`Escape`){if(e.preventDefault(),g.panel){Q(``);return}$()}},$=()=>{V({type:`SIMULATOR_OVERLAY_ACTION`,action:`closed`}),window.clearInterval(ge),window.removeEventListener(`resize`,Ue),z(),document.removeEventListener(`keydown`,Ke,!0),document.documentElement.style.overflow=ne,m.remove()};m.__tbxSimDispose=$,document.addEventListener(`keydown`,Ke,!0),h.querySelector(`[data-act="close"]`)?.addEventListener(`click`,()=>$()),h.querySelector(`[data-act="rotate"]`)?.addEventListener(`click`,()=>{g.rotated=!g.rotated,X()}),h.querySelector(`[data-act="reload"]`)?.addEventListener(`click`,e=>{e.preventDefault(),e.stopPropagation(),Ge()}),M.addEventListener(`click`,()=>Q(`devices`)),P.addEventListener(`click`,()=>Q(`settings`));let qe=xe.querySelector(`.setting-list`);return K(j),K(A),K(Me),K(qe),_e.addEventListener(`input`,()=>Z()),A.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-kind]`)?.dataset.kind;t&&(k=t,Z())}),j.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-device]`)?.dataset.device;t&&(V({type:`SIMULATOR_OVERLAY_ACTION`,action:`setDevice`,deviceId:t,url:g.live.url}),Q(``))}),h.querySelector(`[data-panel="settings"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-theme-opt]`);(t?.dataset.themeOpt===`classic`||t?.dataset.themeOpt===`dark`)&&U({theme:t.dataset.themeOpt})}),h.querySelector(`[data-panel="settings"]`)?.addEventListener(`change`,e=>{let t=e.target;if(t.tagName!==`INPUT`||!t.dataset.set)return;let n=t.dataset.set;if(n===`safari`){g.live={...g.live,showSafari:t.checked},X();return}if(n===`status`){U({showStatusBar:t.checked});return}if(n===`nav`){U({showNavBar:t.checked});return}if(n===`mobile-ua`){U({mobileUa:t.checked});return}n===`unblock`&&U({unblock:t.checked})}),h.querySelector(`[data-act="screenshot"]`)?.addEventListener(`click`,()=>Q(`shot-menu`,!0)),h.querySelector(`[data-panel="shot-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-shot]`)?.dataset.shot;(t===`simulator`||t===`viewport`)&&Ve(t)}),F.addEventListener(`click`,()=>{if(F.getAttribute(`aria-pressed`)===`true`){Q(`record-menu`,!0);return}Q(`record-menu`,!0)}),h.querySelector(`[data-panel="record-menu"]`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`[data-record]`)?.dataset.record;if(t===`tab`){V({type:`SIMULATOR_OVERLAY_ACTION`,action:`record`,url:g.live.url}).then(()=>R());return}t===`stop`&&V({type:`SIMULATOR_OVERLAY_ACTION`,action:`recordStop`,url:g.live.url}).then(()=>{R(),Q(``)})}),chrome.runtime.onMessage.addListener(e=>((e?.type===`RECORDER_FINISHED`||e?.type===`RECORDER_STARTED`||e?.type===`RECORDER_COUNTDOWN_BEGIN`)&&R(),!1)),h.querySelector(`[data-capture-download]`)?.addEventListener(`click`,()=>{if(!g.lastCaptureUrl)return;let e=document.createElement(`a`);e.href=g.lastCaptureUrl,e.download=g.lastCaptureName||`simulator.png`,e.click()}),h.querySelector(`[data-capture-close]`)?.addEventListener(`click`,()=>Q(``)),h.querySelector(`[data-act="expand"]`)?.addEventListener(`click`,()=>{V({type:`SIMULATOR_OVERLAY_ACTION`,action:`expand`,url:g.live.url,deviceId:g.live.deviceId})}),h.querySelector(`[data-act="compare"]`)?.addEventListener(`click`,()=>Q(`compare-menu`,!0)),h.querySelector(`[data-panel="compare-menu"]`)?.addEventListener(`click`,e=>{e.target?.closest(`[data-compare]`)&&(Q(``),V({type:`SIMULATOR_OVERLAY_ACTION`,action:`compare`,url:g.live.url,deviceId:g.live.deviceId}))}),document.documentElement.append(m),X(),h.querySelector(`[data-act="devices"]`)?.focus({preventScroll:!0}),!0}e.mountSimulatorOverlay=o})(this.__TBX_SIM_MOUNT_BUNDLE=this.__TBX_SIM_MOUNT_BUNDLE||{}),globalThis.__TBX_MOUNT_SIMULATOR__=globalThis.__TBX_SIM_MOUNT_BUNDLE?.mountSimulatorOverlay;