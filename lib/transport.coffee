events = require 'events'

class Transport extends events.EventEmitter
  constructor: ->
    Object.defineProperty @, 'connected', {
      get: -> @_connected
      set: (value) ->
        if @_connected isnt value
          @_connected = value
          @emit(if @_connected then 'connected' else 'disconnected')
    }
    @_connected = false
  
  on: (event, handler) ->
    if event is 'connected' and @connected
      process.nextTick => handler.call(@, 'connected')
    
    events.EventEmitter::on.call(@, event, handler)
  
  once: (event, handler, context) ->
    if event is 'connected' and @connected
      process.nextTick -> handler.call(context, 'connected')
    
    events.EventEmitter::once.call(@, event, handler)

module.exports = Transport
