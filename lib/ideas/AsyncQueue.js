module.exports = AsyncQueueFactory

const asyncSleep = delay => new Promise(resolve => setTimeout(() => resolve(true), delay))

const defaultConfig = {
  delay: 1000
}

function AsyncQueueFactory (config) {
  this.config = Object.assign({}, defaultConfig, config)
  this.queue = []

  return async function* AsyncQueue () {
    var task, response

    if (this.queue.length) {
      this.queue.push(task)

      // Return place in queue
      return this.queue.length
    }

    do {
      task = this.queue[0]
      response = await task.function(...task.args)
      yield response
    } while (
      task.assertContinue(response)
      && await asyncSleep(config.delay))
      && 
  }
}

async function* HttpRequestIterator (promise, delay) {
  var prevIndex = 0
  do {
    var response = await promise({ prevIndex, first: 100 })
    prevIndex = response.lastIndex
    yield response.data
  } while (response.lastIndex && await asyncSleep(delay))
}

function Task () {
  this.function = new Promise(resolve => setTimeout(() => resolve(), 2000))
  this.args = [1, 2, 3]
}

function HTTPRequestIterator () {
  this.assertContinue = result => result.code === 200
}
