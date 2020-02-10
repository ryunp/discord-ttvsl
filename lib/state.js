const fs = require('fs')

const timestamp = require('./timestamp')

const SAVEPATH = './settings.json'

module.exports = {
  load,
  save
}

const logErrorTs = msg => console.error(timestamp`[${Date.now()}]`, msg)
const logInfoTs = msg => console.log(timestamp`[${Date.now()}]`, msg)

//  state.saved is for persistent data,
//  everything else is limited to the lifetime of the executable
function getDefaultState () {
  return {
    appIsExiting: false,
    autoUpdater: null,
    discordClient: null,
    maxStreamListItems: 15,
    saved: {
      // EVERYTHING IN HERE MUST BE SERIALIZABLE, GOD DERMIT!
      // Complex objects like Map/Sets need to be coerced into object/arrays
      adminUserIds: [],
      autoUpdate: true,
      cmdPrefix: '!',
      displayChannelName: 'twitch-streams',
      showAutoUpdate: true,
      showFilter: true,
      showGameName: true,
      showLastUpdated: true,
      showStreamDetails: true,
      streamDisplayMax: 5,
      streamTitlefilter: '/median ?(xl)?|mxl/gi',
      twitchAccessToken: '',
      twitchGameName: 'Diablo II: Lord of Destruction',
      updateInterval: '30m',
      viewTemplate: 'minimal'
    },
    twitchGame: null,
    twitchStreamCache: []
  }
}

async function load () {
  const state = getDefaultState()

  try {
    const fileContents = await fs.promises.readFile(SAVEPATH, 'utf8')
    state.saved = Object.assign({}, state.saved, JSON.parse(fileContents))
  } catch (error) {
    logErrorTs(error.code)
    logInfoTs('Error loading config file: Using defaults')
  }

  return state
}

function save (state) {
  logInfoTs(`Saving state to '${SAVEPATH}'`)
  return fs.promises.writeFile(SAVEPATH, JSON.stringify(state.saved), 'utf8')
}
