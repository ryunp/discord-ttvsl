const milliseconds = require('./milliseconds')

module.exports = DynamicInterval

function DynamicInterval (callback, intervalMs, range) {
  this.handle = null
  this.callback = callback
  this.intervalMs = intervalMs
  ;[this.minRange = 0, this.maxRange = Number.MAX_SAFE_INTEGER] = range || []
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
  }

  if (value instanceof Error) {
    return value
  }

  // if smaller than min or greater than max
  if (value < this.minRange || this.maxRange < value) {
    return RangeError(`Must be between ${this.minRange} and ${this.maxRange}`)
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

DynamicInterval.prototype.getMinInterval = function getMinInterval () {
  return this.minRange
}
