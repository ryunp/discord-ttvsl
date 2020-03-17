const bent = require('bent')
const url = require('url')

const serverLog = require('./serverLog')

/**
 * @name TwitchAPI
 * @constructor
 */
function TwitchAPI (credentials, onAccessTokenRefresh) {
  this.credentials = credentials
  this.onAccessTokenRefresh = onAccessTokenRefresh
}

/**
 * @name refreshAccessToken
 * @function
 * @see {@link https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#oauth-client-credentials-flow|Twitch Docs}
 *
 * @return {Promise}
 * @description
 * 1) On your server, get an app access token by making this request:
 * POST https://id.twitch.tv/oauth2/token
 *     ?client_id=<your client ID>
 *     &client_secret=<your client secret>
 *     &grant_type=client_credentials
 *     &scope=<space-separated list of scopes>
 *
 * 2) We respond with a JSON-encoded app access token. The response looks like this:
 * {
 *   "access_token": "<user access token>",
 *   "refresh_token": "",
 *   "expires_in": <number of seconds until the token expires>,
 *   "scope": ["<your previously listed scope(s)>"],
 *   "token_type": "bearer"
 * }
 */
TwitchAPI.prototype.refreshAccessToken = function refreshAccessToken () {
  const resourceUrl = 'https://id.twitch.tv/oauth2/token'
  const header = {
    client_id: this.credentials.clientId,
    client_secret: this.credentials.clientSecret,
    grant_type: 'client_credentials'
  }

  return bent(resourceUrl, 'POST', 'json', header)().then(res => {
    this.credentials.clientToken = res.access_token
    this.onAccessTokenRefresh(res.access_token)
    return res.access_token
  })
}

/**
 * @name getGames
 * @function
 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-games|Twitch Docs}
 *
 * @return {Promise}
 */
TwitchAPI.prototype.getGame = function getGame (params) {
  const header = {
    'Client-Id': this.credentials.clientId,
    Authorization: this.credentials.accessToken,
    json: true
  }
  const resourceUrl = 'https://api.twitch.tv/helix/games'
  const urlParams = new url.URLSearchParams(params)
  const urlObj = new url(`${resourceUrl}?${urlParams}`)
  const request = bent(urlObj, 'GET', 'json', header)

  return request().then(response => response.data[0])
}

/**
 * @name getStreams
 * @function
 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-streams|Twitch Docs}
 *
 * @param {object} params Dictionary of uri query parameters
 * @return {Promise}
 */
TwitchAPI.prototype.getStreams = function getStreams (params) {
  params.first = 100 // Twitch hard limit
  const header = {
    'Client-Id': this.credentials.clientId,
    Authorization: this.credentials.accessToken,
    json: true
  }
  const resourceUrl = 'https://api.twitch.tv/helix/streams'
  const urlParams = new url.URLSearchParams(params)
  const urlObj = new url(`${resourceUrl}?${urlParams}`)
  const request = bent(urlObj, 'GET', 'json', header)

  return this.collectApiData(request).then(removeDuplicates)

  function removeDuplicates (streams) {
    const unique = new Map()
    streams.forEach(stream => unique.set(stream.user_id, stream))
    return Array.from(unique.values())
  }
}

TwitchAPI.prototype.collectApiData = async function collectApiData (bentRequest) {
  let response
  const data = []

  do {
    const pageId = getPagination(response)
    const request = pageId
      ? bentRequest.bind(null, `&after=${pageId}`)
      : bentRequest

    if (data.length) await resolveAfter(1000)

    try {
      response = await request()
    } catch (error) {
      serverLog.error('HTTP Request Error:', error.message)
      if (response.status === 401) {
        try {
          await this.refreshAccessToken()
          serverLog.info('AccessToken refreshed successfully')
          response = await request()
        } catch (error) {
          serverLog.error(error.message)
          throw error
        }
      } else {
        throw error
      }
    }

    data.push(...response.data)
  } while (getPagination(response))

  return data
}

function resolveAfter (delay) {
  return new Promise(resolve => setTimeout(() => resolve(), delay))
}

function getPagination (response) {
  return response && response.pagination && response.pagination.cursor
}

module.exports = TwitchAPI
