const leftPad = require('./leftpad')

module.exports = {
  toTimeUnits,
  fromTimeUnits,
  getTimeUnits,
  isValidTimeUnit
}

const defaultOptions = {
  units: ['d', 'h', 'm', 's'],
  padZero: false,
  displayZeroUnits: false
}

const unitToMsMap = new Map([
  ['d', 86400000], // 1000 * 60 * 60 * 24 * 1ms
  ['h', 3600000], // 1000 * 60 * 60 * 1ms
  ['m', 60000], // 1000 * 60 * 1ms
  ['s', 1000], // 1000 * 1ms
  ['ms', 1] // 1 * 1ms
])

function isValidTimeUnit (str) {
  return unitToMsMap.has(str)
}

/**
 * @name getTimeUnits
 * @function
 *
 * @return {Array}
 */
function getTimeUnits () {
  return Array.from(unitToMsMap.keys())
}

/**
 * @name toTimeUnits
 * @function
 *
 * @param {Integer} ms Milliseconds to convert into string format
 * @param {Object} options Adjust displaying configuration
 *
 * @param options
 * @param {Array} units Unit types to display (d/h/m/s/ms)
 * @param {Boolean} padZero Toggle including '0' before single digits
 * @param {Boolean} displayZeroUnits Toggle display of empty unit types
 *
 * @example
 * toTimeUnits(23141141)
 * >'6h 25m 41s'
 *
 * @example
 * toTimeUnits(23141141, {units: ['h', 'm']})
 * >'6h 25m'
 *
 * @example
 * toTimeUnits(23141141, {units: ['h', 's']})
 * >'6h 1541s'
 *
 * @example
 * toTimeUnits(23141141, {units: ['h', 'm', 'ms'], padZero: true})
 * >'06h 25m 41141ms'
 *
 * @example
 * toTimeUnits(23141141, {units: ['d', 'h', 'm', 's'], displayZeroUnits: true})
 * >'0d 6h 25m 41s'
 *
 * @example
 * toTimeUnits(23141141, {units: ['d', 'h', 'm', 's'], displayZeroUnits: true, padZero: true})
 * >'00d 06h 25m 41s'
 */
function toTimeUnits (ms, options = defaultOptions) {
  if (!Number.isInteger(ms)) {
    return TypeError('Milliseconds must be an integer')
  }

  var displayTokens = []

  // If given unit list, merge over default options after validation
  options.units = options.units.filter(isValidTimeUnit)
  options = Object.assign(defaultOptions, options)

  // Factor total time remaining into whole units from high to low
  unitToMsMap.forEach((msInUnit, unitType) => {
    if (options.units.includes(unitType)) {
      // Determine whole divisible quantity for this unit
      let unitCount = Math.floor(ms / msInUnit)

      // Short circuit if not displaying places with no whole values
      if (!options.displayZeroUnits && unitCount < 1) return

      // Optional display formatting (what about 4-length: 0000ms)
      if (options.padZero) unitCount = leftPad(unitCount, 2, '0')

      // Add formatted current place value to string builder
      displayTokens.push(`${unitCount}${unitType}`)

      // Reduce total ms by current place's value
      ms -= unitCount * msInUnit
    }
  })

  // Build human readable string
  return displayTokens.join(' ')
}

/**
 * @name fromTimeUnits
 * @function
 *
 * @param {String} str String to convert into milliseconds
 *
 * Values in string must match definitions in unitToMsMap structure to be
 * converted into milliseconds
 *
 * @example fromTimeUnits('1d 3h 34m 10s 403ms')
 * >99250403
 */
function fromTimeUnits (str) {
  if (typeof str !== 'string' || !str.length) {
    return TypeError('Time Units must be a string')
  }

  const tokens = str.split(' ')
    .map(convertTokenToUnitData)
    .filter(unit => isValidTimeUnit(unit.type))

  if (!tokens.length) {
    const validKeys = Array.from(unitToMsMap.keys()).join(', ')
    return TypeError(`Time Units must include at least one of: [${validKeys}]`)
  }

  return tokens.reduce(convertToMs, 0)

  function convertTokenToUnitData (str) {
    const [, count, type] = str.match(/(\d+)(\w+)/)
    return { type, count }
  }

  function convertToMs (ms, unit) {
    return ms + unitToMsMap.get(unit.type) * unit.count
  }
}
