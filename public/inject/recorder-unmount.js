/**
 * Removes recorder countdown + pill. Plain JS — executeScript `files` only.
 */
;(function () {
  document.getElementById('toolbox-recorder-countdown')?.remove()
  const w = window
  if (typeof w.__tbxRecorderPill === 'function') {
    w.__tbxRecorderPill(null)
    return
  }
  document.getElementById('toolbox-recorder-pill')?.remove()
  delete w.__tbxRecorderPill
})()
