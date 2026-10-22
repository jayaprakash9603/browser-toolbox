(function () {
  'use strict'
  var noop = function () {}
  var name = window.GoogleAnalyticsObject || 'ga'
  var queue = window[name] && window[name].q
  var tracker = { get: noop, set: noop, send: noop }
  var ga = function () {
    var args = arguments
    var last = args[args.length - 1]
    if (typeof args[0] === 'function') {
      try {
        args[0](tracker)
      } catch (e) {}
      return
    }
    if (last && typeof last === 'object' && typeof last.hitCallback === 'function') {
      try {
        last.hitCallback()
      } catch (e) {}
    }
  }
  ga.create = function () {
    return tracker
  }
  ga.getByName = function () {
    return tracker
  }
  ga.getAll = function () {
    return [tracker]
  }
  ga.remove = noop
  ga.loaded = true
  window[name] = ga
  if (Array.isArray(queue)) for (var i = 0; i < queue.length; i++) ga.apply(null, queue[i])

  var dl = window.dataLayer
  if (dl && typeof dl.push === 'function') {
    var callbacks = function (item) {
      if (item && typeof item.eventCallback === 'function') {
        try {
          setTimeout(item.eventCallback, 1)
        } catch (e) {}
      }
    }
    for (var j = 0; j < dl.length; j++) callbacks(dl[j])
    dl.push = function (item) {
      callbacks(item)
      return Array.prototype.push.call(this, item)
    }
  }
  window.google_tag_manager = window.google_tag_manager || {}
})()
