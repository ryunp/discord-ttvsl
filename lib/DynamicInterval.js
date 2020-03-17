const milliseconds = require('./milliseconds')

module.exports = DynamicInterval

function DynamicInterval (callback, intervalMs) {
  this.handle = null
  this.callback = callback
  this.intervalMs = intervalMs
}

DynamicInterval.prototype.start = function start () {
  if (this.handle != null) { return }

  this.handle = setInterval(() => this.callback(), this.intervalMs)
}

DynamicInterval.prototype.stop = function stop () {
  if (this.handle == null) { return }

  clearTimeout(this.handle)
  this.handle = null
}

DynamicInterval.prototype.setInterval = function setInterval (value) {
  if (!Number.isInteger(value)) {
    value = milliseconds.fromTimeUnits(value)

    if (value instanceof Error) {
      return value
    }
  }

  this.intervalMs = value

  this.stop()
  this.start()

  return true
}

DynamicInterval.prototype.getInterval = function getInterval () {
  return this.intervalMs
}

DynamicInterval.prototype.isActive = function isActive () {
  return this.handle != null
}
