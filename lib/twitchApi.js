const request = require('request-promise-native')

const MAX_PAYLOAD_COUNT = 400 // Prevent API flooding
const MAX_QUERY_PER_REQUEST = 100 // 100 streams per request is API maximum
const MAX_REQUESTS_PER_SECOND = 0.5 // 2 second between requests (avoid error 429)

/**
 * @name TwitchAPI
 * @constructor
 */
const TwitchAPI = module.exports = function TwitchAPI (creds) {
  this.creds = creds
}

/**
 * @name getGames
 * @function
 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-games|Twitch Docs}
 *
 * @param {object} urlParams Dictionary of url parameters
 * @return {Promise}
 */
TwitchAPI.prototype.getGames = function getGames (urlParams) {
  const validParams = ['id', 'name']

  urlParams = filterValidParams(validParams, urlParams)

  return queryTwitchApi(this.creds, 'games', urlParams).then(extractGame)

  function extractGame (data) {
    return data[0]
  }
}

/**
 * @name getStreams
 * @function
 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-streams|Twitch Docs}
 *
 * @param {object} params Dictionary of url parameters
 * @return {Promise}
 */
TwitchAPI.prototype.getStreams = function getStreams (urlParams) {
  const validParams = [
    'after', 'before', 'community_id', 'first',
    'game_id', 'language', 'user_id', 'user_login'
  ]

  urlParams = filterValidParams(validParams, urlParams)
  urlParams.first = MAX_QUERY_PER_REQUEST

  return queryTwitchApi(this.creds, 'streams', urlParams).then(uniqueify)

  function uniqueify (streams) {
    const unique = new Map()
    streams.forEach(stream => unique.set(stream.user_id, stream))
    return Array.from(unique.values())
  }
}

/**
 * @name queryTwitchApi
 * @function
 *
 * @param {string} endpoint Name of the enpoint to query
 * @param {object} urlParams Dictionary of valid url parameters
 * @param {object} requestOpts Dictionary of request options
 */
async function queryTwitchApi (creds, endpoint, urlParams, requestOpts) {
  const defaultRequestOpts = {
    url: `https://api.twitch.tv/helix/${endpoint}`,
    qs: urlParams,
    headers: {
      'Client-Id': creds.clientId,
      Authorization: creds.accessToken
    },
    json: true
  }

  requestOpts = Object.assign(defaultRequestOpts, requestOpts)

  var data = []
  var response = null

  do {
    try {
      requestOpts.qs.after = getPagination(response) || ''
      response = await request(requestOpts)
      // console.log(`Request sent to endpoint: ${requestOpts.url} (page: ${getPagination(requestOpts.qs.after)})`)
      data.push(...response.data)
      await new Promise(resolve =>
        setTimeout(() => resolve(), 1000 / MAX_REQUESTS_PER_SECOND)
      )
    } catch (error) {
      console.error('HTTP Request Error:', error.message)
      throw error
    }
  } while ([
    response.data.length === MAX_QUERY_PER_REQUEST,
    data.length < MAX_PAYLOAD_COUNT
  ].every(Boolean))
  return data
}

function getPagination (response) {
  return response && response.pagination && response.pagination.cursor
}

function filterValidParams (whitelist, obj) {
  return whitelist.reduce(validProperty, {})

  function validProperty (newObj, prop) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      newObj[prop] = obj[prop]
    }
    return newObj
  }
}

/**
 * REQUEST:
 * POST https://id.twitch.tv/oauth2/token
 *     ?client_id=<your client ID>
 *     &client_secret=<your client secret>
 *     &grant_type=client_credentials
 *     &scope=<space-separated list of scopes></space-separated>
 *
 * RESPONSE:
 * {
 *   'access_token': '<user access token>',
 *   'refresh_token': '', (NOT USED IN APPS)
 *   'expires_in': <number of seconds until the token expires>,
 *   'scope': ['<your previously listed scope(s)>'], (NOT USED IN APPS)
 *   'token_type': 'bearer'
 * }
 * @param {String} id 'Client ID' of user making requests (app)
 * @param {Stromg} secret Secret Token
 *//*
async function getAccessToken (id, secret) {
const options = {
  method: 'POST',
  url: 'https://id.twitch.tv/oauth2/token',
  client_id: id,
  client_secret: secret,
  grant_type: 'client_credentials'
}

try {
  const response = await request(options)
  return response.access_token
} catch (error) {
  console.error(error)
  throw error
}
}
*/
