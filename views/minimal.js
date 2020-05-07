const d3 = require('d3-time-format')
const discordText = require('../lib/discordText.js')

const ms = require('../lib/milliseconds')
const config = require('../config')

const msToTimeUnits = value => ms.toTimeUnits(value, { units: ['d', 'h', 'm'] })

module.exports = function MinimalView (state) {
  // Prepare content body stream list
  const titleRegExp = new RegExp(state.saved.streamTitlefilter, 'gi')
  const streamList = state.twitchStreamCache
    .filter(stream => titleRegExp.test(stream.title))
    .sort(objPropSort('viewer_count'))
    .splice(0, state.saved.streamDisplayMax)

  // Prepare content header Auto Update status
  const intervalMs = state.autoUpdater.getInterval()
  const intervalStr = msToTimeUnits(intervalMs)
  const autoUpdaterStatusStr = [
    state.autoUpdater.isActive() ? '✓' : '✗',
    'AutoUpdate',
    state.autoUpdater.isActive() ? `(${intervalStr})` : null
  ].filter(Boolean).join(' ')

  // Prepare content header Game Name status
  const gameNameStr = discordText.bold(state.saved.twitchGameName)

  // Prepare content header Stream Title Filter status
  const totalStreamCount = state.twitchStreamCache.length
  const filteredStreamCount = streamList.length
  const displayCountStr = `${filteredStreamCount}/${totalStreamCount}`
  const titleFilterStr = [
    `Filter: ${discordText.codeInline(state.saved.streamTitlefilter)}`,
    discordText.italic(`(displaying ${displayCountStr})`)
  ].join(' ')

  // Prepare content header Last Updated status
  const curDate = new Date()
  const curTimeUTC = curDate.getTime() + curDate.getTimezoneOffset() * 60 * 1000
  const lastUpdated = d3.timeFormat('%-m/%-d/%y %H:%M UTC')(curTimeUTC)
  const lastUpdatedStr = `Last Update: ${lastUpdated}`

  // Build header info
  const contentHeader = [
    state.saved.showAutoUpdate ? autoUpdaterStatusStr : null,
    state.saved.showGameName ? gameNameStr : null,
    state.saved.showFilter ? titleFilterStr : null,
    state.saved.showLastUpdated ? lastUpdatedStr : null
  ].filter(Boolean).join('\n')

  // Build content body streamer list
  let contentBody
  if (streamList.length) {
    contentBody = streamList.map(stream =>
      buildActiveStreamInfo(stream, state.saved.showStreamDetails)
    ).join('\n\n')
  } else {
    contentBody = [
      'No online streams found. Past streams:',
      '',
      state.streamHistory.splice(0, state.saved.streamDisplayMax).map(stream =>
        buildOfflineStreamInfo(stream)
      ).join('\n\n')
    ].join('\n')
  }

  // Return final composition
  return `${contentHeader}\n\n${contentBody}`
}

function buildActiveStreamInfo (stream, SHOW_DETAILS) {
  // Prepare stream info URL
  const streamUrl = `https://twitch.tv/${stream.user_name}`

  // Prepare stream info Stats (views, uptime)
  const upTime = msToTimeUnits(Date.now() - new Date(stream.started_at))
  const streamStats = `(${upTime} uptime, ${stream.viewer_count} viewers)`

  // Prepare stream info Title
  const streamTitle = (stream.title.length > config.MAX_TITLE_LEN)
    ? `${stream.title.substring(0, config.MAX_TITLE_LEN).trim()}...`
    : stream.title.trim()

  // Build stream details
  const streamHeading = SHOW_DETAILS
    ? `${discordText.urlNoPreview(streamUrl)} ${streamStats}`
    : discordText.urlNoPreview(streamUrl)

  // Build stream info
  const streamInfoStr = [
    streamHeading,
    discordText.italic(streamTitle)
  ].join('\n')

  // Return final composition
  return streamInfoStr
}

function buildOfflineStreamInfo (stream) {
  // Prepare stream info URL (escape URL symbol to remove auto-linking)
  const streamUrl = `https\\://twitch.tv/${stream.user_name}`

  // Prepare stream info Stats (views, uptime)
  // const upTime = msToTimeUnits(Date.now() - new Date(stream.started_at))
  // let [endDate, endTime] = stream.ended_at.split('T')
  // endTime = endTime.split(':').slice(0, 2).join(':')
  // const endDateTime = `${endDate} at ${endTime} UTC`
  // const streamStats = `(ended ${upTime} stream on ${endDateTime})`

  // Prepare stream info Title
  const streamTitle = (stream.title.length > config.MAX_TITLE_LEN)
    ? `${stream.title.substring(0, config.MAX_TITLE_LEN).trim()}...`
    : stream.title.trim()

  // Build stream details
  // const streamHeading = `${streamUrl} ${streamStats}`

  // Build stream info
  const streamInfoStr = [
    streamUrl, //streamHeading
    discordText.italic(streamTitle)
  ].join('\n')

  // Return final composition
  return streamInfoStr
}

function objPropSort (prop) {
  return function comparator (a, b) {
    if (a[prop] > b[prop]) { return -1 }
    if (a[prop] === b[prop]) { return 0 }
    if (a[prop] < b[prop]) { return 1 }
  }
}
