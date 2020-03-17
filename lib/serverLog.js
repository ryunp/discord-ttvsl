const timestamp = require('./timestamp')

module.exports = {
  error,
  info
}

function error (...args) {
  console.error(timestamp`[${Date.now()}]`, ...args)
}

function info (...args) {
  console.log(timestamp`[${Date.now()}]`, ...args)
}
