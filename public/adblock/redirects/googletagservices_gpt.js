(function () {
  'use strict'
  var noop = function () {}
  var self = function () {
    return this
  }
  var empty = function () {
    return []
  }
  var nul = function () {
    return null
  }
  function chain(obj, names) {
    for (var i = 0; i < names.length; i++) obj[names[i]] = self
    return obj
  }
  function slot(path, sizes, div) {
    var s = chain({}, [
      'addService',
      'clearCategoryExclusions',
      'clearTargeting',
      'defineSizeMapping',
      'set',
      'setCategoryExclusion',
      'setClickUrl',
      'setCollapseEmptyDiv',
      'setConfig',
      'setForceSafeFrame',
      'setSafeFrameConfig',
      'setTargeting',
      'updateTargetingFromMap',
    ])
    s.get = nul
    s.getAdUnitPath = function () {
      return path || ''
    }
    s.getAttributeKeys = empty
    s.getCategoryExclusions = empty
    s.getDomId = function () {
      return div || ''
    }
    s.getResponseInformation = nul
    s.getSlotElementId = s.getDomId
    s.getSlotId = function () {
      return { getId: s.getAdUnitPath, getDomId: s.getDomId }
    }
    s.getSizes = function () {
      return sizes || []
    }
    s.getTargeting = empty
    s.getTargetingKeys = empty
    return s
  }
  var service = chain({}, [
    'clear',
    'clearCategoryExclusions',
    'clearTagForChildDirectedTreatment',
    'clearTargeting',
    'collapseEmptyDivs',
    'disableInitialLoad',
    'enableAsyncRendering',
    'enableLazyLoad',
    'enableSingleRequest',
    'enableSyncRendering',
    'enableVideoAds',
    'refresh',
    'set',
    'setCategoryExclusion',
    'setCentering',
    'setCookieOptions',
    'setForceSafeFrame',
    'setLocation',
    'setPrivacySettings',
    'setPublisherProvidedId',
    'setRequestNonPersonalizedAds',
    'setSafeFrameConfig',
    'setTagForChildDirectedTreatment',
    'setTargeting',
    'setVideoContent',
    'updateCorrelator',
  ])
  service.addEventListener = self
  service.removeEventListener = self
  service.get = nul
  service.getAttributeKeys = empty
  service.getSlots = empty
  service.getTargeting = empty
  service.getTargetingKeys = empty
  service.isInitialLoadDisabled = function () {
    return false
  }
  var existing = window.googletag || {}
  var cmd = existing.cmd || []
  var tag = {
    apiReady: true,
    pubadsReady: true,
    cmd: {
      push: function (fn) {
        try {
          if (typeof fn === 'function') fn()
        } catch (e) {}
        return 1
      },
    },
    companionAds: function () {
      return service
    },
    content: function () {
      return service
    },
    defineOutOfPageSlot: function (path, div) {
      return slot(path, [], div)
    },
    defineSlot: slot,
    destroySlots: function () {
      return true
    },
    disablePublisherConsole: noop,
    display: noop,
    enableServices: noop,
    getVersion: function () {
      return ''
    },
    openConsole: noop,
    pubads: function () {
      return service
    },
    setAdIframeTitle: noop,
    setConfig: noop,
    sizeMapping: function () {
      var m = { addSize: self, build: nul }
      return m
    },
  }
  window.googletag = tag
  for (var i = 0; i < cmd.length; i++) tag.cmd.push(cmd[i])
})()
