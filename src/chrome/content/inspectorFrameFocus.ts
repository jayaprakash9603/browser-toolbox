type FrameBlurHandler = () => void

const blurHandlers = new Set<FrameBlurHandler>()

let lastPulseMs = 0

export function registerInspectorFrameBlur(handler: FrameBlurHandler): () => void {
  blurHandlers.add(handler)
  return () => blurHandlers.delete(handler)
}

function runBlurHandlers(): void {
  for (const handler of blurHandlers) handler()
}

export function pulseInspectorFrameFocus(): void {
  const now = performance.now()
  if (now - lastPulseMs < 36) return
  lastPulseMs = now
  void chrome.runtime.sendMessage({ type: 'INSPECTOR_POINTER_ACTIVE' }).catch(() => undefined)
}

export function handleInspectorFrameFocus(activeFrameId: number, thisFrameId: number): void {
  if (thisFrameId !== activeFrameId) runBlurHandlers()
}
