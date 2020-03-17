const fs = require('fs')

const config = require('../config')
const log = require('./serverLog')

module.exports = {
  load,
  save,
  getDefaultState
}

// state.saved is for persistent data,
// everything else is limited to the lifetime of the executable
function getDefaultState () {
  return {
    appIsExiting: false,
    autoUpdater: null,
    discordClient: null,
    saved: {
      // EVERYTHING IN HERE MUST BE SERIALIZABLE, GOD DERMIT!
      // Complex objects like Map/Sets need to be coerced into object/arrays
      adminUserIds: [],
      autoUpdate: true,
      displayChannelName: 'twitch-streams',
      showAutoUpdate: true,
      showFilter: true,
      showGameName: true,
      showLastUpdated: true,
      showStreamDetails: true,
      streamDisplayMax: 5,
      streamTitlefilter: 'median ?(xl)?|mxl',
      twitchAccessToken: '',
      twitchGameName: 'Diablo II: Lord of Destruction',
      updateInterval: '10m'
    },
    twitchGame: null,
    twitchStreamCache: []
  }
}

async function load () {
  const state = getDefaultState()

  try {
    const fileContents = await fs.promises.readFile(config.SETTINGS_PATH, 'utf8')
    state.saved = Object.assign({}, state.saved, JSON.parse(fileContents))
  } catch (error) {
    log.error(error.code)
    log.info('Error loading config file: Using defaults')
  }

  return state
}

function save (state) {
  log.info(`Saving state to '${config.SETTINGS_PATH}'`)
  return fs.promises.writeFile(config.SETTINGS_PATH, JSON.stringify(state.saved), 'utf8')
}
