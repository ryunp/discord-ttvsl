/*
require('./lib/dispatch').setDispatch(dispatch)

dispatchHandlers = {
  "update": async () => {
    await getTwitchStreams(state.saved.twitchGameName);
    updateDisplay(state)
  },
  "localUpdate": () => true
}

function dispatch (action, ...args) {
  console.log('dispatch: %s %o', action, args) // Debugging

  const handler = dispatchHandlers[action]
  if (handler) {
    handler(...args)
  } else {
    console.error('Missing dispatch handler: ' + action)
  }
}
*/

module.exports = {
  dispatch,
  setDispatch
}

let _dispatch = function () {}

function setDispatch (dispatch) {
  _dispatch = dispatch
}

function dispatch (...args) {
  _dispatch(...args)
}
