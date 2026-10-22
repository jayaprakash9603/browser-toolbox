(function () {
  'use strict'
  var noop = function () {}
  window.apstag = {
    _Q: [],
    debug: noop,
    deleteId: noop,
    fetchBids: function (config, callback) {
      if (typeof callback === 'function') {
        setTimeout(function () {
          try {
            callback([])
          } catch (e) {}
        }, 1)
      }
    },
    init: noop,
    punt: noop,
    renderImp: noop,
    renewId: noop,
    rpa: noop,
    setDisplayBids: noop,
    targetingKeys: function () {
      return []
    },
    thirdPartyData: {},
    updateId: noop,
    upa: noop,
  }
})()
