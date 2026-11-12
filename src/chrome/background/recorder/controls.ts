/** Remove any legacy in-page recorder control left from older versions. */
export function unmountRecorderPill(): void {
  document.getElementById('toolbox-recorder-pill')?.remove()
  type PillWindow = Window & { __tbxRecorderPill?: unknown }
  delete (window as PillWindow).__tbxRecorderPill
}

/** Invisible extension frame whose getUserMedia call raises Chrome's own microphone prompt. */
export function mountMicPermissionFrame(src: string): void {
  document.getElementById('__tbx-recorder-mic-frame')?.remove()
  const frame = document.createElement('iframe')
  frame.id = '__tbx-recorder-mic-frame'
  frame.src = src
  frame.allow = 'microphone'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'all:initial;position:fixed;width:1px;height:1px;left:-10px;top:-10px;opacity:0;border:0;pointer-events:none'
  document.documentElement.appendChild(frame)
}

export function removeMicPermissionFrame(): void {
  document.getElementById('__tbx-recorder-mic-frame')?.remove()
}
