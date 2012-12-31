ConnectionEmitter = require './connection_emitter'

class Transport extends ConnectionEmitter
  constructor: ->
    super
    Object.defineProperty @, 'connected', {
      get: -> ConnectionEmitter.is_connected(@)
    }

module.exports = Transport
