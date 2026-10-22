(function () {
  'use strict'
  var noop = function () {}
  var tracker = new Proxy(
    {},
    {
      get: function (_, prop) {
        if (prop === '_getName') return function () { return '' }
        if (prop === '_getAccount') return function () { return '' }
        return noop
      },
    },
  )
  var gat = {
    _anonymizeIP: noop,
    _createTracker: function () {
      return tracker
    },
    _forceSSL: noop,
    _getPlugin: noop,
    _getTracker: function () {
      return tracker
    },
    _getTrackerByName: function () {
      return tracker
    },
    _getTrackers: function () {
      return [tracker]
    },
  }
  window._gat = gat
  var old = window._gaq
  var gaq = {
    push: function () {
      for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] === 'function') {
          try {
            arguments[i]()
          } catch (e) {}
        }
      }
      return 0
    },
  }
  window._gaq = gaq
  if (Array.isArray(old)) for (var j = 0; j < old.length; j++) gaq.push(old[j])
})()
