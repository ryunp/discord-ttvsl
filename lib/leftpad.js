/**
 * @param {string} str Value to pad
 * @param {Integer} width Desired width of output string
 * @param {String} fill String used to fill missing positions
 */
module.exports = function leftPad (str, width, fill) {
  str = String(str)
  return str.length < width ? `${fill.repeat(width - str.length)}${str}` : str
}
