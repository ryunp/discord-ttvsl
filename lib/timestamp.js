const d3 = require('d3-time-format')

module.exports = function FormatTimestamp (str, time) {
  return `${str[0]}${getTimeFormat(time)}${str[1]}`
}

function getTimeFormat (time) {
  return d3.timeFormat('%x %H:%M:%S')(time)
}
