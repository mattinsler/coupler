EventEmitter = require('events').EventEmitter

class ConnectionEmitter extends EventEmitter
  @is_connected: (emitter) ->
    emitter._emitter_state?.connected is true
  
  @is_disconnected: (emitter) ->
    emitter._emitter_state?.connected is false
  
  @follow: (dest, src) ->
    Object.defineProperty src, '_emitter_state', {
      get: ->
        dest._emitter_state
      enumerable: true
    }
  
  @inject_into: (emitter) ->
    return emitter if emitter instanceof ConnectionEmitter
    
    c = emitter
    c = c.__proto__ while c.__proto__ isnt EventEmitter.prototype
    c.__proto__ = new ConnectionEmitter()
    
    emitter._emitter_state = {
      emitted: {}
    }
    
    emitter
  
  constructor: (opts = {}) ->
    super()
    
    @__options__ = {
      events: {
        connected: opts.connected or 'connected'
        disconnected: opts.disconnected or 'disconnected'
      }
    }
    
    @_emitter_state = {
      emitted: {}
    }
  
  _handle_add_listener: (event, handler) ->    
    if event is @__options__.events.connected and ConnectionEmitter.is_connected(@)
      return process.nextTick => handler(@_emitter_state.emitted[@__options__.events.connected]...)
    if event is @__options__.events.disconnected and ConnectionEmitter.is_disconnected(@)
      return process.nextTick => handler(@_emitter_state.emitted[@__options__.events.disconnected]...)
    false
  
  on: (event, handler) ->
    @_handle_add_listener(event, handler)
    EventEmitter::on.apply(@, arguments)
  
  addListener: (event, handler) ->
    @_handle_add_listener(event, handler)
    EventEmitter::addListener.apply(@, arguments)
  
  once: (event, handler) ->
    return if @_handle_add_listener(event, handler)
    EventEmitter::once.apply(@, arguments)
  
  emit: (event, args...) ->
    unless Object.getOwnPropertyDescriptor(@, '_emitter_state').get?
      switch event
        when @__options__.events.connected then @_emitter_state.connected = true
        when @__options__.events.disconnected then @_emitter_state.connected = false
    
      @_emitter_state.emitted[event] = args
    
    EventEmitter::emit.apply(@, arguments)

module.exports = ConnectionEmitter
