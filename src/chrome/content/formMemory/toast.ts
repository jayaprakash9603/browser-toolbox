const TOAST_ID = 'tbx-form-memory-toast'
const TOAST_MS = 2600

const STYLE = `
  .t{display:flex;align-items:center;gap:10px;padding:10px 16px 10px 12px;border-radius:999px;
    font:500 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;color:#f8fafc;background:rgb(15 23 42/.94);
    box-shadow:0 10px 30px -8px rgb(0 0 0/.45);}
  .t.in{animation:in .22s cubic-bezier(.22,1,.36,1)}
  .b{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;
    background:#10b981;color:#fff;font-weight:700;font-size:12px}
  .s{color:#94a3b8;font-weight:400}
  @keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`

/** A short status pill at the bottom of this frame, isolated from the page's styles in a closed shadow root. */
export function toast(message: string, brand?: string): void {
  document.getElementById(TOAST_ID)?.remove()
  const host = document.createElement('div')
  host.id = TOAST_ID
  host.style.cssText = 'all:initial;position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;'
  const root = host.attachShadow({ mode: 'closed' })
  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  root.innerHTML = `<style>${STYLE}</style><div class="t${animate ? ' in' : ''}" role="status"><span class="b" aria-hidden="true">\u2713</span><span></span></div>`
  const label = root.querySelector('.t > span:last-child')
  if (label) {
    label.textContent = message
    if (brand) {
      const tag = document.createElement('span')
      tag.className = 's'
      tag.textContent = ` \u00b7 ${brand}`
      label.append(tag)
    }
  }
  document.documentElement.append(host)
  window.setTimeout(() => host.remove(), TOAST_MS)
}
