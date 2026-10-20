let launcherEl: HTMLButtonElement | null = null

export function mountLauncher(enabled: boolean): void {
  if (!enabled) {
    launcherEl?.remove()
    launcherEl = null
    return
  }
  const side = document.querySelector('#side') ?? document.querySelector('[data-testid="chat-list"]')?.parentElement
  if (!side || launcherEl) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'tbx-wa-launcher'
  btn.title = 'Browser Toolbox'
  btn.textContent = '⚡'
  btn.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'WA_OPEN_PANEL' })
  })
  side.prepend(btn)
  launcherEl = btn
}
