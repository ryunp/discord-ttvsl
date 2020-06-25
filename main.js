/**
 * Author: Ryan Paul
 * Creation Date: 4/13/19
 * Description: Discord bot to pull, filter, and display TwitchTV streams
 *
 * Register Discord Bot: https://discordapp.com/oauth2/authorize?&client_id=<ID>&scope=bot
 */

const Discord = require('discord.js')
const process = require('process')

const auth = require('./auth')
const config = require('./config')

const delayedAsync = require('./lib/delayedAsync')
const discordText = require('./lib/discordText')
const DynamicInterval = require('./lib/DynamicInterval')
const milliseconds = require('./lib/milliseconds')
const serverLog = require('./lib/serverLog')
const State = require('./lib/state')
const TwitchApi = require('./lib/TwitchApi')

const msToTimeUnits = ms => milliseconds.toTimeUnits(ms, { units: ['d', 'h', 'm'] })
const msFromTimeUnits = args => milliseconds.fromTimeUnits(args)

var state
var twitchApi
var discordClient

process.once('exit', onAppExit)
process.once('SIGINT', onAppExit)

State.load().then(onStateLoad).catch(serverLog.error)

async function onStateLoad (loadedState) {
  state = loadedState

  const ms = msFromTimeUnits(state.saved.updateInterval)
  state.autoUpdater = new DynamicInterval(updateCacheAndRender, ms)

  // Init Twitch API
  const twitchCreds = {
    clientId: auth.twitchBotId,
    clientSecret: auth.twitchBotSecret,
    accessToken: state.saved.twitchAccessToken,
    tokenExpiresAt: state.saved.twitchTokenExpiresAt || Date.now()
  }
  const onTwitchTokenRefresh = ({ token, expiresAt }) => {
    state.saved.twitchAccessToken = token
    state.saved.twitchTokenExpiresAt = expiresAt
    serverLog.info('AccessToken Renewed:', token)
  }
  twitchApi = new TwitchApi(twitchCreds, onTwitchTokenRefresh)

  // Init Discord client
  discordClient = new Discord.Client()

  // Setup Discord event handlers
  discordClient
    .on('error', serverLog.error)
    .on('message', onDiscordMessage)
    .on('disconnect', onDiscordClientDisconnect)
    .on('ready', onDiscordReady)

  // Establish connection with Discord servers
  try {
    await discordClient.login(auth.discordBotToken)
    serverLog.info(`Logged in as ${discordClient.user.tag}!`)
  } catch (error) {
    serverLog.error(error)
    serverLog.info('Discord User Authentication failed, exiting...')
    process.emit('exit')
  }
}

// Discord bootup
async function onDiscordReady () {
  try {
    state.autoUpdater.start()
    await updateCacheAndRender()
  } catch (error) {
    serverLog.error(error)
    serverLog.info('Failed initial display procedure')
    process.emit('exit')
    throw error
  }
}

// Fetch new data and refresh display
async function updateCacheAndRender () {
  await getTwitchStreams()
  await updateDisplay()
}

const commands = {
  admins: async function adminUsersCmd (msg, args) {
    const subCmds = {
      add: addId,
      del: deleteId
    }

    if (!args.length) {
      const users = discordClient.users
      const adminTags = state.saved.adminUserIds.map(id => {
        if (users.get(id)) {
          return users.get(id).tag
        }
      })
      await msg.channel.send(`\`${adminTags.join(', ')}\``)
      return
    }

    // Check sub command argument
    if (!Object.prototype.hasOwnProperty.call(subCmds, args[0])) {
      await msg.channel.send('!admins [add|del] user_id')
      return
    }

    subCmds[args[0]](args[1])

    const admins = new Set(state.saved.adminUserIds)
    state.saved.adminUserIds = Array.from(admins)

    async function deleteId (delId) {
      const displayChannel = getDisplayChannel()

      if (delId.startsWith('<')) {
        delId = delId.match(/<@!(\d+)>/)[1]
      }

      const adminIds = state.saved.adminUserIds
      if (adminIds.includes(delId)) {
        const user = discordClient.users.get(delId)
        var resultMsg

        if (user) {
          resultMsg = discordText.codeInline(user.tag)
        } else {
          resultMsg = `${discordText.codeInline(delId)} (no longer in server)`
        }

        state.saved.adminUserIds = adminIds.filter(id => id !== delId)
        displayChannel.send(`Removed ${resultMsg}`)
      } else {
        displayChannel.send('Not in admin list')
      }
    }

    async function addId (addId) {
      const displayChannel = getDisplayChannel()
      const user = discordClient.users.get(addId)

      if (user) {
        state.saved.adminUserIds.push(addId)
        displayChannel.send(`Added admin: \`${user.tag}\``)
      } else {
        displayChannel.send('Not in admin list')
      }
    }
  },

  autoupdate: async function autoUpdateCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.autoUpdater.isActive()}\``)
      return
    }

    if (args[0] === 'false') {
      disable()
    } else if (args[0] === 'true') {
      enable()
    } else {
      await msg.channel.send('!autoUpdate [false|true]')
    }

    /* Helper Functions */
    async function enable () {
      if (state.autoUpdater.isActive()) { return }

      await getTwitchStreams()
      await updateDisplay()
      state.saved.autoUpdate = true
      state.autoUpdater.start()

      const ms = state.autoUpdater.getInterval()
      serverLog.info(`Updating stream list every ${msToTimeUnits(ms)}`)
    }

    async function disable () {
      if (!state.autoUpdater.isActive()) { return }

      await updateDisplay()
      state.saved.autoUpdate = false
      state.autoUpdater.stop()

      serverLog.info('No longer updating stream list')
    }
  },

  channel: async function channelCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`#${state.saved.displayChannelName}`)
      return
    }

    const searchChannel = args[0]
    var channel

    if (searchChannel.startsWith('<')) {
      // Channel mentions '#<channel-name>' are converted to channel ID
      channel = msg.guild.channels.get(searchChannel.match(/<#(\d+)>/)[1])
    } else {
      // Literal channel name
      channel = msg.guild.channels.find(chan => chan.name === searchChannel)
    }

    if (channel) {
      await msg.channel.send(`Set channel to \`#${channel.name}\``)
      state.saved.displayChannelName = channel.name
      await updateDisplay()
    } else {
      await msg.channel.send(`Cannot find channel \`#${searchChannel}\``)
    }
  },

  cmds: async function cmdsCmd (msg, args) {
    const cmdList = Object.keys(commands).map(str => `\`${str}\``).join(', ')
    await msg.channel.send(cmdList)
  },

  exit: async function exitCmd (msg, args) {
    process.emit('exit')
  },

  game: async function gameCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.twitchGame.name}\``)
      return
    }

    const prevGameName = state.saved.twitchGameName
    state.saved.twitchGameName = args.join(' ')

    try {
      await getTwitchStreams()
      state.saved.streamTitlefilter = '.'
      await updateDisplay()
      await await msg.channel.send(`Changed game to \`${state.twitchGame.name}\``)
    } catch (error) {
      state.saved.twitchGameName = prevGameName
      serverLog.error(error)
      await msg.channel.send(error.message)
      throw error
    }
  },

  interval: async function intervalCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.updateInterval}\``)
      return false
    }

    const ms = msFromTimeUnits(args.join(' '))

    if (ms instanceof Error) {
      const timeUnits = milliseconds.getTimeUnits()
      const timeUnitsStr = timeUnits.map(unit => `${unit}`).join('|')
      await msg.channel.send(`Usage: !interval (#[${timeUnitsStr}])+`)
      return ms
    }

    if (ms < config.MIN_UPDATE_INTERVAL) {
      return RangeError(`Must be at least ${msToTimeUnits(config.MIN_UPDATE_INTERVAL)}`)
    }

    state.autoUpdater.setInterval(ms)
    state.saved.updateInterval = msToTimeUnits(ms)
    await updateDisplay()
    await msg.channel.send(`Rate changed to \`${msToTimeUnits(ms)}\``)
  },

  listsize: async function listsizeCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.streamDisplayMax}\``)
      return
    }

    const integer = parseInt(args[0])

    // Error Check: Bad argument
    if (!Number.isInteger(integer)) {
      await msg.channel.send(`Usage: \`!listsize <0-${config.MAX_STREAM_LIST}>\``)
      return
    }

    // Error Check: Out of range
    if (integer < 0 || config.MAX_STREAM_LIST < integer) {
      await msg.channel.send(`Argument must be between \`0 - ${config.MAX_STREAM_LIST}\``)
      return
    }

    state.saved.streamDisplayMax = integer

    updateDisplay()
  },

  purge: async function clearCmd (msg, args) {
    await clearOtherChannelMessages()
  },

  showautoupdate: async function showAutoUpdateCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.showAutoUpdate}\``)
      return
    }

    if (args[0] === 'false') {
      state.saved.showAutoUpdate = false
    } else if (args[0] === 'true') {
      state.saved.showAutoUpdate = true
    } else {
      await msg.channel.send('!showautoupdate [false|true]')
    }

    await updateDisplay()
  },

  showfilter: async function showFilterCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.showFilter}\``)
      return
    }

    if (args[0] === 'false') {
      state.saved.showFilter = false
    } else if (args[0] === 'true') {
      state.saved.showFilter = true
    } else {
      await msg.channel.send('!showfilter [false|true]')
    }

    await updateDisplay()
  },

  showgame: async function showGameCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.showGameName}\``)
      return
    }

    if (args[0] === 'false') {
      state.saved.showGameName = false
    } else if (args[0] === 'true') {
      state.saved.showGameName = true
    } else {
      await msg.channel.send('!showgame [false|true]')
    }

    await updateDisplay()
  },

  showlastupdated: async function showLastUpdatedCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.showLastUpdated}\``)
      return
    }

    if (args[0] === 'false') {
      state.saved.showLastUpdated = false
    } else if (args[0] === 'true') {
      state.saved.showLastUpdated = true
    } else {
      await msg.channel.send('!showlastupdated [false|true]')
    }

    await updateDisplay()
  },

  showstreamdetails: async function showStreamDetailsCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.showStreamDetails}\``)
      return
    }

    if (args[0] === 'false') {
      state.saved.showStreamDetails = false
    } else if (args[0] === 'true') {
      state.saved.showStreamDetails = true
    } else {
      await msg.channel.send('!showStreamDetails [false|true]')
    }

    await updateDisplay()
  },

  titlefilter: async function titleFilterCmd (msg, args) {
    if (!args.length) {
      await msg.channel.send(`\`${state.saved.streamTitlefilter}\``)
      return
    }

    // Coerce multiple values into regex format
    const regExString = args.length > 1 ? `${args.join('|')}` : args[0]

    try {
      // Attempt RegExp conversion
      const regEx = new RegExp(regExString, 'gi')

      // Save as string so it can be JSON serialized
      state.saved.streamTitlefilter = regExString

      updateDisplay()

      await msg.channel.send(`Stream title filter set to: ${`\`${regEx}\``}`)
    } catch (error) {
      serverLog.error(error)
      serverLog.info(`Invalid RegExp string: '${regExString}'`)

      const text = [
        'Usage:',
        'Regular Expression: `!titlefilter <regex>`',
        "Match at least one input: `!titlefilter str 's t r' ...`"
      ].join('\n')
      await msg.channel.send(text)
    }
  },

  update: async function updateCmd (msg, args) {
    await getTwitchStreams()
    await updateDisplay()
    serverLog.info('Updated manually')
  }
}

/* Renderer Plumbing */

async function updateDisplay () {
  // Guild availability check
  const guild = discordClient.guilds.get(config.GUILD_ID)
  if (!guild.available) {
    serverLog.error('Guild not available')
    process.emit('exit')
    return Error('Guild not available')
  }

  // Ghetto permission checks
  const displayChannel = getDisplayChannel()
  const channelPermissions = displayChannel.permissionsFor(discordClient.user)
  if (!channelPermissions.has(config.REQ_CHANNEL_PERMS)) {
    serverLog.error(`Bot missing permissions: ${config.REQ_CHANNEL_PERMS.join(', ')}`)
    process.emit('exit')
    return
  }

  var message = await getDisplayMessage()

  if (!message) {
    try {
      message = await createNewDisplayMessage()
    } catch (error) {
      serverLog.error(error)
      serverLog.info('Issue creating new message')
      process.emit('exit')
    }
  }

  try {
    await message.edit(require('./views/minimal')(state))
  } catch (error) {
    serverLog.error(error)
    serverLog.info('Stopping auto-updater.')
    state.autoUpdater.stop()
    throw error
  }
}

async function createNewDisplayMessage () {
  const displayChannel = getDisplayChannel()
  try {
    const displayMessage = await displayChannel.send('Hello World')
    serverLog.info(`Created new display message in ${displayChannel.name}`)
    return displayMessage
  } catch (error) {
    // Not being able to create a message is app breaking (no DM support)
    serverLog.info(`Cannot create display message in channel ${displayChannel.name}`)
    process.emit('exit')
  }
}

async function getDisplayMessage () {
  const displayChannel = getDisplayChannel()
  const messages = await displayChannel.fetchMessages()
  const displayMessage = messages.filter(msg =>
    msg.author.id === discordClient.user.id).last()

  if (!displayMessage) {
    serverLog.error(`Cannot find previous display message in channel ${displayChannel.name}`)
  }

  return displayMessage
}

function getDisplayChannel () {
  const guild = discordClient.guilds.get(config.GUILD_ID)

  // Channel check
  const channel = guild.channels.find(chan =>
    chan.name === state.saved.displayChannelName)

  if (!channel) {
    serverLog.info(`Cannot find channel ${state.saved.displayChannelName} on server`)
    process.emit('exit')
  }

  return channel
}

async function clearOtherChannelMessages () {
  const displayChannel = getDisplayChannel()
  const displayMessage = await getDisplayMessage()

  const messages = await displayChannel.fetchMessages()
  if (displayMessage) messages.delete(displayMessage.id)

  try {
    await displayChannel.bulkDelete(messages, true)
  } catch (error) {
    serverLog.error(error)
    serverLog.info('BulkDelete failed, attempting invidual deletion...')

    try {
      var promise = Promise.resolve()
      messages.forEach(msg => { promise = promise.then(() => msg.delete()) })
    } catch (error) {
      serverLog.error(error)
      serverLog.info('Individual deletion failed')
      throw error
    }
  }
}

/* Caching */

async function getTwitchStreams () {
  await getTwitchGame()

  // Make a copy of current streamers
  const prevStreamers = state.twitchStreamCache.map(stream => ({ ...stream }))

  // Query Twitch for current streamers
  const params = { game_id: state.twitchGame.id }
  state.twitchStreamCache = await twitchApi.getStreams(params)
  serverLog.info(`${state.twitchStreamCache.length} '${state.twitchGame.name}' streams cached`)

  // Went Offine: Streams that were previously stored and no longer online
  const wentOffline = prevStreamers
    .filter(prevStream =>
      !state.twitchStreamCache.some(stream =>
        prevStream.user_id === stream.user_id
      )
    )

  // Filter MXL and add offline time
  const titleRegExp = new RegExp(state.saved.streamTitlefilter, 'gi')
  const ended_at = new Date().toISOString()
  const streamRecords = wentOffline
    .filter(stream => titleRegExp.test(stream.title))
    .map(stream => ({ ...stream, ended_at }))

  // Save MXL stream history, newest first
  state.streamHistory = [
    ...streamRecords,
    ...state.streamHistory
  ].slice(0, config.MAX_STREAM_LIST)
}

async function getTwitchGame (gameName = state.saved.twitchGameName) {
  if (state.twitchGame) {
    if (state.twitchGame.name.toLowerCase() === gameName.toLowerCase()) {
      serverLog.info('Using locally saved game data')
      return true
    }
  }

  const params = { name: gameName }
  try {
    const gameData = await twitchApi.getGame(params)
    state.twitchGame = gameData
    state.saved.twitchGameName = gameData.name
    serverLog.info(`Twitch game data cached for '${gameData.name}'`)
  } catch (error) {
    serverLog.error(`GameData Cache fail: ${error.message}`)
    throw error
  }
}

/* Discord event handlers */

async function onDiscordMessage (msg) {
  const stateAssertions = [
    msg.content.startsWith(config.CMD_PREFIX),
    msg.channel.name === state.saved.displayChannelName,
    !msg.author.bot
  ]
  if (!stateAssertions.every(Boolean)) {
    return
  }

  // App level user authentication
  if (msg.author.id !== config.OWNER_ID) {
    if (!state.saved.adminUserIds.includes(msg.author.id)) {
      return Error('Not Authorized to use commands')
    }
  }

  // Break up tokens into command/args
  const tokens = msg.content.slice(config.CMD_PREFIX.length)

  if (tokens.length) {
    const args = parseTokens(tokens)
    const cmd = args.shift()

    if (Object.prototype.hasOwnProperty.call(commands, cmd)) {
      try {
        await commands[cmd](msg, args)
        serverLog.info(`'${msg}' from ${msg.author.username} in ${msg.channel.name}`)
      } catch (error) {
        serverLog.error(error)
        serverLog.info(`Unhandled command error during '${cmd}'`)
        process.emit('exit')
      }
    } else {
      msg.reply(`'${cmd}' is not a recognized command. See \`${config.CMD_PREFIX}cmds\``)
    }
  }

  /* Helper Functions */
  function parseTokens (str) {
    // Process text between double quotes as a single string
    const tokens = str.match(/[^\s"]+|"([^"]+)"/gi) || []
    return tokens.map(str => stripSurroundingQuotes(str).toLowerCase())

    function stripSurroundingQuotes (str) {
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.substring(1, str.length - 1)
      }
      return str
    }
  }
}

async function onDiscordClientDisconnect (event) {
  serverLog.info('Discord client disconnected')

  if (!state.appIsExiting) {
    serverLog.error(event)
    serverLog.info('Attempting client re-connect')

    // Give it a reconnect attempt in a few seconds
    try {
      await delayedAsync(() => discordClient.connect(), 5000)
      serverLog.info('Re-connected')
    } catch (error) {
      serverLog.error(error)
      serverLog.info('Failed to re-connect')
      throw error
    }
  }
}

/* Nodejs event handlers */

async function onAppExit (code) {
  state.appIsExiting = true

  // Without removing the exit listener, a SIGINT would emit another exit
  // event from process.exit, and cause more async calls that don't finish.
  process.off('exit', onAppExit)

  const teardownProcedures = [
    new Promise(gracefulShutdown),
    new Promise(shortCircuit)
  ]

  serverLog.info(await Promise.race(teardownProcedures))
  process.exit(code)

  /* Helper Functions */
  async function gracefulShutdown (res) {
    state.autoUpdater.stop()
    await updateDisplay()
    await discordClient.destroy()
    await discordClientDisconnected()
    await State.save(state)

    res('Graceful Exit')
  }

  function discordClientDisconnected () {
    return new Promise(executor)

    function executor (res) {
      discordClient.once('disconnect', () => res())
    }
  }

  function shortCircuit (res, rej) {
    setTimeout(() => rej(Error('Forced Exit')), 4000)
  }
}
