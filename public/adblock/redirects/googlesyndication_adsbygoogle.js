(function () {
  'use strict'
  var noop = function () {}
  var queue = window.adsbygoogle
  var stub = { loaded: true, push: noop }
  if (Array.isArray(queue)) for (var i = 0; i < queue.length; i++) stub.push(queue[i])
  window.adsbygoogle = stub
  var mark = function () {
    var slots = document.querySelectorAll('ins.adsbygoogle')
    for (var j = 0; j < slots.length; j++) {
      slots[j].setAttribute('data-adsbygoogle-status', 'done')
      slots[j].setAttribute('data-ad-status', 'unfilled')
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark)
  else mark()
})()
