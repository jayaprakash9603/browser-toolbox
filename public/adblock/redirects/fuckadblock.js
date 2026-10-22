(function () {
  'use strict'
  var Detector = function () {}
  Detector.prototype.check = function () {
    return true
  }
  Detector.prototype.clearEvent = function () {}
  Detector.prototype.emitEvent = function () {
    return this
  }
  Detector.prototype.on = function (detected, fn) {
    if (!detected && typeof fn === 'function') {
      setTimeout(fn, 1)
    }
    return this
  }
  Detector.prototype.onDetected = function () {
    return this
  }
  Detector.prototype.onNotDetected = function (fn) {
    return this.on(false, fn)
  }
  Detector.prototype.setOption = function () {
    return this
  }
  var instance = new Detector()
  window.FuckAdBlock = window.BlockAdBlock = window.SniffAdBlock = Detector
  window.fuckAdBlock = window.blockAdBlock = window.sniffAdBlock = instance
})()
