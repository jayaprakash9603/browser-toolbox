export const ICONS = {
  parent: ['M14 9 9 4 4 9', 'M20 20h-7a4 4 0 0 1-4-4V4'],
  text: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
  duplicate: ['M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z', 'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2', 'M15 12v6', 'M12 15h6'],
  hide: ['M9.88 9.88a3 3 0 1 0 4.24 4.24', 'M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68', 'M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61', 'M2 2l20 20'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  undo: ['M3 7v6h6', 'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  minimize: ['M5 12h14'],
  expand: ['M12 5v14', 'M5 12h14'],
  copy: ['M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z', 'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2'],
  check: ['M20 6 9 17l-5-5'],
} as const

export type IconName = keyof typeof ICONS

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) {
    svg.setAttribute(key, value)
  }
  for (const d of ICONS[name]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.append(path)
  }
  return svg
}

export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.root {
  --bg: #ffffff; --fg: #0f172a; --muted: #64748b; --line: #e2e8f0; --soft: #f1f5f9; --accent: #6366f1; --accent-fg: #ffffff;
  --margin: rgba(246, 178, 107, 0.45); --padding: rgba(147, 196, 125, 0.45); --content: rgba(111, 168, 220, 0.3);
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483646;
  font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  .root { --bg: #18181b; --fg: #f4f4f5; --muted: #a1a1aa; --line: #303036; --soft: #232327; --accent: #818cf8; --accent-fg: #0b0b0f; }
}
.hover, .sel { position: fixed; border: 1.5px solid var(--accent); border-radius: 2px; display: none; }
.hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
.sel { border-width: 2px; }
.sel.dragging { border-style: dashed; }
.box { position: fixed; display: none; border-style: solid; border-color: var(--margin); }
.box.padding { border-color: var(--padding); }
.box.content { background: var(--content); border: 0; }
.chip {
  position: fixed; display: none; padding: 2px 6px; border-radius: 4px; background: var(--accent); color: var(--accent-fg);
  font: 600 11px/1.4 ui-monospace, "Cascadia Code", Menlo, monospace; white-space: nowrap; max-width: 60vw; overflow: hidden; text-overflow: ellipsis;
}
.handle {
  position: fixed; width: 10px; height: 10px; margin: -5px 0 0 -5px; border: 2px solid var(--accent); border-radius: 3px; background: var(--bg);
  pointer-events: auto; display: none; touch-action: none;
}
.handle::after { content: ""; position: absolute; inset: -8px; }
.guide { position: fixed; background: #ef4444; }
.guide-label {
  position: fixed; transform: translate(-50%, -50%); padding: 1px 5px; border-radius: 4px; background: #ef4444; color: #fff;
  font: 600 10px/1.4 ui-monospace, Menlo, monospace; white-space: nowrap;
}
.tip {
  position: fixed; display: none; width: 260px; max-width: calc(100vw - 16px); padding: 10px; border-radius: 10px;
  background: var(--bg); color: var(--fg); border: 1px solid var(--line);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 12px 32px -8px rgb(0 0 0 / 0.3);
}
.tip-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.tag { font: 600 12px/1.3 ui-monospace, Menlo, monospace; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dim { flex-shrink: 0; font: 11px/1.3 ui-monospace, Menlo, monospace; color: var(--muted); }
.rows { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 10px; }
.k { color: var(--muted); white-space: nowrap; }
.v { font: 11px/1.45 ui-monospace, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
.sw { width: 11px; height: 11px; flex-shrink: 0; border-radius: 3px; border: 1px solid rgb(0 0 0 / 0.15); }
.hint { margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
.panel {
  position: fixed; right: 16px; bottom: 16px; width: 320px; max-width: calc(100vw - 24px); max-height: min(560px, calc(100vh - 24px));
  display: none; flex-direction: column; overflow: hidden; pointer-events: auto; border-radius: 12px;
  background: var(--bg); color: var(--fg); border: 1px solid var(--line);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 20px 48px -12px rgb(0 0 0 / 0.38);
}
.panel.min .body, .panel.min .tabs, .panel.min .tools, .panel.min .foot { display: none; }
.head { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; border-bottom: 1px solid var(--line); cursor: grab; user-select: none; }
.head:active { cursor: grabbing; }
.head .tag { flex: 1; min-width: 0; }
.tools { display: flex; gap: 2px; padding: 6px 8px; border-bottom: 1px solid var(--line); }
.tools .sep { flex: 1; }
button { font: inherit; color: inherit; }
.ib {
  display: inline-grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 7px; background: transparent;
  color: var(--muted); cursor: pointer; transition: background-color .15s, color .15s;
}
.ib:hover { background: var(--soft); color: var(--fg); }
.ib.danger:hover { color: #ef4444; }
.ib:disabled { opacity: .4; cursor: not-allowed; background: transparent; }
.ib svg { width: 16px; height: 16px; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.tabs { display: flex; gap: 2px; margin: 8px 8px 0; padding: 2px; border-radius: 8px; background: var(--soft); }
.tab { flex: 1; height: 26px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-weight: 600; cursor: pointer; }
.tab[aria-selected="true"] { background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12); }
.body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 12px 12px; overscroll-behavior: contain; }
.group { margin: 8px 0 4px; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.field { display: grid; grid-template-columns: 96px minmax(0, 1fr); align-items: center; gap: 8px; margin: 3px 0; }
.field label { color: var(--muted); font: 11px/1.3 ui-monospace, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ctl { display: flex; align-items: center; gap: 6px; min-width: 0; }
input.txt, textarea {
  width: 100%; min-width: 0; height: 28px; padding: 0 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  font: 11px/1.4 ui-monospace, Menlo, monospace;
}
input.txt:focus, textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }
.color { position: relative; width: 28px; height: 28px; flex-shrink: 0; border-radius: 6px; border: 1px solid var(--line); overflow: hidden; }
.color input { position: absolute; inset: -4px; width: 40px; height: 40px; border: 0; padding: 0; opacity: 0; cursor: pointer; }
textarea { height: 220px; padding: 8px; resize: vertical; white-space: pre; tab-size: 2; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid var(--line); border-radius: 7px;
  background: var(--bg); color: var(--fg); font-weight: 600; font-size: 11px; cursor: pointer;
}
.btn:hover { background: var(--soft); }
.foot { margin: 0; padding: 8px 12px; border-top: 1px solid var(--line); }
.btn svg { width: 13px; height: 13px; }
.note { margin: 6px 0 0; color: var(--muted); font-size: 11px; }
.bm { margin: 6px auto 0; max-width: 260px; text-align: center; font: 10px/1.2 ui-monospace, Menlo, monospace; }
.bm div { position: relative; padding: 16px 18px; border: 1px dashed rgb(0 0 0 / 0.25); border-radius: 4px; }
.bm .m { background: var(--margin); }
.bm .b { background: rgba(253, 221, 155, 0.6); border-style: solid; }
.bm .p { background: var(--padding); }
.bm .c { background: var(--content); padding: 8px; color: var(--fg); font-weight: 600; }
.bm span.t { position: absolute; top: 2px; left: 4px; color: rgb(0 0 0 / 0.55); }
.bm span.n { position: absolute; color: rgb(0 0 0 / 0.75); }
.bm .top { top: 2px; left: 50%; transform: translateX(-50%); }
.bm .bottom { bottom: 2px; left: 50%; transform: translateX(-50%); }
.bm .left { left: 4px; top: 50%; transform: translateY(-50%); }
.bm .right { right: 4px; top: 50%; transform: translateY(-50%); }
.toast {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); display: none; align-items: center; gap: 6px; padding: 7px 12px;
  border-radius: 999px; background: var(--fg); color: var(--bg); font-weight: 600; box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
}
.toast svg { width: 14px; height: 14px; }
@media (prefers-reduced-motion: no-preference) {
  .panel { transition: opacity .15s; }
  .tip { transition: opacity .1s; }
}
`
