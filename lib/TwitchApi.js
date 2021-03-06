const bent = require('bent')
const { URL, URLSearchParams } = require('url')

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
  const params = {
    "client_id": this.credentials.clientId,
    "client_secret": this.credentials.clientSecret,
    "grant_type": 'client_credentials'
  }
  const urlParams = new URLSearchParams(params)
  const urlStr = new URL(`${resourceUrl}?${urlParams}`).toString()

  return bent(urlStr, 'POST', 'json')()
    .then(res => {
      // Set expiry an hour early
      const expiresAt = Date.now() + res.expires_in * 1000 - 3600000

      this.credentials.accessToken = res.access_token
      this.credentials.tokenExpiresAt = expiresAt

      this.onAccessTokenRefresh({ token: res.access_token, expiresAt })
      serverLog.info(`AccessToken refreshed, expires at ${new Date(expiresAt)}`)
    })
    .catch(async error => {
      const str = await getBentResponseBody(error)
      serverLog.error(str)
      throw error
    })
}

TwitchAPI.prototype.validateAccessToken = function validateAccessToken () {
  const urlStr = 'https://id.twitch.tv/oauth2/validate'
  const header = { Authorization: `OAuth ${this.credentials.accessToken}` }

  return bent(urlStr, 'GET', 'json', header)()
    .catch(async error => {
      // {"status":401,"message":"invalid access token"}
      const str = await getBentResponseBody(error)
      serverLog.error(str)
      throw error
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
  return this.collectApiData('games', params).then(data => data[0])
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
  return this.collectApiData('streams', params).then(removeDuplicates)

  function removeDuplicates (streams) {
    const unique = new Map()
    streams.forEach(stream => unique.set(stream.user_id, stream))
    return Array.from(unique.values())
  }
}

TwitchAPI.prototype.collectApiData = async function collectApiData (resource, params) {
  const executeRequest = queryString => {
    const url = `https://api.twitch.tv/helix/${resource}`
    const headers = {
      'Client-Id': this.credentials.clientId,
      Authorization: `Bearer ${this.credentials.accessToken}`
    }

    return bent('GET', 'json', headers, url)(queryString)
  }

  // Assert access token hasn't reached max age
  if (Date.now() >= this.credentials.tokenExpiresAt) {
    await this.refreshAccessToken()
  }

  // Twitch per request maximum resource payload size
  params.first = 100

  const responseData = []
  let response

  do {
    // Throttle
    if (responseData.length) {
      await resolveAfter(1000)
    }

    // Add pagination id if needed
    const pageId = getPagination(response)
    if (pageId) {
      params.after = pageId
    }

    // Compile search query based on response
    const queryStr = `?${new URLSearchParams(params)}`

    // Perform api data collection
    try {
      response = await executeRequest(queryStr)
    } catch (error) {
      serverLog.error('HTTP Request Error:', error.statusCode)
      if (error.statusCode === 401) {
        try {
          await this.refreshAccessToken()
          await resolveAfter(1000)
          response = await executeRequest(queryStr)
        } catch (error) {
          serverLog.info(await getBentResponseBody(error))
          throw error
        }
      } else {
        serverLog.info(await getBentResponseBody(error))
        throw error
      }
    }

    responseData.push(...response.data)
  } while (response.data.length >= params.first)

  return responseData
}


function getBentResponseBody (error) {
  return error.responseBody.then(buff => buff.toString('utf8'))
}

function resolveAfter (delay) {
  return new Promise(resolve => setTimeout(() => resolve(), delay))
}

function getPagination (response) {
  return response && response.pagination && response.pagination.cursor
}

module.exports = TwitchAPI
