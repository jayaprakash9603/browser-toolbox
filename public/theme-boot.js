(function () {
  var key = 'browser-toolbox:theme-boot'
  try {
    var raw = localStorage.getItem(key)
    if (!raw) return
    var data = JSON.parse(raw)
    var root = document.documentElement
    if (data.dark) root.classList.add('dark')
    if (data.palette) root.dataset.palette = data.palette
    if (data.density) root.dataset.density = data.density
  } catch (e) {
    /* ignore */
  }
})()
