events = require 'events'

class ConnectionEmitter extends events.EventEmitter
  @is_connected: (emitter) ->
    emitter._emitter_state.connected is true
  
  constructor: ->
    super
    @_emitter_state = {
      emitted: {}
    }
  
  _handle_add_listener: (event, handler) ->
    if event is 'connected' and @_emitter_state.connected is true
      return process.nextTick => handler.apply(null, @_emitter_state.emitted['connected'])
    if event is 'disconnected' and @_emitter_state.connected is false
      return process.nextTick => handler.apply(null, @_emitter_state.emitted['disconnected'])
    false
  
  on: (event, handler) ->
    @_handle_add_listener(event, handler)
    events.EventEmitter::on.apply(@, arguments)
  
  addListener: (event, handler) ->
    @_handle_add_listener(event, handler)
    events.EventEmitter::addListener.apply(@, arguments)
  
  once: (event, handler) ->
    return if @_handle_add_listener(event, handler)
    events.EventEmitter::once.apply(@, arguments)
  
  emit: (event, args...) ->
    switch event
      when 'connected' then @_emitter_state.connected = true
      when 'disconnected' then @_emitter_state.connected = false
    
    @_emitter_state.emitted[event] = args
    events.EventEmitter::emit.apply(@, arguments)

module.exports = ConnectionEmitter
