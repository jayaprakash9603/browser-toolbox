/** Injected into the page — opens FireShot-style capture menu in Shadow DOM. */
export function openScreenshotCaptureMenu(): void {
  const existing = document.getElementById('tbx-screenshot-menu-host')
  if (existing) {
    existing.remove()
    return
  }

  const host = document.createElement('div')
  host.id = 'tbx-screenshot-menu-host'
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647'
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
    .backdrop { position:fixed;inset:0;background:rgba(15,23,42,.35); }
    .panel {
      position:fixed;top:48px;right:24px;min-width:260px;
      background:#0f172a;color:#e2e8f0;border-radius:12px;
      box-shadow:0 20px 50px rgba(0,0,0,.45);font:500 13px/1.35 system-ui,sans-serif;
      overflow:hidden;border:1px solid #334155;
    }
    .title { padding:12px 14px;font-weight:600;border-bottom:1px solid #334155;color:#f8fafc; }
    button {
      display:block;width:100%;text-align:left;padding:10px 14px;border:0;background:transparent;
      color:inherit;cursor:pointer;font:inherit;
    }
    button:hover { background:#1e293b; }
    .sep { height:1px;background:#334155;margin:4px 0; }
  `

  const backdrop = document.createElement('div')
  backdrop.className = 'backdrop'
  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.innerHTML = `<div class="title">Capture</div>`

  const items: { label: string; mode: string }[] = [
    { label: 'Entire page', mode: 'entire' },
    { label: 'Visible part', mode: 'visible' },
    { label: 'Selection', mode: 'selection' },
    { label: 'Element / scrolling area', mode: 'element' },
    { label: 'All tabs', mode: 'all-tabs' },
    { label: 'List of URLs…', mode: 'batch-urls' },
    { label: 'History', mode: 'history' },
    { label: 'Options', mode: 'options' },
  ]

  const close = () => host.remove()

  const send = (mode: string) => {
    close()
    void chrome.runtime.sendMessage({ type: 'SCREENSHOT_START', mode })
  }

  for (const item of items) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = item.label
    btn.addEventListener('click', () => {
      if (item.mode === 'history' || item.mode === 'options') {
        close()
        void chrome.runtime.sendMessage({ type: 'SCREENSHOT_MENU_ACTION', action: item.mode })
        return
      }
      send(item.mode)
    })
    panel.append(btn)
  }

  backdrop.addEventListener('click', close)
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      window.removeEventListener('keydown', onKey, true)
    }
  }
  window.addEventListener('keydown', onKey, true)

  shadow.append(style, backdrop, panel)
  document.documentElement.append(host)
}
