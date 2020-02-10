module.exports = function delayedAsync (promiseCallback, delay) {
  return new Promise(executor)

  function executor (resolve, reject) {
    setTimeout(dispatch, delay)

    function dispatch () {
      promiseCallback().then(resolve, reject)
    }
  }
}
