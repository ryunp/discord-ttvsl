const timestamp = require('./timestamp')

module.exports = {
  error,
  info
}

function error (msg) {
  console.error(timestamp`[${Date.now()}]`, msg)
}

function info (msg) {
  console.log(timestamp`[${Date.now()}]`, msg)
}
