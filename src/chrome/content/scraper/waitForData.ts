export function waitForDataQuiet(
  rowSelector: string,
  maxWaitMs: number,
  quietMs = 600,
): Promise<void> {
  return new Promise((resolve) => {
    let lastCount = -1
    let quietTimer: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      observer.disconnect()
      if (quietTimer) clearTimeout(quietTimer)
      if (timeoutTimer) clearTimeout(timeoutTimer)
      resolve()
    }

    const check = () => {
      let count = 0
      try {
        count = document.querySelectorAll(rowSelector).length
      } catch {
        count = 0
      }
      if (count !== lastCount) {
        lastCount = count
        if (quietTimer) clearTimeout(quietTimer)
        quietTimer = setTimeout(finish, quietMs)
      }
    }

    const observer = new MutationObserver(() => check())
    observer.observe(document.documentElement, { childList: true, subtree: true })
    check()

    const timeoutTimer = setTimeout(finish, maxWaitMs)
  })
}
