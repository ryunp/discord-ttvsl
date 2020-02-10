const d3 = require('d3-time-format')

const discordTextFormat = require('../lib/DiscordText')
const ms = require('../lib/Milliseconds')
const config = require('../config')

const msToTimeUnits = value => ms.toTimeUnits(value, { units: ['d', 'h', 'm'] })

module.exports = function MinimalView (state) {
  // Prepare content body stream list
  const titleRegExp = new RegExp(state.saved.streamTitlefilter, 'gi')
  const streamerList = state.twitchStreamCache
    .filter(streamData => titleRegExp.test(streamData.title))
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
  const gameNameStr = discordTextFormat.bold(state.saved.twitchGameName)

  // Prepare content header Stream Title Filter status
  const totalStreamCount = state.twitchStreamCache.length
  const filteredStreamCount = streamerList.length
  const displayCountStr = `${filteredStreamCount}/${totalStreamCount}`
  const titleFilterStr = [
    `Filter: ${discordTextFormat.codeInline(state.saved.streamTitlefilter)}`,
    discordTextFormat.italic(`(displaying ${displayCountStr})`)
  ].join(' ')

  // Prepare content header Last Updated status
  const lastUpdated = d3.timeFormat('%x %H:%M:%S (%Z)')(Date.now())
  const lastUpdatedStr = `Last Update: ${lastUpdated}`

  // Build header info
  const contentHeader = [
    state.saved.showAutoUpdate ? autoUpdaterStatusStr : null,
    state.saved.showGameName ? gameNameStr : null,
    state.saved.showFilter ? titleFilterStr : null,
    state.saved.showLastUpdated ? lastUpdatedStr : null
  ].filter(Boolean).join('\n')

  // Build content body streamer list
  const contentBody = streamerList.map(streamData =>
    buildStreamInfo(state, streamData)
  ).join('\n\n')

  // Return final composition
  return `${contentHeader}\n\n${contentBody}`
}

function buildStreamInfo (state, streamData) {
  // Prepare stream info URL
  const streamUrlStr = `https://twitch.tv/${streamData.user_name}`

  // Prepare stream info Stats (views, uptime)
  const upTimeStr = msToTimeUnits(Date.now() - new Date(streamData.started_at))
  const viewCountStr = streamData.viewer_count
  const streamStatsStr = `(${upTimeStr} uptime, ${viewCountStr} viewers)`

  // Prepare stream info Title
  const streamTitleStr = (streamData.title.length > config.MAX_TITLE_LEN)
    ? `${streamData.title.substring(0, config.MAX_TITLE_LEN).trim()}...`
    : streamData.title.trim()

  // Build stream details
  const streamDetailsStr = [
    discordTextFormat.urlNoPreview(streamUrlStr),
    state.saved.showStreamDetails ? streamStatsStr : null
  ].filter(Boolean).join(' ')

  // Build stream info
  const streamInfoStr = [
    streamDetailsStr,
    discordTextFormat.italic(streamTitleStr)
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
